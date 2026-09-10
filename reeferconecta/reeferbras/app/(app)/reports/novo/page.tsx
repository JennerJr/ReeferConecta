"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Piece = { id: number; qc?: string; nome?: string; fabricante?: string };

const visualInspectionOptions = ["BIELA", "BOMBA DE LUBRIFICAÇÃO", "BORNE", "BUCHA", "CAMISA", "EIXO GIRA BREQUIM", "ESTATOR", "FILTRO", "PISTÕES", "PLACA DE VÁLVULAS"];
const mechanicalAnalysisOptions = ["Anel Guia do SCROLL", "Bucha Exêntrica", "Bucha do Mancal", "Cabeçote", "Conjunto de virabrequim", "Disco de compressão", "Mancal de virabrequim", "Mola do mecanismo de flutuação", "Selo Flutuante", "SCROLL fixo", "SCROLL movel", "Válvula de Retenção"];
const functionTestOptions = ["Corrente de operação entre 3A à 8A (BANCADA)", "Pressurização", "320 Psi à 400 Psi", "Teste em Container \"Baby\""];

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
  const [role, setRole] = useState("");
  const [resistencia, setResistencia] = useState("");
  const [surge, setSurge] = useState(["", "", ""]);
  const [mega, setMega] = useState("");
  const [simulador, setSimulador] = useState("");
  const [corrente, setCorrente] = useState("");
  const [transformador, setTransformador] = useState("");
  const [visualInspections, setVisualInspections] = useState<string[]>([]);
  const [ordemServico, setOrdemServico] = useState("");
  const [serialNumberReport, setSerialNumberReport] = useState("");
  const [estatorTrocado, setEstatorTrocado] = useState("");
  const [scroll, setScroll] = useState("");
  const [reparoFalange, setReparoFalange] = useState("");
  const [mechanicalAnalysis, setMechanicalAnalysis] = useState<string[]>([]);
  const [functionTests, setFunctionTests] = useState<string[]>([]);
  const [otherFunctionTest, setOtherFunctionTest] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((response) => response.json())
      .then((data) => {
        setResponsavelReparo(data.user?.name ?? "");
        setRole(data.user?.role?.trim().toLowerCase() ?? "");
      })
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

  function changeSurge(index: number, value: string) {
    setSurge((current) => current.map((measurement, measurementIndex) => measurementIndex === index ? value : measurement));
  }

  function toggleSelection(value: string, selected: string[], setSelected: (values: string[]) => void) {
    setSelected(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
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
      setMessage(`${foundPieces.length} QC(s) válido(s). Os relatórios foram liberados.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível validar o QC.");
    } finally {
      setChecking(false);
    }
  }

  async function saveReport(event: React.FormEvent) {
    event.preventDefault();
    if (!pieces.length) return;
    if (role === "lab.elétrica" && surge.some(Boolean) && surge.some((measurement) => !measurement.trim())) {
      setError("Preencha as três medições de Surge ou deixe todas vazias.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await Promise.all(pieces.map(async (piece, index) => {
        const response = await fetch(`/api/pecas/${piece.id}/reports`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            qc: qcs[index], responsavelReparo, descricaoReparo, situacaoAtual,
            resistencia, surge: surge.filter(Boolean).join(" / "), mega, simulador, corrente, transformador,
            inspeçãoVisual: visualInspections.join(" / "), ordemServico, serialNumberReport, estatorTrocado,
            scroll, reparoFalange, analiseMecanica: mechanicalAnalysis.join(" / "),
            testeFuncionamento: functionTests.join(" / "), outroTesteFuncionamento: otherFunctionTest,
            notify: pieces.length === 1,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.erro ?? `Não foi possível salvar o relatório do QC ${qcs[index]}.`);
      }));
      if (pieces.length > 1) {
        await fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ count: pieces.length }),
        }).catch(() => undefined);
      }
      router.push(`/pecas/${pieces[0].id}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível salvar o relatório.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-800 px-4 py-8 text-slate-900 sm:px-6 sm:py-10">
      <section className="mx-auto max-w-3xl">
        <Link className="text-sm font-semibold text-sky-400" href="/reports">← Voltar para relatórios</Link>
        <h1 className="mt-4 text-3xl font-bold text-white">Novo relatório</h1>
        <p className="mt-2 text-slate-300">Informe o QC da peça para liberar o registro do reparo.</p>

        <form className="mt-8 space-y-5 rounded-xl border border-slate-700 bg-gray-800 p-4 sm:p-6" onSubmit={pieces.length ? saveReport : validateQcs}>
          <label className="grid max-w-xs gap-2 text-sm font-semibold text-slate-200">
            Quantidade de relatórios
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
              <textarea className="min-h-32 rounded-lg border border-slate-300 px-3 py-2 font-normal text-white outline-none" value={descricaoReparo} onChange={(event) => setDescricaoReparo(event.target.value)} />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-200">
              Situação atual
              <select className="rounded-lg border border-slate-300 px-3 py-2 font-normal text-black outline-none" value={situacaoAtual} onChange={(event) => setSituacaoAtual(event.target.value)} required>
                <option value="">Selecione uma situação</option>
                {situations.map((situation) => <option key={situation} value={situation}>{situation}</option>)}
              </select>
            </label>
            {role === "lab.elétrica" && <div className="grid gap-5 rounded-lg border border-slate-600 p-4">
              <h2 className="text-lg font-semibold text-white">Medições elétricas</h2>
              <label className="grid gap-2 text-sm font-semibold text-slate-200">Resistência (Ω)<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal text-white outline-none" type="number" step="any" value={resistencia} onChange={(event) => setResistencia(event.target.value)} /></label>
              <fieldset className="grid gap-2 text-sm font-semibold text-slate-200"><legend>Surge (%)</legend><div className="grid gap-3 sm:grid-cols-3">{surge.map((measurement, index) => <input className="rounded-lg border border-slate-300 px-3 py-2 font-normal text-white outline-none" key={index} aria-label={`Medição Surge ${index + 1}`} type="number" step="any" value={measurement} onChange={(event) => changeSurge(index, event.target.value)} />)}</div></fieldset>
              <label className="grid gap-2 text-sm font-semibold text-slate-200">Mega (Ω)<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal text-white outline-none" type="number" step="any" value={mega} onChange={(event) => setMega(event.target.value)} /></label>
              <label className="grid gap-2 text-sm font-semibold text-slate-200">Simulador<select className="rounded-lg border border-slate-300 px-3 py-2 font-normal text-black outline-none" value={simulador} onChange={(event) => setSimulador(event.target.value)}><option value="">Não informado</option><option value="Passou">Passou</option><option value="Não passou">Não passou</option></select></label>
              <label className="grid gap-2 text-sm font-semibold text-slate-200">Corrente (A)<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal text-white outline-none" type="number" step="any" value={corrente} onChange={(event) => setCorrente(event.target.value)} /></label>
              <label className="grid gap-2 text-sm font-semibold text-slate-200">Transformador (V AC)<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal text-white outline-none" type="number" step="any" value={transformador} onChange={(event) => setTransformador(event.target.value)} /></label>
            </div>}
            {role === "cereco" && <div className="grid gap-5 rounded-lg border border-slate-600 p-4">
              <h2 className="text-lg font-semibold text-white">Dados do Cereco</h2>
              <fieldset className="grid gap-2 rounded-lg border border-slate-300 p-4 text-sm font-semibold text-slate-200"><legend className="px-2 font-semibold text-slate-200">Inspeção visual</legend><div className="grid gap-2 sm:grid-cols-2">{visualInspectionOptions.map((option) => <label className="flex items-center gap-2 font-normal" key={option}><input type="checkbox" checked={visualInspections.includes(option)} onChange={() => toggleSelection(option, visualInspections, setVisualInspections)} />{option}</label>)}</div></fieldset>
              <label className="grid gap-2 text-sm font-semibold text-slate-200">Ordem de serviço<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal text-white outline-none" type="number" value={ordemServico} onChange={(event) => setOrdemServico(event.target.value)} /></label>
              <label className="grid gap-2 text-sm font-semibold text-slate-200">Serial number<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal text-white outline-none" value={serialNumberReport} onChange={(event) => setSerialNumberReport(event.target.value)} pattern="[A-Za-z0-9]+" /></label>
              <label className="grid gap-2 text-sm font-semibold text-slate-200">Estator trocado<select className="rounded-lg border border-slate-300 px-3 py-2 font-normal text-black outline-none" value={estatorTrocado} onChange={(event) => setEstatorTrocado(event.target.value)}><option value="">Não informado</option><option value="Sim">Sim</option><option value="Não">Não</option></select></label>
              <label className="grid gap-2 text-sm font-semibold text-slate-200">SCROLL<select className="rounded-lg border border-slate-300 px-3 py-2 font-normal text-black outline-none" value={scroll} onChange={(event) => { setScroll(event.target.value); if (event.target.value !== "Sim") { setReparoFalange(""); setMechanicalAnalysis([]); } }}><option value="">Não informado</option><option value="Sim">Sim</option><option value="Não">Não</option></select></label>
              {scroll === "Sim" && <div className="grid gap-5 rounded-lg border border-slate-700 p-3"><label className="grid gap-2 text-sm font-semibold text-slate-200">Reparo da falange<select className="rounded-lg border border-slate-300 px-3 py-2 font-normal text-black outline-none" value={reparoFalange} onChange={(event) => setReparoFalange(event.target.value)}><option value="">Não informado</option><option value="Sim">Sim</option><option value="Não">Não</option></select></label><fieldset className="grid gap-2 text-sm font-semibold text-slate-200"><legend>Análise mecânica</legend><div className="grid gap-2 sm:grid-cols-2">{mechanicalAnalysisOptions.map((option) => <label className="flex items-center gap-2 font-normal" key={option}><input type="checkbox" checked={mechanicalAnalysis.includes(option)} onChange={() => toggleSelection(option, mechanicalAnalysis, setMechanicalAnalysis)} />{option}</label>)}</div></fieldset></div>}
              <fieldset className="grid gap-2 rounded-lg border border-slate-300 p-4 text-sm font-semibold text-slate-200"><legend className="px-2 font-semibold text-slate-200">Teste de funcionamento</legend><div className="grid gap-2">{functionTestOptions.map((option) => <label className="flex items-center gap-2 font-normal" key={option}><input type="checkbox" checked={functionTests.includes(option)} onChange={() => toggleSelection(option, functionTests, setFunctionTests)} />{option}</label>)}</div></fieldset>
              <label className="grid gap-2 text-sm font-semibold text-slate-200">Outro teste<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal text-white outline-none" value={otherFunctionTest} onChange={(event) => setOtherFunctionTest(event.target.value)} /></label>
            </div>}
            <button className="rounded-lg bg-red-700 px-4 py-3 font-semibold text-white hover:bg-red-800 disabled:opacity-50" disabled={saving} type="submit">{saving ? `Salvando ${pieces.length} relatórios...` : `Salvar ${pieces.length} relatórios`}</button>
          </div>}
        </form>
      </section>
    </main>
  );
}
