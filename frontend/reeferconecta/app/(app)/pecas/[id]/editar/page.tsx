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
};

export default function EditarPecaPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [piece, setPiece] = useState<Piece | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/pecas")
      .then(async (response) => {
        const data = await response.json();
        const list = Array.isArray(data) ? data : (data.data ?? data.pecas ?? data.dados ?? []);
        const found = list.find((p: Piece) => String(p.id) === String(id));
        if (!found) throw new Error("Peça não encontrada.");
        setPiece(found);
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
      const response = await fetch("/api/pecas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(piece),
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

  if (loading) return <main className="mx-auto max-w-3xl px-6 py-10">Carregando...</main>;
  if (!piece) return <main className="mx-auto max-w-3xl px-6 py-10 text-red-700">{error}</main>;

  const fields = [
    { label: "Nome", key: "nome" as const },
    { label: "Serial Number", key: "serialNumber" as const },
    { label: "Fabricante", key: "fabricante" as const },
    { label: "Localidade", key: "localidade" as const },
    { label: "Terminal", key: "terminal" as const },
    { label: "Técnico Responsável", key: "tecnicoResponsavel" as const },
    { label: "Part Number", key: "partNumber" as const },
    { label: "Data de chegada", key: "dataChegada" as const, type: "date" },
    { label: "Data de saída", key: "dataSaida" as const, type: "date" },
    {
      label: "Situação Atual",
      key: "situacaoAtual" as const,
      type: "select",
      options: ["Em uso", "Em manutenção", "Armazenado", "Descartado"],
    },
    { label: "QC", key: "qc" as const },
  ];

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <section className="mx-auto max-w-3xl">
        <Link className="text-sm font-semibold text-sky-700" href={`/pecas/${id}`}>
          ← Voltar para detalhes
        </Link>

        <h1 className="mt-4 text-3xl font-bold">Editar peça</h1>

        {error && <div className="mt-4 rounded-lg bg-red-100 p-4 text-red-700">{error}</div>}

        <form className="mt-8 space-y-4 rounded-lg border border-slate-200 bg-white p-6">
          {fields.map(({ label, key, type, options }) => (
            <div key={key}>
              <label className="block text-sm font-medium mb-2">{label}</label>
              {type === "select" ? (
                <select
                  value={piece[key] || ""}
                  onChange={(e) => handleChange(key, e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2"
                >
                  <option value="">Selecionar...</option>
                  {options?.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={type || "text"}
                  value={piece[key] || ""}
                  onChange={(e) => handleChange(key, e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2"
                />
              )}
            </div>
          ))}

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-green-600 px-6 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? "Salvando..." : "💾 Salvar"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-lg bg-slate-400 px-6 py-2 font-semibold text-white hover:bg-slate-500"
            >
              Cancelar
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}