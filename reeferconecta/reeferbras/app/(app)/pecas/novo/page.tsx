"use client";

import { useState } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { canManagePieces } from "@/lib/authorization";
import carrierParts from "@/data/carrier.json";
import daikinParts from "@/data/daikin.json";
import starcoolParts from "@/data/starcool.json";
import thermokingParts from "@/data/thermoking.json";

type PecaForm = {
  id: string;  
  dataChegada: string;
  nome: string;
  serialNumber: string;
  fabricante: string;
  localidade: string;
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

type CatalogPart = {
  linha: string;
  componente: string;
  descricao: string;
  imagem: string;
};

const partsByManufacturer: Record<string, CatalogPart[]> = {
  Carrier: carrierParts,
  Daikin: daikinParts,
  "Star Cool": starcoolParts,
  "Thermo King": thermokingParts,
};


const initialForm: PecaForm = {
  id:"",  
  dataChegada: "",
  nome: "",
  serialNumber: "",
  fabricante: "",
  localidade: "",
  tecnicoResponsavel: "",
  dataSaida: "",
  situacaoAtual: "",
  qc: "",
  imagemUrl: "",
};

function getCurrentDateTimeLocal() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export default function NovoPecaPage() {
  const router = useRouter();

  const [form, setForm] = useState<PecaForm>(initialForm);
  const [submitted, setSubmitted] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [generatedQc, setGeneratedQc] = useState("");
  const [deliveredBy, setDeliveredBy] = useState("");
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((response) => response.json())
      .then((data) => setAuthorized(canManagePieces(data.user?.role)))
      .catch(() => setAuthorized(false));
  }, []);

  function updateField(field: keyof PecaForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setSubmitted(false);
  }

  function handleManufacturerChange(value: string) {
    setForm((current) => ({
      ...current,
      fabricante: value,
      nome: "",
      imagemUrl: "",
    }));
    setSubmitted(false);
  }

  function handlePartNameChange(value: string) {
    const selectedPart = (partsByManufacturer[form.fabricante] ?? []).find(
      (part) => part.descricao === value,
    );
    setForm((current) => ({
      ...current,
      nome: value,
      imagemUrl: selectedPart?.imagem ?? "",
    }));
    setSubmitted(false);
  }

  function handleSituationChange(value: string) {
    updateField("situacaoAtual", value);
    if (value !== "ReparoIncomum") setDeliveredBy("");
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


  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const requiredFields: Array<[keyof PecaForm, string]> = [
      ["nome", "Nome"],
      ["fabricante", "Fabricante"],
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
          tecnicoResponsavel: form.tecnicoResponsavel,
          dataChegada: getCurrentDateTimeLocal(),
          situacaoAtual:
            form.situacaoAtual === "ReparoIncomum"
              ? `Em reparo - Entregue por: ${deliveredBy.trim()}`
              : form.situacaoAtual,
          imagemUrl: form.imagemUrl ?? "",
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

  if (authorized === false) {
    return <main className="min-h-screen bg-gray-800 px-4 py-8 text-white sm:px-6 sm:py-10">entrada não autorizada</main>;
  }

  if (authorized === null) {
    return <main className="min-h-screen bg-gray-800 px-4 py-8 text-white sm:px-6 sm:py-10">Carregando...</main>;
  }

  return (
    <main className="min-h-screen bg-gray-800 px-4 py-8 text-slate-900 sm:px-6 sm:py-10">
      <section className="mx-auto max-w-4xl">
        <p className="bg-gradient-to-br from-[#E8262C] to-[#B32025] bg-clip-text text-transparent text-sm font-bold uppercase tracking-widest">ReeferConecta</p>
        <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Cadastrar nova peça</h1>
        <p className="mt-2 text-slate-600 text-white">Preencha as informações da peça.</p>

        <form className="mt-8 grid min-w-0 gap-5 rounded-xl border border-slate-700 bg-gray-800 p-4 shadow-sm sm:p-6 md:grid-cols-2" onSubmit={handleSubmit}>
          
          <label className="grid gap-2 text-sm font-semibold text-slate-200">
            Fabricante
            <select className="rounded-lg border border-slate-300  px-3 py-2 font-normal outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100" required value={form.fabricante} onChange={(event) => handleManufacturerChange(event.target.value)}>
              <option className="text-black" value="">Selecione um fabricante</option>
              <option className="text-black" value="Carrier">Carrier</option>
              <option className="text-black" value="Daikin">Daikin</option>
              <option className="text-black" value="Star Cool">Star Cool</option>
              <option className="text-black" value="Thermo King">Thermo King</option>              
            </select>
          </label>
          
          <label className="grid gap-2 text-sm font-semibold text-slate-200">
            Nome da peça
            <select className="rounded-lg border border-slate-300  px-3 py-2 font-normal outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100" required disabled={!form.fabricante || !(partsByManufacturer[form.fabricante]?.length)} value={form.nome} onChange={(event) => handlePartNameChange(event.target.value)}>
              <option value="">
                {form.fabricante ? "Selecione uma peça" : "Selecione primeiro o fabricante"}
              </option>
              {(partsByManufacturer[form.fabricante] ?? []).map((part) => (
                <option className="text-black" key={`${part.descricao}-${part.componente}`} value={part.descricao}>
                  {part.descricao}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-200">
            Serial Number
            <input className="rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100" required value={form.serialNumber} onChange={(event) => updateField("serialNumber", event.target.value)} />
          </label>

          <label className="grid gap-2 text-sm text-slate-200 font-semibold md:col-span-2">
            Localidade
            <select className="rounded-lg border border-slate-300  px-3 py-2 font-normal outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100" required value={form.localidade} onChange={(event) => updateField("localidade", event.target.value)}>
                            <option className="text-black" value="">Selecione uma localidade</option>
              <option className="text-black" value="Santos">Santos</option>
              <option className="text-black" value="Itajaí">Itajaí</option>
              <option className="text-black" value="Paranaguá">Paranaguá</option>
              <option className="text-black" value="Guarujá">Guarujá</option>
              <option className="text-black" value="Rio Grande">Rio Grande</option>
              
            </select>
          </label>


          <label className="grid gap-2 text-sm font-semibold text-slate-200">
            Técnico Responsável
            <input className="rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100" required value={form.tecnicoResponsavel} onChange={(event) => updateField("tecnicoResponsavel", event.target.value)} />
          </label>
          
          <label className="grid gap-2 text-sm text-slate-200 font-semibold md:col-span-2">
            Situação Atual
            <select className="rounded-lg border  border-slate-300  px-3 py-2 font-normal outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100" required value={form.situacaoAtual} onChange={(event) => handleSituationChange(event.target.value)}>
              <option className="text-black" value="">Selecione uma situação</option>
              <option className="text-black" value="ReparoComum">Em reparo - Devolver para o mesmo</option>
              <option className="text-black" value="ReparoTroca">Em reparo - Estoque</option>
              <option className="text-black" value="ReparoIncomum">Em reparo - Entregue por:</option>
            </select>
          </label>
          {form.situacaoAtual === "ReparoIncomum" && (
            <label className="grid gap-2 text-sm text-slate-200 font-semibold md:col-span-2">
              Nome de quem entregou
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
                required
                value={deliveredBy}
                onChange={(event) => {
                  setDeliveredBy(event.target.value);
                  setSubmitted(false);
                }}
                placeholder="Digite o nome"
              />
            </label>
          )}

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

          <button className="w-full rounded-lg bg-gradient-to-br from-[#E8262C] to-[#B32025] px-4 py-3 font-semibold text-white transition hover:brightness-110 md:col-span-2" type="submit" onClick={() => router.push("/pecas")} >
            Cadastrar peça
          </button>
        </form>
      </section>
    </main>

  );
}
