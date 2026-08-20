"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type PageProps = { params: Promise<{ id: string }> };

export default function PecaPage({ params }: PageProps) {
  const [piece, setPiece] = useState<string[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    params.then(({ id }) => fetch("/api/pecas").then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.erro ?? "Não foi possível carregar a peça.");
      const found = (data.dados ?? []).find((row: string[]) => row[0] === id);
      if (!found) throw new Error("Peça não encontrada.");
      setPiece(found);
    }).catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Erro ao carregar peça.")));
  }, [params]);

  if (error) return <main className="mx-auto max-w-3xl px-6 py-10 text-red-700">{error}</main>;
  if (!piece) return <main className="mx-auto max-w-3xl px-6 py-10">Carregando...</main>;

  const fields = [["ID", piece[0]], ["Data de chegada", piece[1]], ["Nome", piece[2]], ["Serial Number", piece[3]], ["Fabricante", piece[4]], ["Localidade", piece[5]], ["Terminal", piece[6]], ["Técnico Responsável", piece[7]], ["Part Number", piece[8]], ["Data de saída", piece[9]], ["Situação Atual", piece[10]], ["QC", piece[11]]];

  return <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900"><section className="mx-auto max-w-3xl"><Link className="text-sm font-semibold text-sky-700" href="/">← Voltar para peças</Link><h1 className="mt-4 text-3xl font-bold">Detalhes da peça</h1><div className="mt-8 grid gap-4 rounded-lg border border-slate-200 bg-white p-6 md:grid-cols-2">{fields.map(([label, value]) => <p key={label}><strong>{label}:</strong> {value || "Não informado"}</p>)}</div>{piece[12] && <img className="mt-6 max-h-80 rounded-lg object-contain" src={piece[12]} alt={`Imagem de ${piece[2]}`} />}</section></main>;
}
