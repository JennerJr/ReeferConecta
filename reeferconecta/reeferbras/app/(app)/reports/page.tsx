"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type RepairReport = {
  id: string;
  responsavelReparo: string;
  descricaoReparo: string;
  situacaoAtual: string;
  ordemServico?: string;
  nomePeca: string;
  tecnicoResponsavel: string;
  resistencia?: string;
  surge?: string;
  mega?: string;
  simulador?: string;
  corrente?: string;
  transformador?: string;
  inspeçãoVisual?: string;
  serialNumberReport?: string;
  estatorTrocado?: string;
  scroll?: string;
  reparoFalange?: string;
  analiseMecanica?: string;
  testeFuncionamento?: string;
  outroTesteFuncionamento?: string;
  createdAt: string;
};

type ReportItem = RepairReport & {
  pieceId?: number | string;
  fabricante: string;
  pieceName: string;
  manufacturer: string;
  qc: string;
};

const situations = ["OK", "Sem condições de reparo"];

export default function ReportsPage() {
  const pageSize = 10;
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ responsavelReparo: "", ordemServico: "", descricaoReparo: "", situacaoAtual: "" });
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

function startEdit(report: ReportItem) {
  setEditError("");
  setEditForm({
    responsavelReparo: report.responsavelReparo ?? "",
    ordemServico: report.ordemServico ?? "",
    descricaoReparo: report.descricaoReparo ?? "",
    situacaoAtual: report.situacaoAtual ?? "",
  });
  setEditingId(report.id);
}

async function saveEdit(report: ReportItem) {
  if (!editForm.situacaoAtual) { setEditError("Informe a situação."); return; }
  if (editForm.ordemServico.trim() && !/^\d+$/.test(editForm.ordemServico.trim())) {
    setEditError("A OS, quando informada, deve ser numérica.");
    return;
  }
  setSavingEdit(true);
  setEditError("");
  try {
    const payload = {
      responsavelReparo: editForm.responsavelReparo.trim() || report.responsavelReparo,
      ordemServico: editForm.ordemServico.trim(),
      descricaoReparo: editForm.descricaoReparo,
      situacaoAtual: editForm.situacaoAtual,
    };
    const response = await fetch(`/api/reports/${report.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.erro ?? "Não foi possível salvar a edição.");
    setReports((current) => current.map((item) => item.id === report.id ? { ...item, ...payload } : item));
    setEditingId(null);
  } catch (requestError) {
    setEditError(requestError instanceof Error ? requestError.message : "Não foi possível salvar a edição.");
  } finally {
    setSavingEdit(false);
  }
}

  useEffect(() => {
    fetch("/api/reports")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.erro ?? "Não foi possível carregar os reports.");
        const allReports: ReportItem[] = data.reports ?? [];
        allReports.sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime());
        setReports(allReports);
      })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Erro ao carregar reports."))
      .finally(() => setLoading(false));
  }, []);

  const normalizedSearch = search.trim().toLowerCase();
  const filteredReports = reports.filter((report) => [
    report.responsavelReparo,
    report.fabricante,
    report.nomePeca,
    report.tecnicoResponsavel,
    report.descricaoReparo,
    report.situacaoAtual,
    report.resistencia,
    report.surge,
    report.mega,
    report.simulador,
    report.corrente,
    report.transformador,
    report.inspeçãoVisual,
    report.ordemServico,
    report.serialNumberReport,
    report.estatorTrocado,
    report.scroll,
    report.reparoFalange,
    report.analiseMecanica,
    report.testeFuncionamento,
    report.outroTesteFuncionamento,
    report.pieceName,
    report.manufacturer,
    report.qc,
  ].filter((value): value is string => Boolean(value)).some((value) => value.toLowerCase().includes(normalizedSearch)));
  const totalPages = Math.max(1, Math.ceil(filteredReports.length / pageSize));
  const visibleReports = filteredReports.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <main className="min-h-screen px-4 py-8 text-slate-900 sm:px-6 sm:py-10">
      <section className="mx-auto max-w-5xl">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div><p className="text-sm font-bold uppercase tracking-widest text-red-500">ReeferConecta</p><h1 className="mt-2 text-3xl font-bold text-white">Relatórios</h1><p className="mt-2 text-slate-300">Todos os relatórios realizados pelos usuários.</p></div>
          <div className="flex flex-wrap gap-2"><Link className="rounded-lg bg-sky-700 px-4 py-2 font-semibold text-white hover:bg-sky-800" href="/reports/novo">Novo Relatório</Link><Link className="rounded-lg bg-red-700 px-4 py-2 font-semibold text-white hover:bg-red-800" href="/reports/novo-sem-qc">Novo relatório sem QC</Link></div>
        </div>

        {!loading && !error && reports.length > 0 && <input className="mt-8 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-sky-600" type="search" placeholder="Buscar por usuário, peça, QC, situação ou descrição..." value={search} onChange={(event) => { setSearch(event.target.value); setCurrentPage(1); }} aria-label="Buscar relatórios" />}
        {loading && <p className="mt-8 text-slate-300">Carregando relatórios...</p>}
        {error && <p className="mt-8 rounded-lg bg-red-100 p-4 text-red-700">{error}</p>}
        {!loading && !error && reports.length === 0 && <p className="mt-8 rounded-lg bg-white p-6 text-slate-600">Nenhum relatório registrado.</p>}
        {!loading && !error && reports.length > 0 && filteredReports.length === 0 && <p className="mt-8 text-slate-300">Nenhum relatório encontrado para essa busca.</p>}

        <div className="mt-8 grid gap-4">
          {visibleReports.map((report) => <article className="rounded-lg border border-slate-700 bg-white p-4 shadow-sm sm:p-5" key={`${report.pieceId ?? "sem-peca"}-${report.id}`}>

  {/* 1. CABEÇALHO: fica fora do condicional */}
  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
    <div>
      <h2 className="font-bold text-slate-900">{report.pieceId ? `${report.fabricante} ${report.pieceName} ${report.manufacturer && `· ${report.manufacturer}`}` : `${report.fabricante ? `${report.fabricante} ` : ""}${report.nomePeca}`}</h2>
      <p className="mt-1 text-sm text-slate-600">{report.qc ? `QC: ${report.qc}` : `OS: ${report.ordemServico ?? "Não informada"}`}</p>
    </div>
    {report.pieceId && <Link className="text-sm font-semibold text-sky-700 hover:text-sky-900" href={`/pecas/${report.pieceId}/reports`}>Ver peça</Link>}
    {!report.pieceId && editingId !== report.id && (
      <button className="text-sm font-semibold text-sky-700 hover:text-sky-900" type="button" onClick={() => startEdit(report)}>Editar</button>
    )}
  </div>

  {editingId === report.id ? (
    /* MODO EDIÇÃO: formulário */
    <div className="mt-4 grid gap-3 text-sm text-slate-700">
      <label className="grid gap-1 font-semibold">Técnico responsável
        <input className="rounded-lg border border-slate-300 px-3 py-2 font-normal text-slate-900" value={editForm.responsavelReparo} onChange={(event) => setEditForm({ ...editForm, responsavelReparo: event.target.value })} />
      </label>
      <label className="grid gap-1 font-semibold">Ordem de serviço (opcional)
        <input className="rounded-lg border border-slate-300 px-3 py-2 font-normal text-slate-900" type="number" value={editForm.ordemServico} onChange={(event) => setEditForm({ ...editForm, ordemServico: event.target.value })} />
      </label>
      <label className="grid gap-1 font-semibold">Situação
        <select className="rounded-lg border border-slate-300 px-3 py-2 font-normal text-slate-900" value={editForm.situacaoAtual} onChange={(event) => setEditForm({ ...editForm, situacaoAtual: event.target.value })}>
          <option value=""></option>
          {situations.map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>
      <label className="grid gap-1 font-semibold">Descrição
        <textarea className="min-h-24 rounded-lg border border-slate-300 px-3 py-2 font-normal text-slate-900" value={editForm.descricaoReparo} onChange={(event) => setEditForm({ ...editForm, descricaoReparo: event.target.value })} />
      </label>
      {editError && <p className="rounded-lg bg-red-100 p-2 text-red-700">{editError}</p>}
      <div className="flex gap-2">
        <button className="rounded-lg bg-red-700 px-4 py-2 font-semibold text-white disabled:opacity-50" type="button" disabled={savingEdit} onClick={() => saveEdit(report)}>{savingEdit ? "Salvando..." : "Salvar"}</button>
        <button className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700" type="button" disabled={savingEdit} onClick={() => setEditingId(null)}>Cancelar</button>
      </div>
    </div>
  ) : (
          
            <>
            {/* 2. grid Usuário / Técnico / Situação */}
            <div className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2"><p><strong>Usuário:</strong> {report.tecnicoResponsavel}</p><p><strong>Técnico:</strong> {report.responsavelReparo}</p><p><strong>Situação:</strong> {report.situacaoAtual}</p></div>

            {/* 3. bloco de medições: copie o seu bloco original inteiro, sem alterar */}
            {(report.resistencia || report.surge || /* ... */ report.outroTesteFuncionamento) && <div className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
              {/* ... os <p> de Resistência, Surge, etc. ... */}
            </div>}

            {/* 4. descrição e data */}
            {report.descricaoReparo && <p className="mt-3 whitespace-pre-wrap text-slate-800"><strong>Descrição:</strong> {report.descricaoReparo}</p>}
            <p className="mt-3 text-xs text-slate-500">{new Date(report.createdAt).toLocaleString("pt-BR")}</p>
            </>
          )}
        </article>)}
        </div>

        {totalPages > 1 && <nav className="mt-8 flex items-center justify-center gap-4" aria-label="Paginação dos relatórios"><button className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50" type="button" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => page - 1)}>Anterior</button><span className="text-sm text-slate-300">Página {currentPage} de {totalPages}</span><button className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50" type="button" disabled={currentPage === totalPages} onClick={() => setCurrentPage((page) => page + 1)}>Próxima</button></nav>}
      </section>
    </main>
  );
}
