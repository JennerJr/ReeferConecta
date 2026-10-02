'use client';
import { useEffect, useState } from "react";
import Link from "next/link";
import { getChamadoStatusBadgeClass, getChamadoStatusColor } from "@/lib/chamado-status";

type chamado ={
    id: string;
    titulo: string;
    descricao: string;
    status: string;
    pedidoPor:string,
    criadoEm: string;
}

function formatArrivalDate(value?: string) {
  if (!value) return "não informada";
  const [date] = value.split("T");
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

// Mapeia a cor do status para uma categoria de ordenação/filtro: abertos primeiro, depois ok, por último o resto.
function getStatusCategory(status?: string): "aberto" | "ok" | "naoRealizado" | "outro" {
  const color = getChamadoStatusColor(status);
  if (color === "yellow") return "aberto";
  if (color === "green") return "ok";
  if (color === "red") return "naoRealizado";
  return "outro";
}

const sortPriority: Record<ReturnType<typeof getStatusCategory>, number> = {
  aberto: 0,
  ok: 1,
  naoRealizado: 2,
  outro: 2,
};

function sortChamados(list: chamado[]) {
  return [...list].sort((first, second) => {
    const priorityDiff = sortPriority[getStatusCategory(first.status)] - sortPriority[getStatusCategory(second.status)];
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(first.criadoEm).getTime() - new Date(second.criadoEm).getTime();
  });
}

const statusFilters = [
  { value: "aberto", label: "Abertos", className: "bg-yellow-100 text-yellow-700" },
  { value: "ok", label: "OK", className: "bg-emerald-100 text-emerald-700" },
  { value: "naoRealizado", label: "Não realizado", className: "bg-red-100 text-red-700" },
] as const;


export default function ChamadosPage() {
    const pageSize = 10;
    const [chamados, setChamados] = useState<chamado[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("todos");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
            fetch('/api/chamados')
            .then(async (response) => {
                const data = await response.json();
                if (!response.ok) throw new Error( data.erro ?? 'não foi possível carregar os chamados');
                const normalized: chamado[] = Array.isArray(data) ? data : (data.data ?? data.chamados ?? data.dados ?? []);
                setChamados(sortChamados(normalized));
                })
                .catch((requestError) => setError(requestError instanceof Error? requestError.message:'Erro ao carregar os chamados'))
                .finally(() => setLoading(false));
            }, []);
            const normalizedSearch = search.trim().toLowerCase();
            const filteredChamados  = chamados.filter((chamado) => (statusFilter === "todos" || getStatusCategory(chamado.status) === statusFilter) && [
                chamado.titulo,
                chamado.descricao,
                chamado.status,
                chamado.pedidoPor,
                chamado.criadoEm,
            ].filter((value): value is string => Boolean(value)).some((value) => value.toLowerCase().includes(normalizedSearch)));
            const totalPages = Math.max(1, Math.ceil(filteredChamados.length/pageSize));
            const visibleChamados = filteredChamados.slice((currentPage - 1) * pageSize, currentPage * pageSize);
                
    return (
        <main className="min-h-screen px-4 py-8 text-slate-900 sm:px-6 sm:py-10">
            <section className="mx-auto max-w-5xl">
                <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                    <div><p className="text-sm font-bold uppercase tracking-widest text-red-500">ReeferConecta</p><h1 className="mt-2 text-3xl font-bold text-white">Chamados</h1><p className="mt-2 text-slate-300">Todos os chamados realizados pelos usuários.</p></div>
                    <div className="flex flex-wrap gap-2">
                    <Link className="rounded-lg bg-sky-700 px-4 py-2 font-semibold text-white hover:bg-sky-800" href="/chamados/novo">Novo chamado</Link></div>
                </div>

            {!loading && !error && chamados.length > 0 && <input className="mt-8 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-sky-600" type="search" placeholder="Buscar por usuário, peça, QC, situação ou descrição..." value={search} onChange={(event) => { setSearch(event.target.value); setCurrentPage(1); }} aria-label="Buscar relatórios" />}
            {!loading && !error && chamados.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700" type="button" onClick={() => { setStatusFilter("todos"); setCurrentPage(1); }}>Todos</button>
                {statusFilters.map((filter) => (
                  <button className={`rounded-full px-3 py-1 text-xs font-semibold ${filter.className} ${statusFilter === filter.value ? "ring-2 ring-offset-1 ring-offset-slate-900 ring-sky-400" : ""}`} key={filter.value} type="button" onClick={() => { setStatusFilter(filter.value); setCurrentPage(1); }}>{filter.label}</button>
                ))}
              </div>
            )}
            {loading && <p className="mt-8 text-slate-300">Carregando chamados...</p>}
            {error && <p className="mt-8 rounded-lg bg-red-100 p-4 text-red-700">{error}</p>}
            {!loading && !error && chamados.length === 0 && <p className="mt-8 rounded-lg bg-white p-6 text-slate-600">Nenhum chamado registrado.</p>}
            {!loading && !error && chamados.length > 0 && filteredChamados.length === 0 && <p className="mt-8 text-slate-300">Nenhum chamado encontrado para essa busca.</p>}
                <div className="mt-8 grid gap-4">
                    {visibleChamados.map((chamado) => (
                       <Link
              className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-sky-500 sm:p-5"
              href={`/chamados/${encodeURIComponent(String(chamado.id ?? ''))}`}
              key={String(chamado.id)}
            >
              <h2 className="flex flex-wrap items-center gap-2 break-words font-bold">
                {chamado.titulo || "Chamado sem título"}
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getChamadoStatusBadgeClass(chamado.status)}`}>
                  {chamado.status || "Não informado"}
                </span>
              </h2>
              <p className="mt-2 text-sm text-slate-600">Usuário: {chamado.pedidoPor || "Não informado"}, Situação: {chamado.status || "Não informado"}</p>
              <p className="text-sm text-slate-600">Descrição: {chamado.descricao || "Não informado"}</p>
              <p className="text-sm text-slate-600">Criado em: {formatArrivalDate(chamado.criadoEm) ?? "Não informado"}</p>
            </Link>
          ))}
        </div>
            {totalPages > 1 && (
          <nav className="mt-8 flex flex-wrap items-center justify-center gap-3" aria-label="Paginação das peças">
            <button
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((page) => page - 1)}
            >
              Anterior
            </button>
            <span className="text-sm text-slate-300">
              Página {currentPage} de {totalPages}
            </span>
            <button
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((page) => page + 1)}
            >
              Próxima
            </button>
          </nav>
        )}
        </section>
    </main>
    );
}