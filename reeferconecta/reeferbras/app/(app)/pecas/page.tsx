"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { canManagePieces } from "@/lib/authorization";

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
  return `${year}/${month}/${day}`;
}

export default function Home() {
  const pageSize = 10;
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string>();
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
          <input
            className="mt-8 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
            type="search"
            placeholder="Pesquisar por nome, serial, fabricante, localidade, status ou QC..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setCurrentPage(1);
            }}
            aria-label="Pesquisar peças"
          />
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
    </main>
  );
}
