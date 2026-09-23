"use client";

import Link from "next/link";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { canManagePieces } from "@/lib/authorization";

type PageProps = { params: Promise<{ id: string }> };

type chamados = {
    id: string;
    title: string;
    description: string;
    status: string;
    pedidorPor: string;
    criadoEm: string;
}

export default function EditarChamadoPage({params}: PageProps){
    const { id } = use(params);
      const router = useRouter();
      const [chamado, setChamado] = useState<chamados | null>(null);
      const [loading, setLoading] = useState(true);
      const [saving, setSaving] = useState(false);
      const [error, setError] = useState("");
      const [pedidoPor, setPedidoPor] = useState("");
      const [authorized, setAuthorized] = useState(false);

       useEffect(() => {
          fetch("/api/auth/session")
            .then((response) => response.json())
            .then((data) => setAuthorized(canManagePieces(data.user?.role)))
            .catch(() => setAuthorized(false));
      
          fetch("/api/chamados")
            .then(async (response) => {
              const data = await response.json();
              const list = Array.isArray(data) ? data : (data.data ?? data.pecas ?? data.dados ?? []);
              const found = list.find((p: chamados) => String(p.id) === String(id));
              if (!found) throw new Error("Chamado não encontrado.");
              setChamado(found);
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
        }, [id]);

    const handleChange = (field: keyof chamados, value: unknown) => {
        if (chamado) {
        setChamado({ ...chamado, [field]: value });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const chamadoToSave = chamado
        ? chamado
        : chamado;
      const response = await fetch("/api/chamados", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chamadoToSave),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.erro ?? "Erro ao salvar chamado");
      }

      router.push(`/chamados/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

    if (loading) return <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">Carregando...</main>;
    if (authorized === false) return <main className="mx-auto max-w-3xl px-4 py-8 text-white sm:px-6 sm:py-10">entrada não autorizada</main>;
    if (authorized === null) return <main className="mx-auto max-w-3xl px-4 py-8 text-white sm:px-6 sm:py-10">Carregando...</main>;
    if (!chamado) return <main className="mx-auto max-w-3xl px-4 py-8 text-red-700 sm:px-6 sm:py-10">{error}</main>;

    const fields = [
        {label: "Status", 
         key: "status" as const,
         type: "select",
         options: [
            ["Chamado em andamento", "Chamado Em Andamento"],
            ["Chamado Finalizado", "Chamado Finalizado"],
            ["Chamado não realizado", "Chamado não realizado"]
         ]

        },
    ];

    return (
        <main className="min-h-screen px-4 py-8 text-slate-900 sm:px-6 sm:py-10">
          <section className="mx-auto max-w-3xl">
            <Link className="text-sm font-semibold text-sky-700" href={`/chamados/${id}`}>
              ← Voltar para detalhes
            </Link>
            <div><p className="bg-gradient-to-br from-[#E8262C] to-[#B32025] bg-clip-text text-transparent text-sm font-bold uppercase tracking-widest">ReeferConecta</p></div>
            <h1 className="text-3xl font-bold text-white">Editar chamado</h1>
    
            {error && <div className="mt-4 rounded-lg bg-red-100 p-4 text-red-700">{error}</div>}
    
            <form className="mt-8 space-y-4 rounded-lg border border-slate-200 p-4 text-white sm:p-6">
              {fields.map(({ label, key, type, options }) => (
                <div key={key}>
                  <label className="block text-sm text-white font-medium mb-2">{label}</label>
                  {type === "select" ? (
                    <select
                      value={chamado[key] || ""}
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
                      value={chamado[key] || ""}
                      onChange={(e) => handleChange(key, e.target.value)}
                      className="w-full rounded border text-white border-slate-300  px-3 py-2"
                    />
                  )}
                </div>
              ))}
             
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

