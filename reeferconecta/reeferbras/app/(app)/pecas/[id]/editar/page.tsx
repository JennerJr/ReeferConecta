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
};

export default function EditarPecaPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [piece, setPiece] = useState<Piece | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deliveredBy, setDeliveredBy] = useState("");
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((response) => response.json())
      .then((data) => setAuthorized(canManagePieces(data.user?.role)))
      .catch(() => setAuthorized(false));

    fetch("/api/pecas")
      .then(async (response) => {
        const data = await response.json();
        const list = Array.isArray(data) ? data : (data.data ?? data.pecas ?? data.dados ?? []);
        const found = list.find((p: Piece) => String(p.id) === String(id));
        if (!found) throw new Error("Peça não encontrada.");
        setPiece(found);
        if (found.situacaoAtual?.startsWith("Em reparo - Entregue por:")) {
          setDeliveredBy(found.situacaoAtual.replace("Em reparo - Entregue por:", "").trim());
          setPiece({ ...found, situacaoAtual: "ReparoIncomum" });
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (field: keyof Piece, value: unknown) => {
    if (piece) {
      setPiece({ ...piece, [field]: value });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const pieceToSave = piece
        ? {
            ...piece,
            situacaoAtual:
              piece.situacaoAtual === "ReparoIncomum"
                ? `Em reparo - Entregue por: ${deliveredBy.trim()}`
                : piece.situacaoAtual,
          }
        : piece;
      const response = await fetch("/api/pecas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pieceToSave),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.erro ?? "Erro ao salvar peça");
      }

      router.push(`/pecas/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">Carregando...</main>;
  if (authorized === false) return <main className="mx-auto max-w-3xl px-4 py-8 text-white sm:px-6 sm:py-10">entrada não autorizada</main>;
  if (authorized === null) return <main className="mx-auto max-w-3xl px-4 py-8 text-white sm:px-6 sm:py-10">Carregando...</main>;
  if (!piece) return <main className="mx-auto max-w-3xl px-4 py-8 text-red-700 sm:px-6 sm:py-10">{error}</main>;

  const fields = [
    { label: "Nome", key: "nome" as const },
    { label: "Serial Number", key: "serialNumber" as const },
    { label: "Fabricante", key: "fabricante" as const },
    { label: "Localidade", key: "localidade" as const },  
    { label: "Técnico Responsável", key: "tecnicoResponsavel" as const },
    { label: "Data de chegada", key: "dataChegada" as const, type: "datetime-local" },
    { label: "Data de saída", key: "dataSaida" as const, type: "date" },
    {
      label: "Situação Atual",
      key: "situacaoAtual" as const,
      type: "select",
      options: [
        ["ReparoComum", "Em reparo - Devolver para o mesmo"],
        ["ReparoTroca", "Em reparo - Estoque"],
        ["ReparoIncomum", "Em reparo - Entregue por:"],
      ],
    },
    { label: "QC", key: "qc" as const },
  ];

  return (
    <main className="min-h-screen px-4 py-8 text-slate-900 sm:px-6 sm:py-10">
      <section className="mx-auto max-w-3xl">
        <Link className="text-sm font-semibold text-sky-700" href={`/pecas/${id}`}>
          ← Voltar para detalhes
        </Link>
        <div><p className="bg-gradient-to-br from-[#E8262C] to-[#B32025] bg-clip-text text-transparent text-sm font-bold uppercase tracking-widest">ReeferConecta</p></div>
        <h1 className="text-3xl font-bold text-white">Editar peça</h1>

        {error && <div className="mt-4 rounded-lg bg-red-100 p-4 text-red-700">{error}</div>}

        <form className="mt-8 space-y-4 rounded-lg border border-slate-200 p-4 text-white sm:p-6">
          {fields.map(({ label, key, type, options }) => (
            <div key={key}>
              <label className="block text-sm text-white font-medium mb-2">{label}</label>
              {type === "select" ? (
                <select
                  value={piece[key] || ""}
                  onChange={(e) => handleChange(key, e.target.value)}
                  className="w-full rounded border text-white border-slate-300  px-3 py-2"
                >
                  <option  value="">Selecionar...</option>
                  {options?.map(([value, label]) => (
                    <option className="text-black" key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={type || "text"}
                  value={piece[key] || ""}
                  onChange={(e) => handleChange(key, e.target.value)}
                  className="w-full rounded border text-white border-slate-300  px-3 py-2"
                />
              )}
            </div>
          ))}
          {piece.situacaoAtual === "ReparoIncomum" && (
            <label className="grid gap-2 text-sm text-white font-medium">
              Nome de quem entregou
              <input
                required
                value={deliveredBy}
                onChange={(event) => setDeliveredBy(event.target.value)}
                className="w-full rounded border text-white border-slate-300 px-3 py-2"
                placeholder="Digite o nome"
              />
            </label>
          )}

          <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:gap-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full rounded-lg bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50 sm:w-auto"
            >
              {saving ? "Salvando..." : "💾 Salvar"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="w-full rounded-lg bg-slate-400 px-6 py-3 font-semibold text-white hover:bg-slate-500 sm:w-auto"
            >
              Cancelar
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}