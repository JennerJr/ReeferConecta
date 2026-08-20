"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type PieceRow = string[];

export default function Home() {
  const [pieces, setPieces] = useState<PieceRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/pecas")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.erro ?? "Não foi possível carregar as peças.");
        setPieces(data.dados ?? []);
      })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Erro ao carregar peças."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <section className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between gap-4">
          <div><p className="text-sm font-semibold uppercase tracking-widest text-sky-700">ReeferConecta</p><h1 className="mt-2 text-3xl font-bold">Peças cadastradas</h1></div>
          <Link className="rounded-lg bg-sky-700 px-4 py-2 font-semibold text-white hover:bg-sky-800" href="/pecas/novo">Nova peça</Link>
        </header>
        {loading && <p className="mt-8">Carregando peças...</p>}
        {error && <p className="mt-8 rounded-lg bg-red-50 p-4 text-red-700">{error}</p>}
        {!loading && !error && pieces.length === 0 && <p className="mt-8">Nenhuma peça cadastrada.</p>}
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {pieces.map((piece) => <Link className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:border-sky-500" href={`/pecas/${encodeURIComponent(piece[0] ?? "")}`} key={piece[0]}>
            <h2 className="font-bold">{piece[2] || "Peça sem nome"}</h2>
            <p className="mt-2 text-sm text-slate-600">Serial: {piece[3] || "Não informado"}</p>
            <p className="text-sm text-slate-600">Fabricante: {piece[4] || "Não informado"}</p>
            <p className="text-sm text-slate-600">Part Number: {piece[8] || "Não informado"}</p>
            <p className="mt-2 text-xs text-slate-500">QC: {piece[11] || "Não informado"}</p>
          </Link>)}
        </div>
      </section>
    </main>
  );
}
