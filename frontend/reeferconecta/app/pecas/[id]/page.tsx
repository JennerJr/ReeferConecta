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
  terminal?: string;
  tecnicoResponsavel?: string;
  partNumber?: string;
  dataChegada?: string;
  situacaoAtual?: string;
  qc?: string;
  imagemUrl?: string;
  dataSaida?: string;
  createdAt?: string;
};

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
        
        if (found.partNumber) {
          fetch("/api/partnumber?partNumber=" + encodeURIComponent(found.partNumber))
            .then(res => res.json())
            .then(data => {
              if (data.imagem) setImageUrl(data.imagem);
              else if (found.imagemUrl) setImageUrl(found.imagemUrl);
            })
            .catch(() => {
              if (found.imagemUrl) setImageUrl(found.imagemUrl);
            });
        } else if (found.imagemUrl) {
          setImageUrl(found.imagemUrl);
        }
      })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Erro ao carregar peça."));
  }, [id]);

  if (error) return <main className="mx-auto max-w-3xl px-6 py-10 text-red-700">{error}</main>;
  if (!piece) return <main className="mx-auto max-w-3xl px-6 py-10">Carregando...</main>;

  const fields: [string, string|undefined|number][] = [
    ["ID", piece.id],
    ["Data de chegada", piece.dataChegada],
    ["Nome", piece.nome],
    ["Serial Number", piece.serialNumber],
    ["Fabricante", piece.fabricante],
    ["Localidade", piece.localidade],
    ["Terminal", piece.terminal],
    ["Técnico Responsável", piece.tecnicoResponsavel],
    ["Part Number", piece.partNumber],
    ["Data de saída", piece.dataSaida],
    ["Situação Atual", piece.situacaoAtual],
    ["QC", piece.qc],
  ];

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <section className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <Link className="text-sm font-semibold text-sky-700" href="/">← Voltar para peças</Link>
          <button
            onClick={() => router.push(`/pecas/${id}/editar`)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
             Editar peça
          </button>
        </div>
        
        <h1 className="mt-4 text-3xl font-bold">Detalhes da peça</h1>
        
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