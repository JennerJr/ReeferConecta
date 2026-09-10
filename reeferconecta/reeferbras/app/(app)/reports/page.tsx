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
  pieceName: string;
  manufacturer: string;
  qc: string;
};

export default function ReportsPage() {
  const pageSize = 10;
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

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
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start"><div><h2 className="font-bold text-slate-900">{report.pieceId ? `${report.pieceName} ${report.manufacturer && `· ${report.manufacturer}`}` : report.nomePeca}</h2><p className="mt-1 text-sm text-slate-600">{report.qc ? `QC: ${report.qc}` : `OS: ${report.ordemServico ?? "Não informada"}`}</p></div>{report.pieceId && <Link className="text-sm font-semibold text-sky-700 hover:text-sky-900" href={`/pecas/${report.pieceId}/reports`}>Ver peça</Link>}</div>
            <div className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2"><p><strong>Usuário:</strong> {report.responsavelReparo}</p><p><strong>Técnico:</strong> {report.tecnicoResponsavel}</p><p><strong>Situação:</strong> {report.situacaoAtual}</p></div>
            {(report.resistencia || report.surge || report.mega || report.simulador || report.corrente || report.transformador || report.inspeçãoVisual || report.ordemServico || report.serialNumberReport || report.estatorTrocado || report.scroll || report.reparoFalange || report.analiseMecanica || report.testeFuncionamento || report.outroTesteFuncionamento) && <div className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
              {report.resistencia && <p><strong>Resistência:</strong> {report.resistencia}</p>}
              {report.surge && <p><strong>Surge:</strong> {report.surge}</p>}
              {report.mega && <p><strong>Mega:</strong> {report.mega}</p>}
              {report.simulador && <p><strong>Simulador:</strong> {report.simulador}</p>}
              {report.corrente && <p><strong>Corrente:</strong> {report.corrente}</p>}
              {report.transformador && <p><strong>Transformador:</strong> {report.transformador}</p>}
              {report.inspeçãoVisual && <p><strong>Inspeção visual:</strong> {report.inspeçãoVisual}</p>}
              {report.ordemServico && <p><strong>Ordem de serviço:</strong> {report.ordemServico}</p>}
              {report.serialNumberReport && <p><strong>Serial number:</strong> {report.serialNumberReport}</p>}
              {report.estatorTrocado && <p><strong>Estator trocado:</strong> {report.estatorTrocado}</p>}
              {report.scroll && <p><strong>SCROLL:</strong> {report.scroll}</p>}
              {report.reparoFalange && <p><strong>Reparo da falange:</strong> {report.reparoFalange}</p>}
              {report.analiseMecanica && <p><strong>Análise mecânica:</strong> {report.analiseMecanica}</p>}
              {report.testeFuncionamento && <p><strong>Teste de funcionamento:</strong> {report.testeFuncionamento}</p>}
              {report.outroTesteFuncionamento && <p><strong>Outro teste:</strong> {report.outroTesteFuncionamento}</p>}
            </div>}
            {report.descricaoReparo && <p className="mt-3 whitespace-pre-wrap text-slate-800"><strong>Descrição:</strong> {report.descricaoReparo}</p>}
            <p className="mt-3 text-xs text-slate-500">{new Date(report.createdAt).toLocaleString("pt-BR")}</p>
          </article>)}
        </div>

        {totalPages > 1 && <nav className="mt-8 flex items-center justify-center gap-4" aria-label="Paginação dos relatórios"><button className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50" type="button" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => page - 1)}>Anterior</button><span className="text-sm text-slate-300">Página {currentPage} de {totalPages}</span><button className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50" type="button" disabled={currentPage === totalPages} onClick={() => setCurrentPage((page) => page + 1)}>Próxima</button></nav>}
      </section>
    </main>
  );
}
