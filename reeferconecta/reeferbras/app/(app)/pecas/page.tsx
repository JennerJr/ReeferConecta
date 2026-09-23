"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { canManagePieces } from "@/lib/authorization";

type BarcodeDetectorResult = { rawValue: string };
type BarcodeDetectorInstance = { detect(source: HTMLVideoElement): Promise<BarcodeDetectorResult[]> };
type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BarcodeDetectorInstance;

type Piece = {
  id: number | string;
  nome?: string;
  serialNumber?: string;
  fabricante?: string;
  localidade?: string;
  tecnicoResponsavel?: string;
  partNumber?: string;
  dataChegada?: string;
  situacaoAtual?: string;
  qc?: string;
  imagemUrl?: string;
  dataSaida?: string;
  createdAt?: string;
};

function formatArrivalDate(value?: string) {
  if (!value) return "não informada";
  const [date] = value.split("T");
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

export default function Home() {
  const pageSize = 10;
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string>();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const normalizedSearch = search.trim().toLowerCase();
  const filteredPieces = pieces
    .filter((piece) =>
      Object.values(piece).some((value) =>
        String(value ?? "").toLowerCase().includes(normalizedSearch),
      ),
    )
    .sort((first, second) => {
      const firstDate = new Date(first.createdAt ?? first.dataChegada ?? 0).getTime();
      const secondDate = new Date(second.createdAt ?? second.dataChegada ?? 0).getTime();
      return secondDate - firstDate;
    });
  const totalPages = Math.ceil(filteredPieces.length / pageSize);
  const visiblePieces = filteredPieces.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    if (!scannerOpen) return;

    const videoElement = videoRef.current;
    const detectorConstructor = (window as Window & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
    let active = true;
    let animationFrame = 0;
    let stream: MediaStream | undefined;

    async function startScanner() {
      if (!detectorConstructor) {
        setScannerError("A leitura pela câmera não é compatível com este navegador. Use um leitor conectado ou digite o QC.");
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia || !videoElement) {
        setScannerError("A câmera não está disponível neste dispositivo ou contexto.");
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        videoElement.srcObject = stream;
        await videoElement.play();
        const detector = new detectorConstructor({
          formats: ["qr_code", "code_128", "code_39", "code_93", "codabar", "ean_13", "ean_8", "itf", "upc_a", "upc_e"],
        });

        const scan = async () => {
          if (!active) return;
          try {
            const detected = await detector.detect(videoElement);
            const value = detected.find((item) => item.rawValue.trim())?.rawValue.trim();
            if (value) {
              setSearch(value);
              setCurrentPage(1);
              setScannerOpen(false);
              return;
            }
          } catch {
            // A frame can fail while the camera is focusing; keep scanning.
          }
          if (active) animationFrame = requestAnimationFrame(() => { void scan(); });
        };
        animationFrame = requestAnimationFrame(() => { void scan(); });
      } catch (requestError) {
        if (active) {
          setScannerError(requestError instanceof DOMException && requestError.name === "NotAllowedError"
            ? "Permita o acesso à câmera para ler o código."
            : "Não foi possível iniciar a câmera.");
        }
      }
    }

    void startScanner();
    return () => {
      active = false;
      cancelAnimationFrame(animationFrame);
      stream?.getTracks().forEach((track) => track.stop());
      if (videoElement) videoElement.srcObject = null;
    };
  }, [scannerOpen]);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((response) => response.json())
      .then((data) => setRole(data.user?.role))
      .catch(() => undefined);

    fetch("/api/pecas")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.erro ?? "Não foi possível carregar as peças.");
        // O endpoint pode retornar diretamente um array ou um objeto com campos diversos; normalizar para array de objetos
        const normalized: Piece[] = Array.isArray(data) ? data : (data.data ?? data.pecas ?? data.dados ?? []);
        setPieces(normalized as Piece[]);
      })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Erro ao carregar peças."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen px-4 py-8 text-slate-900 sm:px-6 sm:py-10">
      <section className="mx-auto max-w-6xl">
        <header className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div><p className="bg-gradient-to-br from-[#E8262C] to-[#B32025] bg-clip-text text-transparent text-sm font-bold uppercase tracking-widest">ReeferConecta</p>
          <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Peças cadastradas</h1></div>
          {canManagePieces(role) && (
            <Link className="w-full rounded-lg bg-sky-700 px-4 py-3 text-center font-semibold text-white hover:bg-sky-800 sm:w-auto" href="/pecas/novo">Nova peça</Link>
          )}
        </header>
        {loading && <p className="mt-8">Carregando peças...</p>}
        {error && <p className="mt-8 rounded-lg bg-red-50 p-4 text-red-700">{error}</p>}
        {!loading && !error && pieces.length === 0 && <p className="mt-8">Nenhuma peça cadastrada.</p>}
        {!loading && !error && pieces.length > 0 && (
          <div className="mt-8 flex w-full flex-col gap-2 sm:flex-row">
            <input
              className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
              type="search"
              placeholder="Pesquisar por nome, serial, fabricante, localidade, status ou QC..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setCurrentPage(1);
              }}
              aria-label="Pesquisar peças"
            />
            <button className="shrink-0 rounded-lg bg-sky-700 px-4 py-3 font-semibold text-white hover:bg-sky-800" type="button" onClick={() => { setScannerError(""); setScannerOpen(true); }}>
              Ler código
            </button>
          </div>
        )}
        {!loading && !error && pieces.length > 0 && filteredPieces.length === 0 && (
          <p className="mt-8 text-white">Nenhuma peça encontrada para essa pesquisa.</p>
        )}
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {visiblePieces.map((piece) => (
            <Link
              className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-sky-500 sm:p-5"
              href={`/pecas/${encodeURIComponent(String(piece.id ?? ''))}`}
              key={String(piece.id)}
            >
              <h2 className="break-words font-bold">{piece.nome || "Peça sem nome"}, {piece.fabricante || "sem fabricante informado"}, {formatArrivalDate(piece.dataChegada)}</h2>
              <p className="mt-2 text-sm text-slate-600">Serial: {piece.serialNumber || "Não informado"},QC: {piece.qc || "Não informado"}</p>
              <p className="text-sm text-slate-600">Localidade: {piece.localidade || "Não informado"}</p>
              <p className="text-sm text-slate-600">Status: {piece.situacaoAtual || "Não informado"}</p>
            </Link>
          ))}
        </div>
        {totalPages > 1 && (
          <nav className="mt-8 flex flex-wrap items-center justify-center gap-3" aria-label="Paginação das peças">
            <button
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((page) => page - 1)}
            >
              Anterior
            </button>
            <span className="text-sm text-slate-300">
              Página {currentPage} de {totalPages}
            </span>
            <button
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((page) => page + 1)}
            >
              Próxima
            </button>
          </nav>
        )}
      </section>
      {scannerOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="almox-scanner-title">
        <div className="w-full max-w-lg rounded-xl border border-slate-600 bg-gray-800 p-5 shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white" id="almox-scanner-title">Ler código da peça</h2>
              <p className="mt-1 text-sm text-slate-300">Aponte a câmera para o código de barras ou QR code.</p>
            </div>
            <button className="text-2xl leading-none text-slate-300 hover:text-white" type="button" onClick={() => setScannerOpen(false)} aria-label="Fechar leitor">×</button>
          </div>
          <video className="mt-4 aspect-video w-full rounded-lg bg-black object-cover" ref={videoRef} autoPlay muted playsInline />
          {scannerError && <p className="mt-3 rounded-lg bg-red-100 p-3 text-sm text-red-700">{scannerError}</p>}
          <button className="mt-4 w-full rounded-lg border border-slate-500 px-4 py-2 font-semibold text-white hover:bg-slate-700" type="button" onClick={() => setScannerOpen(false)}>
            Fechar
          </button>
        </div>
      </div>}
    </main>
  );
}
