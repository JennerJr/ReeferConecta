"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { canManagePieces } from "@/lib/authorization";

type PageProps = { params: Promise<{ id: string }> };

type RepairReport = {
  id: string;
  responsavelReparo: string;
  descricaoReparo: string;
  situacaoAtual: string;
  createdAt: string;
};

type Piece = {
  id: number | string;
  nome?: string;
  fabricante?: string;
  qc?: string;
  situacaoAtual?: string;
  reports?: RepairReport[];
};

export default function PieceReportsPage({ params }: PageProps) {
  const { id } = use(params);
  const [piece, setPiece] = useState<Piece | null>(null);
  const [role, setRole] = useState<string>();
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/session")
      .then((response) => response.json())
      .then((data) => setRole(data.user?.role))
      .catch(() => undefined);

    fetch("/api/pecas")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.erro ?? "Não foi possível carregar a peça.");
        const pieces: Piece[] = Array.isArray(data) ? data : (data.data ?? data.pecas ?? data.dados ?? []);
        const found = pieces.find((item) => String(item.id) === String(id));
        if (!found) throw new Error("Peça não encontrada.");
        setPiece(found);
      })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Erro ao carregar reports."));
  }, [id]);

  if (error) return <main className="mx-auto max-w-3xl px-4 py-8 text-red-700 sm:px-6 sm:py-10">{error}</main>;
  if (!piece) return <main className="mx-auto max-w-3xl px-4 py-8 text-white sm:px-6 sm:py-10">Carregando...</main>;

  return (
    <main className="min-h-screen px-4 py-8 text-slate-900 sm:px-6 sm:py-10">
      <section className="mx-auto max-w-3xl">
        <Link className="text-sm font-semibold text-sky-700" href="/pecas">← Voltar para peças</Link>
        <h1 className="mt-4 text-3xl font-bold text-white">Reports da peça</h1>
        <p className="mt-2 text-slate-300">{piece.nome || "Peça sem nome"} {piece.fabricante ? `· ${piece.fabricante}` : ""} · QC: {piece.qc || "Não informado"}</p>

        <nav className="mt-6 flex gap-2 border-b border-slate-600 pb-2" aria-label="Navegação da peça">
          <Link className="rounded-lg bg-slate-600 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-500" href={`/pecas/${id}`}>Dados da peça</Link>
          <Link className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white" href={`/pecas/${id}/reports`}>Reports ({piece.reports?.length ?? 0})</Link>
        </nav>

        <section className="mt-8 rounded-lg border border-slate-200 bg-white p-4 sm:p-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-semibold">Histórico de reports</h2>
              <p className="mt-1 text-sm text-slate-500">Situação atual: {piece.situacaoAtual || "Não informada"}</p>
            </div>
            {canManagePieces(role) && <Link className="rounded-lg bg-red-700 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-red-800" href="/reports/novo">Novo report</Link>}
          </div>
          {!piece.reports?.length ? <p className="mt-6 text-slate-600">Nenhum report registrado.</p> : (
            <div className="mt-6 grid gap-4">
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
