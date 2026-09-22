"use client";

import Link from "next/link";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { canManagePieces } from "@/lib/authorization";
import { printPieceLabels } from "@/lib/labels";

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
  history?: PieceHistory[];
};

type RepairReport = {
  id: string;
  responsavelReparo: string;
  descricaoReparo: string;
  situacaoAtual: string;
  createdAt: string;
};

type PieceHistory = {
  id: string;
  action: "created" | "updated" | "report";
  details: string;
  userName: string;
  createdAt: string;
};

function formatArrivalDate(value?: string) {
  if (!value) return undefined;
  const [date] = value.split("T");
  const [day, month, year] = date.split("-");
  return `${day}/${month}/${year}`;
}

export default function PecaPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [piece, setPiece] = useState<Piece | null>(null);
  const [error, setError] = useState("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [role, setRole] = useState<string>();
  const [printingLabel, setPrintingLabel] = useState(false);
  const [printError, setPrintError] = useState("");

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

  async function handleReprintLabel() {
    if (!piece?.qc) {
      setPrintError("Esta peça não possui um QC para gerar etiqueta.");
      return;
    }
    setPrintingLabel(true);
    setPrintError("");
    try {
      await printPieceLabels([piece.qc]);
    } catch (labelError) {
      setPrintError(labelError instanceof Error ? labelError.message : "Não foi possível gerar a etiqueta.");
    } finally {
      setPrintingLabel(false);
    }
  }

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
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <button
              onClick={handleReprintLabel}
              disabled={printingLabel}
              className="w-full rounded-lg bg-emerald-700 px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-50 sm:w-auto"
            >
              {printingLabel ? "Gerando etiqueta..." : "Reimprimir etiqueta"}
            </button>
            {canManagePieces(role) && (
              <button
                onClick={() => router.push(`/pecas/${id}/editar`)}
                className="w-full rounded-lg bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-blue-700 sm:w-auto"
              >
                Editar peça
              </button>
            )}
          </div>
        </div>
        {printError && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-amber-800">{printError}</p>}
        
        <h1 className="mt-4 text-3xl text-white font-bold">Detalhes da peça</h1>

        <nav className="mt-6 flex flex-wrap gap-2 border-b border-slate-600 pb-2" aria-label="Navegação da peça">
          <Link className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white" href={`/pecas/${id}`}>Dados da peça</Link>
          <Link className="rounded-lg bg-slate-600 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-500" href={`/pecas/${id}/reports`}>Relatórios ({piece.reports?.length ?? 0})</Link>
        </nav>
        
        <div className="mt-8 grid gap-4 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-2 sm:p-6">
          {fields.map(([label, value]) => (
            <p key={label}><strong>{label}:</strong> {value ?? "Não informado"}</p>
          ))}
        </div>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4 sm:p-6">
          <h2 className="text-xl font-semibold">Histórico da peça</h2>
          {!piece.history?.length ? <p className="mt-4 text-slate-600">Nenhuma alteração registrada.</p> : (
            <ol className="mt-4 grid gap-3">
              {[...piece.history]
                .sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime())
                .map((entry) => (
                  <li className="border-l-2 border-sky-600 pl-4" key={entry.id}>
                    <p className="font-semibold text-slate-900">
                      {entry.action === "report" ? "Relatório realizado" : entry.action === "updated" ? "Peça alterada" : "Peça cadastrada"}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{entry.details}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(entry.createdAt).toLocaleString("pt-BR")} · por {entry.userName}
                    </p>
                  </li>
                ))}
            </ol>
          )}
        </section>
        
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