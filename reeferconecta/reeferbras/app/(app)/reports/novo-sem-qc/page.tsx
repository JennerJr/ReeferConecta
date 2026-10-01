"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import carrierParts from "@/data/carrier.json";
import daikinParts from "@/data/daikin.json";
import starcoolParts from "@/data/starcool.json";
import thermokingParts from "@/data/thermoking.json";
import outrosParts from "@/data/outros.json"; 

const visualInspectionOptions = ["BIELA", "BOMBA DE LUBRIFICAÇÃO", "BORNE", "BUCHA", "CAMISA", "EIXO GIRA BREQUIM", "ESTATOR", "FILTRO", "PISTÕES", "PLACA DE VÁLVULAS"];
const mechanicalAnalysisOptions = ["Anel Guia do SCROLL", "Bucha Exêntrica", "Bucha do Mancal", "Cabeçote", "Conjunto de virabrequim", "Disco de compressão", "Mancal de virabrequim", "Mola do mecanismo de flutuação", "Selo Flutuante", "SCROLL fixo", "SCROLL movel", "Válvula de Retenção"];
const functionTestOptions = ["Corrente de operação entre 3A à 8A (BANCADA)", "Pressurização", "320 Psi à 400 Psi", "Teste em Container \"Baby\""];
const situations = ["OK", "Sem condições de reparo"];

const partsByManufacturer: Record<string, CatalogPart[]> = {
  Carrier: carrierParts,
  Daikin: daikinParts,
  "Star Cool": starcoolParts,
  "Thermo King": thermokingParts,
  "Outros":  outrosParts,
};


type ReportForm = {
  fabricante: string;
  ordemServico: string;
  nomePeca: string;
  descricaoReparo: string;
  responsavelReparo: string;
  situacaoAtual: string;
  resistencia: string;
  surge: string[];
  mega: string;
  simulador: string;
  corrente: string;
  transformador: string;
  serialNumberReport: string;
  estatorTrocado: string;
  scroll: string;
  reparoFalange: string;
  inspeçãoVisual: string[];
  analiseMecanica: string[];
  testeFuncionamento: string[];
  outroTesteFuncionamento: string;
};
type CatalogPart = {
  linha: string;
  componente: string;
  descricao: string;
  imagem?: string;
  setor?: string;
};

const normalizeSetor = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[\s._-]+/g, "")        // remove espaço, ponto, hífen, underscore
    .toLowerCase();

const filteredSetores = ["lab.elétrica", "cereco", "lab.eletronica"].map(normalizeSetor);

function createForm(): ReportForm {
  return { fabricante: "", ordemServico: "", nomePeca: "", descricaoReparo: "", situacaoAtual: "", resistencia: "", surge: ["", "", ""], mega: "", simulador: "", corrente: "", transformador: "", serialNumberReport: "", estatorTrocado: "", scroll: "", reparoFalange: "", responsavelReparo: "", inspeçãoVisual: [], analiseMecanica: [], testeFuncionamento: [], outroTesteFuncionamento: "" };
}

function cloneForAdditionalReport(source: ReportForm): ReportForm {
  return { ...source, ordemServico: "", surge: [...source.surge], inspeçãoVisual: [...source.inspeçãoVisual], analiseMecanica: [...source.analiseMecanica], testeFuncionamento: [...source.testeFuncionamento],};
}

export default function NovoReportSemQcPage() {
  const router = useRouter();
  const [role, setRole] = useState("");
  const [currentUserName, setCurrentUserName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [forms, setForms] = useState<ReportForm[]>([createForm()]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((response) => response.json())
            .then((data) => {
        const name = data.user?.name ?? "";
        setCurrentUserName(name);
        setRole(data.user?.role?.trim().toLowerCase() ?? "");
        setForms((current) =>
          current.map((form) =>
            form.responsavelReparo ? form : { ...form, responsavelReparo: name }
          )
        );
      })
      .catch(() => undefined);
  }, []);

  function update(index: number, field: keyof ReportForm, value: string | string[]) {
    setForms((current) => current.map((form, formIndex) => {
      if (formIndex === index) return { ...form, [field]: value };
      if (index === 0 && field !== "ordemServico") return { ...form, [field]: Array.isArray(value) ? [...value] : value };
      return form;
    }));
  }

  function toggle(index: number, field: "inspeçãoVisual" | "analiseMecanica" | "testeFuncionamento", value: string) {
    const selected = forms[index][field];
    update(index, field, selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  }

  function handleManufacturerChange(index: number, value: string) {
    setForms((currentForms) => currentForms.map((form, formIndex) => {
      if (formIndex === index) return { ...form, fabricante: value, nomePeca: "" };
      if (index === 0) return { ...form, fabricante: value, nomePeca: "" };
      return form;
    }));
    setSubmitted(false);
  }

  function handlePartNameChange(index: number, value: string) {
    setForms((currentForms) => currentForms.map((form, formIndex) => {
      if (formIndex === index) return { ...form, nomePeca: value ?? "" };
      if (index === 0) return { ...form, nomePeca: value ?? "" };
      return form;
    }));
    setSubmitted(false);
  }

  function availableParts(manufacturer: string) {
  const parts = partsByManufacturer[manufacturer] ?? [];
  const userSetor = normalizeSetor(role);
  if (!filteredSetores.includes(userSetor)) return parts; // outros roles veem tudo
  return parts.filter((part) => normalizeSetor(part.setor ?? "") === userSetor);
}

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    for (const form of forms) {
      if ((form.ordemServico.trim() && !/^\d+$/.test(form.ordemServico.trim())) || !form.nomePeca.trim() || !form.situacaoAtual) {
        setError("Preencha o nome da peça e a situação. A OS, quando informada, deve ser numérica.");
        return;
      }
      if (role === "cereco" && form.scroll === "Sim" && !["Sim", "Não"].includes(form.reparoFalange)) {
        setError("Informe o reparo da falange quando SCROLL for Sim.");
        return;
      }
      if (role === "lab.elétrica" && form.surge.some(Boolean) && form.surge.some((value) => !value.trim())) {
        setError("Preencha as três medições de Surge ou deixe todas vazias.");
        return;
      }
    }
    setSaving(true);
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reports: forms.map((form) => ({
          ...form,
          responsavelReparo: form.responsavelReparo?.trim() || currentUserName,
          surge: form.surge.filter(Boolean).join(" / "),
          inspeçãoVisual: form.inspeçãoVisual.join(" / "),
          analiseMecanica: form.analiseMecanica.join(" / "),
          testeFuncionamento: form.testeFuncionamento.join(" / "),
        })) }),
      });
      setSubmitted(true);
      const data = await response.json();
      if (!response.ok) throw new Error(data.erro ?? "Não foi possível salvar os relatórios.");
      router.push("/reports");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível salvar os relatórios.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-800 px-4 py-8 text-slate-900 sm:px-6 sm:py-10">
      <section className="mx-auto max-w-3xl">
        <Link className="text-sm font-semibold text-sky-400" href="/reports">← Voltar para relatórios</Link>
        <h1 className="mt-4 text-3xl font-bold text-white">Novo relatório sem QC</h1>
        <p className="mt-2 text-slate-300">Os relatórios não ficam vinculados a uma peça. A ordem de serviço é opcional.</p>
        <form className="mt-8 space-y-6" onSubmit={submit}>
          <label className="grid max-w-xs gap-2 text-sm font-semibold text-slate-200">Quantidade de relatórios
            <input className="rounded-lg border border-slate-300 px-3 py-2 font-normal text-white" type="number" min="0" max="50" value={forms.length} onChange={(event) => setForms((current) => { const nextLength = Math.min(50, Math.max(0, Number(event.target.value) || 0)); const template = current[0] ?? { ...createForm(), responsavelReparo: currentUserName }; return Array.from({ length: nextLength }, (_, index) => current[index] ?? cloneForAdditionalReport(template)); })} />
          </label>
          <label> 
            {forms.length > 0 && (
              <button id="sup_button" className="rounded-lg bg-red-700 px-4 py-3 font-semibold text-white disabled:opacity-50" disabled={saving} type="submit">{saving ? "Salvando..." : `Salvar ${forms.length} relatório(s)`}</button>
            )}
          </label>
          {forms.map((form, index) => (
            
            <section className="grid gap-5 rounded-xl border border-slate-700 p-4 sm:p-6" key={index}>
              <h2 className="text-xl font-semibold text-white">Relatório {index + 1}</h2>
              <label className="grid gap-2 text-sm font-semibold text-slate-200">Fabricante
                <select className="rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none" required value={form.fabricante} onChange={(event) => handleManufacturerChange(index, event.target.value)}>
                  <option value="">Selecione um fabricante</option>
                  {Object.keys(partsByManufacturer).map((manufacturer) => <option className="text-black" key={manufacturer} value={manufacturer}>{manufacturer}</option>)}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-200">Nome da peça
                <select className="rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none" required disabled={!form.fabricante} value={form.nomePeca} onChange={(event) => handlePartNameChange(index, event.target.value)}>
                  <option value="" className="text-black">{form.fabricante ? "Selecione uma peça" : "Selecione primeiro o fabricante"}</option>
                  {availableParts(form.fabricante).map((part) => <option className="text-black" key={`${part.descricao}-${part.componente}`} value={part.descricao}>{part.descricao}</option>)}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-200">Técnico responsável pelo reparo<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal text-white" placeholder={currentUserName} value={form.responsavelReparo} onChange={(event) => update(index, "responsavelReparo", event.target.value)}/></label>
              <label className="grid gap-2 text-sm font-semibold text-slate-200">Ordem de serviço (opcional)<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal text-white" type="number" value={form.ordemServico} onChange={(event) => update(index, "ordemServico", event.target.value)} /></label>
              <label className="grid gap-2 text-sm font-semibold text-slate-200">Descrição<textarea className="min-h-24 rounded-lg border border-slate-300 px-3 py-2 font-normal text-white" value={form.descricaoReparo} onChange={(event) => update(index, "descricaoReparo", event.target.value)} /></label>
              <label className="grid gap-2 text-sm font-semibold text-slate-200">Situação<select className="rounded-lg border border-slate-300 px-3 py-2 font-normal" value={form.situacaoAtual} onChange={(event) => update(index, "situacaoAtual", event.target.value)} required> <option value=""></option> {situations.map((item) => <option className="text-black" key={item}>{item}</option>)}</select></label>
              {currentUserName && <p className="text-xs text-slate-400">O Úsuario será salvo como: {currentUserName}</p>}
              {role === "lab.elétrica" && <div className="grid gap-4 border-t border-slate-600 pt-4"><h3 className="font-semibold text-white">Medições elétricas</h3><label className="grid gap-2 text-sm text-slate-200">Resistência (Ω)<input className="rounded-lg border border-slate-300 bg-gray-800 px-3 py-2 font-normal text-white outline-none focus:border-sky-400" type="number" step="any" value={form.resistencia} onChange={(event) => update(index, "resistencia", event.target.value)} /></label><div className="grid gap-2 text-sm text-slate-200"><span>Surge (%)</span><div className="grid gap-2 sm:grid-cols-3">{form.surge.map((value, measurementIndex) => <input className="rounded-lg border border-slate-300 bg-gray-800 px-3 py-2 font-normal text-white outline-none focus:border-sky-400" type="number" step="any" key={measurementIndex} value={value} onChange={(event) => update(index, "surge", form.surge.map((item, itemIndex) => itemIndex === measurementIndex ? event.target.value : item))} />)}</div></div><label className="grid gap-2 text-sm text-slate-200">Mega (Ω)<input className="rounded-lg border border-slate-300 bg-gray-800 px-3 py-2 font-normal text-white outline-none focus:border-sky-400" type="number" step="any" value={form.mega} onChange={(event) => update(index, "mega", event.target.value)} /></label><label className="grid gap-2 text-sm text-slate-200">Simulador<select className="rounded-lg border border-slate-300 bg-gray-800 px-3 py-2 text-white outline-none focus:border-sky-400" value={form.simulador} onChange={(event) => update(index, "simulador", event.target.value)}><option value="">Não informado</option><option>Passou</option><option>Não passou</option></select></label><label className="grid gap-2 text-sm text-slate-200">Corrente (A)<input className="rounded-lg border border-slate-300 bg-gray-800 px-3 py-2 font-normal text-white outline-none focus:border-sky-400" type="number" step="any" value={form.corrente} onChange={(event) => update(index, "corrente", event.target.value)} /></label><label className="grid gap-2 text-sm text-slate-200">Transformador (V AC)<input className="rounded-lg border border-slate-300 bg-gray-800 px-3 py-2 font-normal text-white outline-none focus:border-sky-400" type="number" step="any" value={form.transformador} onChange={(event) => update(index, "transformador", event.target.value)} /></label></div>}
              {role === "cereco" && <div className="grid gap-5 border-t border-slate-600 pt-4">
                <label className="grid gap-2 text-sm font-semibold text-slate-200">Serial number<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal text-white" pattern="[A-Za-z0-9]+" value={form.serialNumberReport} onChange={(event) => update(index, "serialNumberReport", event.target.value)} /></label>
                <label className="grid gap-2 text-sm font-semibold text-slate-200">Estator trocado<select className="rounded-lg border border-slate-300 px-3 py-2 font-normal text-black" value={form.estatorTrocado} onChange={(event) => update(index, "estatorTrocado", event.target.value)}><option value="">Não informado</option><option>Sim</option><option>Não</option></select></label>
                <label className="grid gap-2 text-sm font-semibold text-slate-200">SCROLL<select className="rounded-lg border border-slate-300 px-3 py-2 font-normal text-black" value={form.scroll} onChange={(event) => update(index, "scroll", event.target.value)}><option value="">Não informado</option><option>Sim</option><option>Não</option></select></label>
                {form.scroll === "Sim" && <><label className="grid gap-2 text-sm font-semibold text-slate-200">Reparo da falange<select className="rounded-lg border border-slate-300 px-3 py-2 font-normal text-black" value={form.reparoFalange} onChange={(event) => update(index, "reparoFalange", event.target.value)}><option value="">Selecione</option><option>Sim</option><option>Não</option></select></label><fieldset className="grid gap-2 text-sm text-slate-200"><legend>Análise mecânica</legend>{mechanicalAnalysisOptions.map((option) => <label className="flex gap-2" key={option}><input type="checkbox" checked={form.analiseMecanica.includes(option)} onChange={() => toggle(index, "analiseMecanica", option)} />{option}</label>)}</fieldset></>}
                <fieldset className="grid gap-2 rounded-lg border border-slate-300 p-4 text-sm text-slate-200"><legend className="px-2 font-semibold text-slate-200">Inspeção visual</legend>{visualInspectionOptions.map((option) => <label className="flex gap-2" key={option}><input type="checkbox" checked={form.inspeçãoVisual.includes(option)} onChange={() => toggle(index, "inspeçãoVisual", option)} />{option}</label>)}</fieldset>
                <fieldset className="grid gap-2 rounded-lg border border-slate-300 p-4 text-sm text-slate-200"><legend className="px-2 font-semibold text-slate-200">Teste de funcionamento</legend>{functionTestOptions.map((option) => <label className="flex gap-2" key={option}><input type="checkbox" checked={form.testeFuncionamento.includes(option)} onChange={() => toggle(index, "testeFuncionamento", option)} />{option}</label>)}</fieldset>
                <label className="grid gap-2 text-sm font-semibold text-slate-200">Outro teste<input className="rounded-lg border border-slate-300 bg-gray-800 px-3 py-2 font-normal text-white outline-none focus:border-sky-400" value={form.outroTesteFuncionamento} onChange={(event) => update(index, "outroTesteFuncionamento", event.target.value)} /></label>
              </div>}
            </section>
          ))}
          {error && <p className="rounded-lg bg-red-100 p-3 text-red-700">{error}</p>}
          <button className="rounded-lg bg-red-700 px-4 py-3 font-semibold text-white disabled:opacity-50" disabled={saving} type="submit">{saving ? "Salvando..." : `Salvar ${forms.length} relatório(s)`}</button>
        </form>
      </section>
    </main>
  );
}
