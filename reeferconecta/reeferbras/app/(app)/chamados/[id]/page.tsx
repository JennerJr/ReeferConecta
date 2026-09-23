'use client';

import Link from "next/link";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { canManagePieces } from "@/lib/authorization";

type PageProps = { params: Promise<{ id: string }> };

type chamados = {
	id: number;
	titulo: string;
	descricao: string;
	status: string;
	pedidoPor: string;
	criadoEm: string;
	history?: chamadosHystory[]
}
type chamadosHystory = {
	id: string;
  action: "created" | "updated" | "report";
  details: string;
  userName: string;
  criadoEm: string;
};

function formatArrivalDate(value?: string) {
  if (!value) return undefined;
  const [date] = value.split("T");
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

export default function ReportDetailsPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [chamados, setChamados] = useState<chamados | null>(null);
  const [error, setError] = useState("");
  const [role, setRole] = useState<string>();

  useEffect(() => {
	fetch("/api/auth/session")
	.then((response) => response.json())
	.then((data) => setRole(data.user?.role))
	.catch(() => undefined);

	fetch(`/api/chamados`)
	.then(async (response) => {
		const data = await response.json();
		if(!response.ok) throw new Error(data.erro ?? "Não foi possivel carregar os chamados")
		const list: chamados[] = Array.isArray(data) ? data : (data.data ?? data.chamados ?? data.dados ?? []);
		const found = list.find((p) => String(p.id) === String(id));
		if(!found) throw new Error("Chamado não encontrado");
		setChamados(found);
	})
	.catch((RequestError) => setError(RequestError instanceof Error ? RequestError.message : "Erro ao carregar o chamado"))
	},[id]);

	if(error) return  <main className="mx-auto max-w-3xl px-4 py-8 text-red-700 sm:px-6 sm:py-10">{error}</main>;
	if(!chamados) return <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">Carregando...</main>;

	const fields: [string, string|undefined|number][] = [
    ["ID", chamados.id],
    ["Data de chegada", formatArrivalDate(chamados.criadoEm)],
    ["Título", chamados.titulo],
    ["Status", chamados.status],
    ["Pedido Por", chamados.pedidoPor],
	["Descrição", chamados.descricao],
  ];

    return (
	  <main className="min-h-screen px-4 py-8 text-slate-900 sm:px-6 sm:py-10">
		<section className="mx-auto max-w-3xl">
		  <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
			<Link className="text-sm font-semibold text-sky-700" href="/chamados">← Voltar para chamados</Link>
			<div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
			  {canManagePieces(role) && (
				<button
				  onClick={() => router.push(`/chamados/${id}/editar`)}
				  className="w-full rounded-lg bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-blue-700 sm:w-auto"
				>
				  Editar chamado
				</button>
			  )}
			</div>
		  </div>
		  <h1 className="mt-4 text-3xl text-white font-bold">Detalhes do chamado</h1>

		  <div className="mt-8 grid gap-4 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-2 sm:p-6">
			{fields.map(([label, value]) => (
			  <p key={label}><strong>{label}:</strong> {value ?? "Não informado"}</p>
			))}
		  </div>
  
		  <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4 sm:p-6">
			<h2 className="text-xl font-semibold">Histórico do chamado</h2>
			{!chamados.history?.length ? <p className="mt-4 text-slate-600">Nenhuma alteração registrada.</p> : (
			  <ol className="mt-4 grid gap-3">
				{[...chamados.history]
				  .sort((first, second) => new Date(second.criadoEm).getTime() - new Date(first.criadoEm).getTime())
				  .map((entry) => (
					<li className="border-l-2 border-sky-600 pl-4" key={entry.id}>
					  <p className="font-semibold text-slate-900">
						{entry.action === "report" ? "Relatório realizado" : entry.action === "updated" ? "Chamado alterado" : "Chamado cadastrado"}
					  </p>
					  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{entry.details}</p>
					  <p className="mt-1 text-xs text-slate-500">
						{new Date(entry.criadoEm).toLocaleString("pt-BR")} · por {entry.userName}
					  </p>
					</li>
				  ))}
			  </ol>
			)}
		  	</section>
		</section>
	</main>
	);
  }
