"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type PecaForm = {
  id: string;  
  dataChegada: string;
  partNumber: string;
  nome: string;
  serialNumber: string;
  fabricante: string;
  localidade: string;
  terminal: string;
  tecnicoResponsavel: string;
  dataSaida: string;
  situacaoAtual: string;
  qc: string;
  imagemUrl?: string;
};

type SearchResult = {
  name: string;
  manufacturer: string;
  link: string;
  snippet: string;
  imageUrl?: string;
};


const initialForm: PecaForm = {
  id:"",  
  dataChegada: "",
  partNumber: "",
  nome: "",
  serialNumber: "",
  fabricante: "",
  localidade: "",
  terminal: "",
  tecnicoResponsavel: "",
  dataSaida: "",
  situacaoAtual: "",
  qc: "",
  imagemUrl: "",
};

export default function NovoPecaPage() {
  const router = useRouter();

  const [form, setForm] = useState<PecaForm>(initialForm);
  const [submitted, setSubmitted] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [generatedQc, setGeneratedQc] = useState("");

  function updateField(field: keyof PecaForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setSubmitted(false);
  }

  function handlePartNumberChange(value: string) {
    setForm((current) => ({
      ...current,
      partNumber: value,
      nome: "",
      fabricante: "",
    }));
    setGeneratedQc("");
    setSubmitted(false);
    setSearchError("");
  }

  async function searchPartNumber() {
    if (!form.partNumber.trim()) return;

    setSearching(true);
    setSearchError("");
    setSearchResults([]);

    try {
      const response = await fetch(`/api/partnumber?partNumber=${encodeURIComponent(form.partNumber)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível pesquisar o Part Number.");

      setSearchResults(data.results ?? []);
      const firstResult = data.results?.[0] as SearchResult | undefined;
      if (firstResult) {
        setForm((current) => ({
          ...current,
          nome: firstResult.name,
          fabricante: firstResult.manufacturer,
          imagemUrl: firstResult.imageUrl ?? "",
        }));
      }
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "Erro ao pesquisar o Part Number.");
    } finally {
      setSearching(false);
    }
  }

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const requiredFields: Array<[keyof PecaForm, string]> = [
      ["nome", "Nome"],
      ["fabricante", "Fabricante"],
      ["terminal", "Terminal"],
      ["tecnicoResponsavel", "Técnico Responsável"],
    ];
    const emptyField = requiredFields.find(([field]) => {
      const value = form[field];
      return typeof value !== "string" || !value.trim();
    });

    if (emptyField) {
      setSubmitted(false);
      setSearchError(`O campo ${emptyField[1]} é obrigatório.`);
      return;
    }

    setSearchError("");
    try {
      const response = await fetch("/api/pecas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: form.nome,
          serialNumber: form.serialNumber,
          fabricante: form.fabricante,
          localidade: form.localidade,
          terminal: form.terminal,
          tecnicoResponsavel: form.tecnicoResponsavel,
          partNumber: form.partNumber,
          dataChegada: form.dataChegada,
          situacaoAtual: form.situacaoAtual,
          imagemUrl: form.imagemUrl ?? "",
          dataSaida: form.dataSaida,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.erro ?? "Não foi possível salvar a peça.");
      setGeneratedQc(data.qc);
      setSubmitted(true);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "Não foi possível salvar no banco local.");
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <section className="mx-auto max-w-4xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-sky-700">ReeferConecta</p>
        <h1 className="mt-2 text-3xl font-bold">Cadastrar nova peça</h1>
        <p className="mt-2 text-slate-600">Preencha as informações da peça.</p>

        <form className="mt-8 grid gap-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm font-semibold">
            Nome
            <input className="rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100" required value={form.nome} onChange={(event) => updateField("nome", event.target.value)} />
          </label>

          <label className="grid gap-2 text-sm font-semibold">
            Serial Number
            <input className="rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100" required value={form.serialNumber} onChange={(event) => updateField("serialNumber", event.target.value)} />
          </label>

          <label className="grid gap-2 text-sm font-semibold">
            Fabricante
            <input className="rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100" required value={form.fabricante} onChange={(event) => updateField("fabricante", event.target.value)} />
          </label>

          <label className="grid gap-2 text-sm font-semibold">
            Terminal
            <input className="rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100" required value={form.terminal} onChange={(event) => updateField("terminal", event.target.value)} />
          </label>

          <label className="grid gap-2 text-sm font-semibold">
            Localidade
            <input className="rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100" required value={form.localidade} onChange={(event) => updateField("localidade", event.target.value)} />
          </label>


          <label className="grid gap-2 text-sm font-semibold">
            Técnico Responsável
            <input className="rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100" required value={form.tecnicoResponsavel} onChange={(event) => updateField("tecnicoResponsavel", event.target.value)} />
          </label>

          <label className="grid gap-2 text-sm font-semibold">
            Part Number
            <div className="flex gap-2">
              <input
                className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
                required
                value={form.partNumber}
                onChange={(event) => handlePartNumberChange(event.target.value)}
              />
              <button className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60" disabled={searching || !form.partNumber.trim()} onClick={searchPartNumber} type="button">
                {searching ? "Buscando..." : "Pesquisar"}
              </button>
            </div>
            <span className="font-normal text-slate-500">A busca consulta o banco local de Part Numbers.</span>
          </label>

          <label className="grid gap-2 text-sm font-semibold">
            Data de Chegada
            <input className="rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100" required type="date" value={form.dataChegada} onChange={(event) => updateField("dataChegada", event.target.value)} />
          </label>

          <label className="grid gap-2 text-sm font-semibold">
            Data de Saida
            <input className="rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100" required type="date" value={form.dataSaida} onChange={(event) => updateField("dataSaida", event.target.value)} />
          </label>

          <label className="grid gap-2 text-sm font-semibold md:col-span-2">
            Situação Atual
            <select className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100" required value={form.situacaoAtual} onChange={(event) => updateField("situacaoAtual", event.target.value)}>
              <option value="">Selecione uma situação</option>
              <option value="Disponível">Chego na central</option>
              <option value="Em uso">Em reparo</option>
              <option value="Em manutenção">Pronto para retirada</option>
              <option value="Indisponível">Sem condições de Reparo</option>
            </select>
          </label>

          {searchError && <p className="rounded-lg bg-amber-50 p-3 text-amber-800 md:col-span-2">{searchError}</p>}
          {searchResults.length > 0 && <div className="grid gap-3 rounded-lg bg-slate-50 p-4 md:col-span-2">
            <p className="text-sm font-semibold">Resultados encontrados</p>
            {searchResults.map((result, index) => <button className="text-left rounded-lg border border-slate-200 bg-white p-3 hover:border-sky-500" key={`${result.link}-${result.name}-${index}`} onClick={() => setForm((current) => ({ ...current, nome: result.name, fabricante: result.manufacturer, imagemUrl: result.imageUrl ?? "" }))} type="button">
              <span className="block font-semibold">{result.name}</span>
              {result.manufacturer && <span className="block text-sm text-slate-600">Fabricante: {result.manufacturer}</span>}
              <span className="mt-1 block text-sm text-slate-500">{result.snippet}</span>
            </button>)}
          </div>}

          {submitted && <p className="rounded-lg bg-emerald-50 p-3 text-emerald-700 md:col-span-2">Informações preenchidas com sucesso. QC gerado: <strong>{generatedQc}</strong></p>}

          <button className="rounded-lg bg-sky-700 px-4 py-3 font-semibold text-white transition hover:bg-sky-800 md:col-span-2" type="submit" onClick={() => router.push("/pecas")}>
            Cadastrar peça
          </button>
        </form>
      </section>
    </main>

  );
}
