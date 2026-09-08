"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Piece = { id: number; qc?: string; nome?: string; fabricante?: string };

const situations = [
  "OK",
  "Sem condições de reparo",
];

export default function NovoReportPage() {
  const router = useRouter();
  const [reportCount, setReportCount] = useState(1);
  const [qcs, setQcs] = useState([""]);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [responsavelReparo, setResponsavelReparo] = useState("");
  const [descricaoReparo, setDescricaoReparo] = useState("");
  const [situacaoAtual, setSituacaoAtual] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((response) => response.json())
      .then((data) => setResponsavelReparo(data.user?.name ?? ""))
      .catch(() => undefined);
  }, []);

  function changeReportCount(value: number) {
    const nextCount = Math.min(50, Math.max(1, value || 1));
    setReportCount(nextCount);
    setQcs((currentQcs) => Array.from({ length: nextCount }, (_, index) => currentQcs[index] ?? ""));
    setPieces([]);
    setMessage("");
  }

  function changeQc(index: number, value: string) {
    setQcs((currentQcs) => currentQcs.map((currentQc, currentIndex) => currentIndex === index ? value : currentQc));
    setPieces([]);
    setMessage("");
  }

  async function validateQcs(event: React.FormEvent) {
    event.preventDefault();
    setChecking(true);
    setPieces([]);
    setError("");
    setMessage("");
    try {
      const normalizedQcs = qcs.map((value) => value.trim());
      if (normalizedQcs.some((value) => !value)) throw new Error("Preencha todos os QCs.");
      if (new Set(normalizedQcs).size !== normalizedQcs.length) throw new Error("Não repita o mesmo QC.");

      const response = await fetch("/api/pecas");
      const data = await response.json();
      const pieces: Piece[] = Array.isArray(data) ? data : [];
      const foundPieces = normalizedQcs.map((qc) => pieces.find((item) => item.qc?.trim() === qc));
      const invalidIndex = foundPieces.findIndex((piece) => !piece);
      if (invalidIndex !== -1) throw new Error(`QC inválido: ${normalizedQcs[invalidIndex]}.`);
      setPieces(foundPieces as Piece[]);
      setMessage(`${foundPieces.length} QC(s) válido(s). Os reports foram liberados.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível validar o QC.");
    } finally {
      setChecking(false);
    }
  }

  async function saveReport(event: React.FormEvent) {
    event.preventDefault();
    if (!pieces.length) return;
    setSaving(true);
    setError("");
    try {
      await Promise.all(pieces.map(async (piece, index) => {
        const response = await fetch(`/api/pecas/${piece.id}/reports`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qc: qcs[index], responsavelReparo, descricaoReparo, situacaoAtual }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.erro ?? `Não foi possível salvar o report do QC ${qcs[index]}.`);
      }));
      router.push(`/pecas/${pieces[0].id}`);
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

        <form className="mt-8 space-y-5 rounded-xl border border-slate-700 bg-gray-800 p-4 sm:p-6" onSubmit={pieces.length ? saveReport : validateQcs}>
          <label className="grid max-w-xs gap-2 text-sm font-semibold text-slate-200">
            Quantidade de reports
            <input className="rounded-lg border border-slate-300 px-3 py-2 font-normal text-white outline-none" type="number" min="1" max="50" value={reportCount} onChange={(event) => changeReportCount(Number(event.target.value))} required />
          </label>

          <div className="grid gap-3">
            {qcs.map((qc, index) => (
              <label className="grid gap-2 text-sm font-semibold text-slate-200" key={index}>
                QC da peça {index + 1}
                <input className="rounded-lg border border-slate-300 px-3 py-2 font-normal text-white outline-none" value={qc} onChange={(event) => changeQc(index, event.target.value)} required />
              </label>
            ))}
          </div>

          {!pieces.length && <button className="rounded-lg bg-sky-700 px-4 py-2 font-semibold text-white hover:bg-sky-800 disabled:opacity-50" disabled={checking} type="submit">{checking ? "Validando..." : "Validar QCs"}</button>}

          {message && <p className="rounded-lg bg-emerald-50 p-3 text-emerald-700">{message}</p>}
          {error && <p className="rounded-lg bg-red-100 p-3 text-red-700">{error}</p>}

          {pieces.length > 0 && <div className="grid gap-5">
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
            <button className="rounded-lg bg-red-700 px-4 py-3 font-semibold text-white hover:bg-red-800 disabled:opacity-50" disabled={saving} type="submit">{saving ? `Salvando ${pieces.length} reports...` : `Salvar ${pieces.length} reports`}</button>
          </div>}
        </form>
      </section>
    </main>
  );
}
