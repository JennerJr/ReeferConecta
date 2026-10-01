"use client";

import { useEffect, useRef, useState } from "react";
import { canManagePieces } from "@/lib/authorization";
import { printPieceLabels } from "@/lib/labels";
import carrierParts from "@/data/carrier.json";
import daikinParts from "@/data/daikin.json";
import starcoolParts from "@/data/starcool.json";
import thermokingParts from "@/data/thermoking.json";
import reeferbrasfunc from "@/data/reeferbrasfunc.json";
import { useRouter } from "next/navigation";  

type BarcodeDetectorResult = { rawValue: string };
type BarcodeDetectorInstance = { detect(source: HTMLVideoElement): Promise<BarcodeDetectorResult[]> };
type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BarcodeDetectorInstance;

const barcodeFormats = ["qr_code", "code_128", "code_39", "code_93", "codabar", "ean_13", "ean_8", "itf", "upc_a", "upc_e"];

type PieceForm = {
  nome: string;
  serialNumber: string;
  fabricante: string;
  localidade: string;
  tecnicoResponsavel: string;
  situacaoAtual: string;
  deliveredBy: string;
  imagemUrl: string;
};


type CatalogPart = {
  linha: string;
  componente: string;
  descricao: string;
  imagem?: string;
};

type dados ={
Localidade: string;
funcionario: string[];
};

const partsByManufacturer: Record<string, CatalogPart[]> = {
  Carrier: carrierParts,
  Daikin: daikinParts,
  "Star Cool": starcoolParts,
  "Thermo King": thermokingParts,
};
const funcByRegiao: dados[] = reeferbrasfunc;

const localidades = [...new Set(funcByRegiao.map((r) => r.Localidade)), "Santos/SP"];


const situations = [
  ["ReparoComum", "Em reparo - Devolver para o mesmo"],
  ["ReparoTroca", "Em reparo - Estoque"],
  ["ReparoIncomum", "Em reparo - Entregue por:"],
] as const;

function createInitialForm(): PieceForm {
  return {
    nome: "",
    serialNumber: "",
    fabricante: "",
    localidade: "",
    tecnicoResponsavel: "",
    situacaoAtual: "",
    deliveredBy: "",
    imagemUrl: "",
  };
}

function getCurrentDateTimeLocal() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}


export default function NovoPecaPage() {
  const router = useRouter();
  const [pieceCount, setPieceCount] = useState(1);
  const [forms, setForms] = useState<PieceForm[]>([createInitialForm()]);
  const [submitted, setSubmitted] = useState(false);
  const [localidade, setLocalidade] = useState("");
  const [generatedQcs, setGeneratedQcs] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [printingLabels, setPrintingLabels] = useState(false);  
  const [scannerIndex, setScannerIndex] = useState<number | null>(null);
  const [scannerError, setScannerError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  
const funcionarios = funcByRegiao
      .filter((r) => r.Localidade === localidade)
      .flatMap((f) => f.funcionario); 

  useEffect(() => {
    fetch("/api/auth/session")
      .then((response) => response.json())
      .then((data) => setAuthorized(canManagePieces(data.user?.role)))
      .catch(() => setAuthorized(false));
  }, []);

  useEffect(() => {
    if (scannerIndex === null) return;

    const targetIndex = scannerIndex;
    const videoElement = videoRef.current;
    let active = true;
    let animationFrame = 0;
    let stream: MediaStream | undefined;
    let stopFallbackScanner: (() => void) | undefined;
    const detectorConstructor = (window as Window & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;

    async function startNativeScanner(Detector: BarcodeDetectorConstructor) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (!active || !videoElement) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const video = videoElement;
        video.srcObject = stream;
        await video.play();
        const detector = new Detector({ formats: barcodeFormats });

        const scan = async () => {
          if (!active) return;
          try {
            const detected = await detector.detect(video);
            const value = detected.find((item) => item.rawValue.trim())?.rawValue.trim();
            if (value) {
              updateField(targetIndex, "serialNumber", value);
              setScannerIndex(null);
              return;
            }
          } catch {
            // A frame can fail while the camera is focusing; keep scanning.
          }
          if (active) animationFrame = requestAnimationFrame(() => { void scan(); });
        };
        animationFrame = requestAnimationFrame(() => { void scan(); });
      } catch (requestError) {
        if (active) {
          setScannerError(requestError instanceof DOMException && requestError.name === "NotAllowedError"
            ? "Permita o acesso à câmera para ler o código."
            : "Não foi possível iniciar a câmera.");
        }
      }
    }

    async function startFallbackScanner() {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        if (!active || !videoElement) return;

        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } }, audio: false },
          videoElement,
          (result, _error, scannerControls) => {
            if (!active) return;

            const value = result?.getText().trim();
            if (value) {
              scannerControls.stop();
              updateField(targetIndex, "serialNumber", value);
              setScannerIndex(null);
            }
          },
        );
        stopFallbackScanner = controls.stop;
        if (!active) controls.stop();
      } catch (requestError) {
        if (active) {
          setScannerError(requestError instanceof DOMException && requestError.name === "NotAllowedError"
            ? "Permita o acesso à câmera para ler o código."
            : "Não foi possível iniciar a câmera.");
        }
      }
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      void Promise.resolve().then(() => {
        if (active) setScannerError("A câmera não está disponível neste dispositivo ou contexto.");
      });
    } else if (detectorConstructor) {
      void startNativeScanner(detectorConstructor);
    } else {
      void startFallbackScanner();
    }

    return () => {
      active = false;
      cancelAnimationFrame(animationFrame);
      stopFallbackScanner?.();
      stream?.getTracks().forEach((track) => track.stop());
      if (videoElement) videoElement.srcObject = null;
    };
  }, [scannerIndex]);

  function changePieceCount(value: number) {
    const nextCount = Math.min(50, Math.max(0, value || 0));
    setPieceCount(nextCount);
    setForms((currentForms) => Array.from({ length: nextCount }, (_, index) => currentForms[index] ?? createInitialForm()));
    setSubmitted(false);
    setGeneratedQcs([]);
  }

  const nonRepeatingFields: Array<keyof PieceForm> = ["serialNumber", "imagemUrl", "deliveredBy"];

  function updateField(index: number, field: keyof PieceForm, value: string) {
    setForms((currentForms) => currentForms.map((form, formIndex) => {
      if (formIndex === index) return { ...form, [field]: value };
      if (index === 0 && !nonRepeatingFields.includes(field)) return { ...form, [field]: value };
      return form;
    }));
    setSubmitted(false);
  }

  function handleSerialNumberKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === "Tab") {
      const scannedValue = event.currentTarget.value.trim();
      if (scannedValue) {
        updateField(index, "serialNumber", scannedValue);
      }
      event.preventDefault();
    }
  }

  function openScanner(index: number) {
    setScannerError("");
    setScannerIndex(index);
  }

  function handleManufacturerChange(index: number, value: string) {
    setForms((currentForms) => currentForms.map((form, formIndex) => {
      if (formIndex === index) return { ...form, fabricante: value, nome: "", imagemUrl: "" };
      if (index === 0) return { ...form, fabricante: value, nome: "" };
      return form;
    }));
    setSubmitted(false);
  }

  function handlePartNameChange(index: number, value: string) {
    const selectedManufacturer = forms[index]?.fabricante;
    const selectedPart = (partsByManufacturer[selectedManufacturer] ?? []).find((part) => part.descricao === value);
    setForms((currentForms) => currentForms.map((form, formIndex) => {
      if (formIndex === index) return { ...form, nome: value, imagemUrl: selectedPart?.imagem ?? "" };
      if (index === 0) return { ...form, nome: value };
      return form;
    }));
    setSubmitted(false);
  }

  function handleSituationChange(index: number, value: string) {
    setForms((currentForms) => currentForms.map((form, formIndex) => {
      if (formIndex === index) return { ...form, situacaoAtual: value, deliveredBy: value === "ReparoIncomum" ? form.deliveredBy : "" };
      if (index === 0) return { ...form, situacaoAtual: value };
      return form;
    }));
    setSubmitted(false);
  }

  function selectImage(index: number, file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Selecione um arquivo de imagem válido.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const maxSize = 1200;
        const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext("2d");
        if (!context) {
          setError("Não foi possível processar a imagem.");
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        updateField(index, "imagemUrl", canvas.toDataURL("image/jpeg", 0.82));
      };
      image.onerror = () => setError("Não foi possível carregar a imagem.");
      image.src = String(reader.result);
    };
    reader.onerror = () => setError("Não foi possível ler a imagem.");
    reader.readAsDataURL(file);
  }

  async function handlePrintLabels(qcs: string[]) {
    if (qcs.length === 0) return;
    setPrintingLabels(true);
    try {
      await printPieceLabels(qcs);
    } catch (printError) {
      setError(printError instanceof Error ? printError.message : "Não foi possível gerar as etiquetas.");
    } finally {
      setPrintingLabels(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitted(false);
    setSaving(true);

    try {
      for (const [index, form] of forms.entries()) {
        const requiredFields: Array<[keyof PieceForm, string]> = [
          ["nome", "Nome"],
          ["fabricante", "Fabricante"],
          ["localidade", "Localidade"],
          ["tecnicoResponsavel", "Técnico Responsável"],
          ["situacaoAtual", "Situação Atual"],
        ];
        const emptyField = requiredFields.find(([field]) => !form[field].trim());
        if (emptyField) throw new Error(`Peça ${index + 1}: o campo ${emptyField[1]} é obrigatório.`);
        if (form.situacaoAtual === "ReparoIncomum" && !form.deliveredBy.trim()) {
          throw new Error(`Peça ${index + 1}: informe quem entregou a peça.`);
        }
      }

      

      const qcs: string[] = [];
      for (const form of forms) {
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
            situacaoAtual: form.situacaoAtual === "ReparoIncomum"
              ? `Em reparo - Entregue por: ${form.deliveredBy.trim()}`
              : situations.find(([value]) => value === form.situacaoAtual)?.[1] ?? form.situacaoAtual,
            imagemUrl: form.imagemUrl,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.erro ?? "Não foi possível salvar uma das peças.");
        qcs.push(data.qc);
      }

      setGeneratedQcs(qcs);
      setSubmitted(true);
      await handlePrintLabels(qcs);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível salvar as peças.");
    } finally {
      setSaving(false);
    }
  }

  if (authorized === false) return <main className="min-h-screen bg-gray-800 px-4 py-8 text-white">Entrada não autorizada</main>;
  if (authorized === null) return <main className="min-h-screen bg-gray-800 px-4 py-8 text-white">Carregando...</main>;

  return (
    <main className="min-h-screen bg-gray-800 px-4 py-8 text-slate-900 sm:px-6 sm:py-10">
      <section className="mx-auto max-w-4xl">
        <p className="bg-gradient-to-br from-[#E8262C] to-[#B32025] bg-clip-text text-transparent text-sm font-bold uppercase tracking-widest">ReeferConecta</p>
        <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Cadastrar novas peças</h1>
        <p className="mt-2 text-white">Preencha os dados de cada peça para cadastrar várias no mesmo envio.</p>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <label className="grid max-w-xs gap-2 text-sm font-semibold text-slate-200">
            Quantidade de peças
            <input className="rounded-lg border border-slate-300 px-3 py-2 font-normal text-white outline-none" type="number" min="0" max="50" value={pieceCount} onChange={(event) => changePieceCount(Number(event.target.value))} required />
          </label>
          <label>
            {pieceCount >= 2 && (
              <button className="w-full rounded-lg bg-gradient-to-br from-[#E8262C] to-[#B32025] px-4 py-3 grid gap-2 font-semibold text-white transition hover:brightness-110 disabled:opacity-50" onClick={() => router.push('/pecas')} disabled={saving} type="submit">{saving ? `Cadastrando ${pieceCount} peças...` : `Cadastrar ${pieceCount} peças`} </button>
            )}
          </label>
          {forms.map((form, index) => (
            <section className="grid min-w-0 gap-5 rounded-xl border border-slate-700 bg-gray-800 p-4 shadow-sm sm:p-6 md:grid-cols-2" key={index}>
              <h2 className="text-xl font-semibold text-white md:col-span-2">Peça {index + 1}</h2>
              <label className="grid gap-2 text-sm font-semibold text-slate-200">Fabricante
                <select className="rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none" required value={form.fabricante} onChange={(event) => handleManufacturerChange(index, event.target.value)}>
                  <option value="">Selecione um fabricante</option>
                  {Object.keys(partsByManufacturer).map((manufacturer) => <option className="text-black" key={manufacturer} value={manufacturer}>{manufacturer}</option>)}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-200">Nome da peça
                <select className="rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none" required disabled={!form.fabricante} value={form.nome} onChange={(event) => handlePartNameChange(index, event.target.value)}>
                  <option value="">{form.fabricante ? "Selecione uma peça" : "Selecione primeiro o fabricante"}</option>
                  {(partsByManufacturer[form.fabricante] ?? []).map((part) => <option className="text-black" key={`${part.descricao}-${part.componente}`} value={part.descricao}>{part.descricao}</option>)}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-200">Serial Number
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none"
                    value={form.serialNumber}
                    onFocus={(event) => event.target.select()}
                    onKeyDown={(event) => handleSerialNumberKeyDown(index, event)}
                    onChange={(event) => updateField(index, "serialNumber", event.target.value)}
                    placeholder="Leia o código de barras ou digite o serial"
                  />
                  <button className="shrink-0 rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-800" type="button" onClick={() => openScanner(index)}>
                    Ler código
                  </button>
                </div>
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-200">Localidade
                <select className="rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none" required value={form.localidade} onChange={(event) => { updateField(index, "localidade", event.target.value); setLocalidade(event.target.value); }}>
                  <option value="">Selecione uma localidade</option>
                  {localidades.map((loc) => <option className="text-black" key={loc} value={loc}>{loc}</option>)}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-semibold text-slate-200">Técnico Responsável
                {form.localidade === "Santos/SP" ? (
                  <input
                    className="rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none"
                    required
                    value={form.tecnicoResponsavel}
                    onChange={(event) => updateField(index, "tecnicoResponsavel", event.target.value)}
                    placeholder="Digite o nome do funcionário"
                  />
                ) : (
                  <select className="rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none" required value={form.tecnicoResponsavel} onChange={(event) => { updateField(index, "tecnicoResponsavel", event.target.value); }}>
                    <option value="">Selecione um técnico</option>
                    {funcionarios.map((func) => <option className="text-black" key={func} value={func}>{func}</option>)}
                  </select>
                )}
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-200 md:col-span-2">Situação Atual
                <select className="rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none" required value={form.situacaoAtual} onChange={(event) => handleSituationChange(index, event.target.value)}>
                  <option value="">Selecione uma situação</option>
                  {situations.map(([value, label]) => <option className="text-black" key={value} value={value}>{label}</option>)}
                </select>
              </label>
              {form.situacaoAtual === "ReparoIncomum" && <label className="grid gap-2 text-sm font-semibold text-slate-200 md:col-span-2">Nome de quem entregou
                <input className="rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none" required value={form.deliveredBy} onChange={(event) => updateField(index, "deliveredBy", event.target.value)} placeholder="Digite o nome" />
              </label>}
              <div className="grid gap-3 text-sm font-semibold text-slate-200 md:col-span-2">
                <span>Imagem da peça</span>
                <div className="flex flex-wrap gap-3">
                  <label className="cursor-pointer rounded-lg border border-slate-400 px-4 py-2 text-center font-semibold text-white hover:bg-slate-700">
                    Escolher imagem
                    <input className="sr-only" type="file" accept="image/*" onChange={(event) => selectImage(index, event.target.files?.[0])} />
                  </label>
                  <label className="cursor-pointer rounded-lg border border-sky-400 px-4 py-2 text-center font-semibold text-sky-200 hover:bg-sky-900/40">
                    Tirar foto
                    <input className="sr-only" type="file" accept="image/*" capture="environment" onChange={(event) => selectImage(index, event.target.files?.[0])} />
                  </label>
                </div>
                {form.imagemUrl && <img className="h-32 w-32 rounded-lg border border-slate-600 object-cover" src={form.imagemUrl} alt={`Prévia da imagem da peça ${index + 1}`} />}
              </div>
            </section>
          ))}

          {error && <p className="rounded-lg bg-amber-50 p-3 text-amber-800">{error}</p>}
          {submitted && (
            <div className="grid gap-3 rounded-lg bg-emerald-50 p-3 text-emerald-700">
              <p>{generatedQcs.length} peças cadastradas com sucesso. QCs gerados: <strong>{generatedQcs.join(", ")}</strong></p>
              <button
                className="w-fit rounded-lg border border-emerald-600 px-4 py-2 font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                type="button"
                disabled={printingLabels}
                onClick={() => handlePrintLabels(generatedQcs)}
              >
                {printingLabels ? "Gerando etiquetas..." : "Imprimir etiquetas novamente"}
              </button>
            </div>
          )}
          <button className="w-full rounded-lg bg-gradient-to-br from-[#E8262C] to-[#B32025] px-4 py-3 font-semibold text-white transition hover:brightness-110 disabled:opacity-50" onClick={() => router.push('/pecas')} disabled={saving} type="submit">{saving ? `Cadastrando ${pieceCount} peças...` : `Cadastrar ${pieceCount} peças`} </button>
        </form>
      </section>
      {scannerIndex !== null && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="scanner-title">
        <div className="w-full max-w-lg rounded-xl border border-slate-600 bg-gray-800 p-5 shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white" id="scanner-title">Ler serial da peça {scannerIndex + 1}</h2>
              <p className="mt-1 text-sm text-slate-300">Aponte a câmera para o código de barras ou QR code.</p>
            </div>
            <button className="text-2xl leading-none text-slate-300 hover:text-white" type="button" onClick={() => setScannerIndex(null)} aria-label="Fechar leitor">×</button>
          </div>
          <video className="mt-4 aspect-video w-full rounded-lg bg-black object-cover" ref={videoRef} autoPlay muted playsInline />
          {scannerError && <p className="mt-3 rounded-lg bg-red-100 p-3 text-sm text-red-700">{scannerError}</p>}
          <button className="mt-4 w-full rounded-lg border border-slate-500 px-4 py-2 font-semibold text-white hover:bg-slate-700" type="button" onClick={() => setScannerIndex(null)}>
            Fechar
          </button>
        </div>
      </div>}
    </main>
  );
}