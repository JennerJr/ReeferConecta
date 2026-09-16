"use client";

import { useState } from "react";

type ChartItem = {
  label: string;
  count: number;
};

type DashboardReportsTabsProps = {
  reportsBySector: ChartItem[];
  pieceCategories: ChartItem[];
};

const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#a855f7"];

function buildConicGradient(items: ChartItem[]) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  if (!total) return "conic-gradient(#475569 0 100%)";
  let start = 0;
  return `conic-gradient(${items.map((item, index) => {
    const end = start + (item.count / total) * 100;
    const stop = `${colors[index % colors.length]} ${start}% ${end}%`;
    start = end;
    return stop;
  }).join(", ")})`;
}

function ChartSummary({ items, total }: { items: ChartItem[]; total: number }) {
  return <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full" style={{ background: buildConicGradient(items) }}><div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">{total}</div></div>;
}

function ChartLegend({ items, total, includesPercentages }: { items: ChartItem[]; total: number; includesPercentages?: boolean }) {
  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2">{items.map((item, index) => <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-700 px-3 py-2" key={item.label}><span className="flex min-w-0 items-center gap-2 text-sm text-slate-200"><span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />{item.label}</span><span className="text-right text-sm text-slate-300"><strong className="text-white">{item.count}</strong>{includesPercentages && ` · ${total ? `${Math.round((item.count / total) * 100)}%` : "0%"}`}</span></div>)}</div>
  );
}

export default function DashboardReportsTabs({ reportsBySector, pieceCategories }: DashboardReportsTabsProps) {
  const [activeTab, setActiveTab] = useState<"sectors" | "pieces">("sectors");
  const totalReports = reportsBySector.reduce((sum, item) => sum + item.count, 0);
  const totalCategorizedPieces = pieceCategories.reduce((sum, item) => sum + item.count, 0);

  return (
    <section className="mt-8">
      <div className="flex border-b border-slate-700" role="tablist" aria-label="Relatórios do dashboard">
        <button className={`border-b-2 px-4 py-3 text-sm font-semibold ${activeTab === "sectors" ? "border-sky-500 text-white" : "border-transparent text-slate-400 hover:text-white"}`} id="sectors-tab" type="button" role="tab" aria-selected={activeTab === "sectors"} aria-controls="sectors-panel" onClick={() => setActiveTab("sectors")}>Relatórios por setor</button>
        <button className={`border-b-2 px-4 py-3 text-sm font-semibold ${activeTab === "pieces" ? "border-sky-500 text-white" : "border-transparent text-slate-400 hover:text-white"}`} id="pieces-tab" type="button" role="tab" aria-selected={activeTab === "pieces"} aria-controls="pieces-panel" onClick={() => setActiveTab("pieces")}>Relatório de Peças</button>
      </div>
      {activeTab === "sectors" && <section className="mt-6 min-w-0 rounded-xl border border-slate-700 bg-slate-900/70 p-5 sm:p-6" id="sectors-panel" role="tabpanel" aria-labelledby="sectors-tab">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0"><h2 className="text-xl font-semibold text-white">Relatórios por setor</h2><p className="mt-1 text-sm text-slate-400">Total: {totalReports} relatórios · Setores administrativos excluídos</p></div>
          <ChartSummary items={reportsBySector} total={totalReports} />
        </div>
        <ChartLegend items={reportsBySector} total={totalReports} />
      </section>}
      {activeTab === "pieces" && <section className="mt-6 min-w-0 rounded-xl border border-slate-700 bg-slate-900/70 p-5 sm:p-6" id="pieces-panel" role="tabpanel" aria-labelledby="pieces-tab">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0"><h2 className="text-xl font-semibold text-white">Relatório de Peças</h2><p className="mt-1 text-sm text-slate-400">Total: {totalCategorizedPieces} peças classificadas</p></div>
          <ChartSummary items={pieceCategories} total={totalCategorizedPieces} />
        </div>
        <ChartLegend items={pieceCategories} total={totalCategorizedPieces} includesPercentages />
      </section>}
    </section>
  );
}
