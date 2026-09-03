"use client";

import Link from "next/link";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";

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

  useEffect(() => {
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

  if (error) return <main className="mx-auto max-w-3xl px-6 py-10 text-red-700">{error}</main>;
  if (!piece) return <main className="mx-auto max-w-3xl px-6 py-10">Carregando...</main>;

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
    <main className="min-h-screen  px-6 py-10 text-slate-900">
      <section className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <Link className="text-sm font-semibold text-sky-700" href="/pecas">← Voltar para peças</Link>
          <button
            onClick={() => router.push(`/pecas/${id}/editar`)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
             Editar peça
          </button>
        </div>
        
        <h1 className="mt-4 text-3xl text-white font-bold">Detalhes da peça</h1>
        
        <div className="mt-8 grid gap-4 rounded-lg border border-slate-200 bg-white p-6 md:grid-cols-2">
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
      </section>
    </main>
  );
}