'use client';
import { useEffect, useState } from "react";
import Link from "next/link";

type chamado ={
    id: string;
    titulo: string;
    descricao: string;
    status: string;
    pedidoPor:string,
    criadoEm: string;
}

export default function ChamadosPage() {
    const pageSize = 10;
    const [chamados, setChamados] = useState<chamado[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [search, setSearch] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
            fetch('/api/chamados')
            .then(async (response) => {
                const data = await response.json();
                if (!response.ok) throw new Error( data.erro ?? 'não foi possível carregar os chamados');
                const allChamados: chamado[] = data.chamados ?? [];
                allChamados.sort((first,second) => new Date(second.criadoEm).getTime() - new Date(first.criadoEm).getTime());
                setChamados(allChamados);
                })
                .catch((requestError) => setError(requestError instanceof Error? requestError.message:'Erro ao carregar os chamados'))
                .finally(() => setLoading(false));
            }, []);
            const normalizedSearch = search.trim().toLowerCase();
            const filteredChamados  = chamados.filter((chamado) => [
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
                    <div className="flex flex-wrap gap-2"><Link className="rounded-lg bg-sky-700 px-4 py-2 font-semibold text-white hover:bg-sky-800" href="/chamados/novo">Novo chamado</Link></div>
                </div>

            {!loading && !error && chamados.length > 0 && <input className="mt-8 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-sky-600" type="search" placeholder="Buscar por usuário, peça, QC, situação ou descrição..." value={search} onChange={(event) => { setSearch(event.target.value); setCurrentPage(1); }} aria-label="Buscar relatórios" />}
            {loading && <p className="mt-8 text-slate-300">Carregando chamados...</p>}
            {error && <p className="mt-8 rounded-lg bg-red-100 p-4 text-red-700">{error}</p>}
            {!loading && !error && chamados.length === 0 && <p className="mt-8 rounded-lg bg-white p-6 text-slate-600">Nenhum chamado registrado.</p>}
            {!loading && !error && chamados.length > 0 && filteredChamados.length === 0 && <p className="mt-8 text-slate-300">Nenhum chamado encontrado para essa busca.</p>}
                <div className="mt-8 grid gap-4">
                    {visibleChamados.map((chamados) => <article className="rounded-lg border border-slate-700 bg-white p-4 shadow-sm sm:p-5" key={`${chamados.id ?? "sem-peca"}-${chamados.id}`}>
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">{chamados.id && <Link className="text-sm font-semibold text-sky-700 hover:text-sky-900" href={`/${chamados.id}/chamadas`}>Ver peça</Link>}</div>
            <div className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2"><p><strong>Usuário:</strong> {chamados.pedidoPor}</p><p><strong>Situação:</strong> {chamados.status}</p></div>
                 {<div className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                    {chamados.titulo && <p> <strong>Título:</strong> {chamados.titulo}</p>}
                    {chamados.descricao && <p> <strong>Descrição:</strong> {chamados.descricao}</p>}
                    {chamados.status && <p> <strong>Situação:</strong> {chamados.status}</p>}
                    {chamados.criadoEm && <p> <strong>Criado em:</strong> {new Date(chamados.criadoEm).toLocaleString("pt-BR")}</p>}

                 </div>}
                 {chamados.descricao && <p className="mt-3 whitespace-pre-wrap text-slate-800"><strong>Descrição:</strong> {chamados.descricao}</p>}
                    <p className="mt-3 text-xs text-slate-500">{new Date(chamados.criadoEm).toLocaleString("pt-BR")}</p>
                    </article>)}
                </div>

                {totalPages > 1 && <nav className="mt-8 flex items-center justify-center gap-4" aria-label="Paginação dos chamados"><button className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50" type="button" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => page - 1)}>Anterior</button><span className="text-sm text-slate-300">Página {currentPage} de {totalPages}</span><button className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50" type="button" disabled={currentPage === totalPages} onClick={() => setCurrentPage((page) => page + 1)}>Próxima</button></nav>}
            </section>
        </main>
    )
}