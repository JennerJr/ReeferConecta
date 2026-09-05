"use client";

import Link from "next/link";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { canManagePieces } from "@/lib/authorization";

type PageProps = { params: Promise<{ id: string }> };

type Piece = {
  id: number | string;
  nome?: string;
  serialNumber?: string;
  fabricante?: string;
  localidade?: string;
  tecnicoResponsavel?: string;
  dataChegada?: string;
  situacaoAtual?: string;
  qc?: string;
  imagemUrl?: string;
  dataSaida?: string;
  createdAt?: string;
  reports?: RepairReport[];
};

type RepairReport = {
  id: string;
  responsavelReparo: string;
  descricaoReparo: string;
  situacaoAtual: string;
  createdAt: string;
};

function formatArrivalDate(value?: string) {
  if (!value) return undefined;
  const [date] = value.split("T");
  const [year, month, day] = date.split("-");
  return `${year}/${month}/${day}`;
}

export default function PecaPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [piece, setPiece] = useState<Piece | null>(null);
  const [error, setError] = useState("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [role, setRole] = useState<string>();

  useEffect(() => {
    fetch("/api/auth/session")
      .then((response) => response.json())
      .then((data) => setRole(data.user?.role))
      .catch(() => undefined);

    fetch("/api/pecas")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.erro ?? "Não foi possível carregar a peça.");
        const list: Piece[] = Array.isArray(data) ? data : (data.data ?? data.pecas ?? data.dados ?? []);
        const found = list.find((p) => String(p.id) === String(id));
        if (!found) throw new Error("Peça não encontrada.");
        setPiece(found);
      })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Erro ao carregar peça."));
  }, [id]);

  if (error) return <main className="mx-auto max-w-3xl px-4 py-8 text-red-700 sm:px-6 sm:py-10">{error}</main>;
  if (!piece) return <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">Carregando...</main>;

  const fields: [string, string|undefined|number][] = [
    ["ID", piece.id],
    ["Data de chegada", formatArrivalDate(piece.dataChegada)],
    ["Nome", piece.nome],
    ["Serial Number", piece.serialNumber],
    ["Fabricante", piece.fabricante],
    ["Localidade", piece.localidade],
    ["Técnico Responsável", piece.tecnicoResponsavel],
    ["Data de saída", piece.dataSaida],
    ["Situação Atual", piece.situacaoAtual],
    ["QC", piece.qc],
  ];

  return (
    <main className="min-h-screen px-4 py-8 text-slate-900 sm:px-6 sm:py-10">
      <section className="mx-auto max-w-3xl">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <Link className="text-sm font-semibold text-sky-700" href="/pecas">← Voltar para peças</Link>
          {canManagePieces(role) && (
            <button
              onClick={() => router.push(`/pecas/${id}/editar`)}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-blue-700 sm:w-auto"
            >
              Editar peça
            </button>
          )}
        </div>
        
        <h1 className="mt-4 text-3xl text-white font-bold">Detalhes da peça</h1>

        <nav className="mt-6 flex gap-2 border-b border-slate-600 pb-2" aria-label="Navegação da peça">
          <Link className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white" href={`/pecas/${id}`}>Dados da peça</Link>
          <Link className="rounded-lg bg-slate-600 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-500" href={`/pecas/${id}#reports`}>Reports ({piece.reports?.length ?? 0})</Link>
        </nav>
        
        <div className="mt-8 grid gap-4 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-2 sm:p-6">
          {fields.map(([label, value]) => (
            <p key={label}><strong>{label}:</strong> {value ?? "Não informado"}</p>
          ))}
        </div>
        
        {imageUrl && (
          <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="mb-4 font-semibold">Imagem da peça</h2>
            <img 
              className="max-h-96 rounded-lg object-contain w-full" 
              src={imageUrl} 
              alt={`Imagem de ${piece.nome}`}
              onError={() => setImageUrl("")}
            />
          </div>
        )}

        <section id="reports" className="mt-6 rounded-lg border border-slate-200 bg-white p-4 sm:p-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <h2 className="text-xl font-semibold">Reports de reparo</h2>
            {canManagePieces(role) && <Link className="rounded-lg bg-red-700 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-red-800" href="/reports/novo">Novo report</Link>}
          </div>
          {!piece.reports?.length ? <p className="mt-4 text-slate-600">Nenhum report registrado.</p> : (
            <div className="mt-4 grid gap-4">
              {piece.reports.map((report) => <article className="rounded-lg border border-slate-200 p-4" key={report.id}>
                <p><strong>Responsável:</strong> {report.responsavelReparo}</p>
                <p><strong>Situação:</strong> {report.situacaoAtual}</p>
                <p className="mt-2 whitespace-pre-wrap"><strong>Descrição:</strong> {report.descricaoReparo}</p>
                <p className="mt-2 text-sm text-slate-500">{new Date(report.createdAt).toLocaleString("pt-BR")}</p>
              </article>)}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}