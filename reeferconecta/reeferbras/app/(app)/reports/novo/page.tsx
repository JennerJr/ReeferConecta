"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Piece = { id: number; qc?: string; nome?: string; fabricante?: string };

const situations = [
  "OK - Devolver para o mesmo",
  "OK - Estoque",
  "OK - Entregue por",
  "Sem condições de reparo",
];

export default function NovoReportPage() {
  const router = useRouter();
  const [qc, setQc] = useState("");
  const [piece, setPiece] = useState<Piece | null>(null);
  const [responsavelReparo, setResponsavelReparo] = useState("");
  const [descricaoReparo, setDescricaoReparo] = useState("");
  const [situacaoAtual, setSituacaoAtual] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);

  async function validateQc(event: React.FormEvent) {
    event.preventDefault();
    setChecking(true);
    setPiece(null);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/pecas");
      const data = await response.json();
      const pieces: Piece[] = Array.isArray(data) ? data : [];
      const found = pieces.find((item) => item.qc?.trim() === qc.trim());
      if (!found) throw new Error("QC inválido. Confira o código e tente novamente.");
      setPiece(found);
      setMessage("QC válido. As opções do report foram liberadas.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível validar o QC.");
    } finally {
      setChecking(false);
    }
  }

  async function saveReport(event: React.FormEvent) {
    event.preventDefault();
    if (!piece) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/pecas/${piece.id}/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qc, responsavelReparo, descricaoReparo, situacaoAtual }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.erro ?? "Não foi possível salvar o report.");
      router.push(`/pecas/${piece.id}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível salvar o report.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-800 px-4 py-8 text-slate-900 sm:px-6 sm:py-10">
      <section className="mx-auto max-w-3xl">
        <Link className="text-sm font-semibold text-sky-400" href="/reports">← Voltar para reports</Link>
        <h1 className="mt-4 text-3xl font-bold text-white">Novo report</h1>
        <p className="mt-2 text-slate-300">Informe o QC da peça para liberar o registro do reparo.</p>

        <form className="mt-8 space-y-5 rounded-xl border border-slate-700 bg-gray-800 p-4 sm:p-6" onSubmit={piece ? saveReport : validateQc}>
          <label className="grid gap-2 text-sm font-semibold text-slate-200">
            QC da peça
            <div className="flex flex-col gap-3 sm:flex-row">
              <input className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 font-normal text-white outline-none" value={qc} onChange={(event) => { setQc(event.target.value); setPiece(null); setMessage(""); }} required />
              {!piece && <button className="rounded-lg bg-sky-700 px-4 py-2 font-semibold text-white hover:bg-sky-800 disabled:opacity-50" disabled={checking} type="submit">{checking ? "Validando..." : "Validar QC"}</button>}
            </div>
          </label>

          {message && <p className="rounded-lg bg-emerald-50 p-3 text-emerald-700">{message} {piece?.nome ? `Peça: ${piece.nome}.` : ""}</p>}
          {error && <p className="rounded-lg bg-red-100 p-3 text-red-700">{error}</p>}

          {piece && <div className="grid gap-5">
            <label className="grid gap-2 text-sm font-semibold text-slate-200">
              Técnico responsável pelo reparo
              <input className="rounded-lg border border-slate-300 px-3 py-2 font-normal text-white outline-none" value={responsavelReparo} onChange={(event) => setResponsavelReparo(event.target.value)} required />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-200">
              Descrição do reparo
              <textarea className="min-h-32 rounded-lg border border-slate-300 px-3 py-2 font-normal text-white outline-none" value={descricaoReparo} onChange={(event) => setDescricaoReparo(event.target.value)} required />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-200">
              Situação atual
              <select className="rounded-lg border border-slate-300 px-3 py-2 font-normal text-black outline-none" value={situacaoAtual} onChange={(event) => setSituacaoAtual(event.target.value)} required>
                <option value="">Selecione uma situação</option>
                {situations.map((situation) => <option key={situation} value={situation}>{situation}</option>)}
              </select>
            </label>
            <button className="rounded-lg bg-red-700 px-4 py-3 font-semibold text-white hover:bg-red-800 disabled:opacity-50" disabled={saving} type="submit">{saving ? "Salvando..." : "Salvar report"}</button>
          </div>}
        </form>
      </section>
    </main>
  );
}
