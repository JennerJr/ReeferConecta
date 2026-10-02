"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { canAccessPedidos, canCreatePedidos, canDeletePedidos } from "@/lib/authorization";
import { setorTabs } from "@/lib/catalog";

type PedidoItem = {
  nome: string;
  quantidadeSolicitada: number;
  quantidadeDisponivel: number;
  estoqueInsuficiente: boolean;
};

type Pedido = {
  id: number;
  setor: string;
  setorLabel: string;
  observacao?: string;
  dataAte?: string;
  itens: PedidoItem[];
  estoqueInsuficiente: boolean;
  status: "pendente" | "atendido" | "cancelado";
  solicitante: string;
  createdAt: string;
  resposta?: {
    viavel: boolean;
    comentario?: string;
    respondidoPor: string;
    respondidoEm: string;
  };
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR");
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function resolveSetorLabel(pedido: Pedido) {
  return setorTabs.find((tab) => tab.value === pedido.setor)?.label ?? pedido.setorLabel;
}

const statusLabels: Record<Pedido["status"], string> = {
  pendente: "Pendente",
  atendido: "Atendido",
  cancelado: "Cancelado",
};

const statusClasses: Record<Pedido["status"], string> = {
  pendente: "bg-amber-100 text-amber-700",
  atendido: "bg-emerald-100 text-emerald-700",
  cancelado: "bg-red-100 text-red-700",
};

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [role, setRole] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    fetch("/api/auth/session")
      .then((response) => response.json())
      .then((data) => setRole(data.user?.role))
      .catch(() => undefined);

    fetch("/api/pedidos")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.erro ?? "Não foi possível carregar os pedidos.");
        setPedidos(Array.isArray(data) ? data : []);
      })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Erro ao carregar pedidos."))
      .finally(() => setLoading(false));
  }, []);

  if (!loading && !canAccessPedidos(role)) {
    return <main className="min-h-screen px-4 py-8"><p className="rounded-lg bg-red-100 p-4 text-red-700">Você não tem permissão para acessar esta página.</p></main>;
  }

  async function deletePedido(pedido: Pedido) {
    if (!window.confirm(`Tem certeza que deseja excluir o pedido #${pedido.id}? Essa ação não pode ser desfeita.`)) return;
    setDeletingId(pedido.id);
    setDeleteError("");
    try {
      const response = await fetch(`/api/pedidos?id=${pedido.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.erro ?? "Não foi possível excluir o pedido.");
      setPedidos((current) => current.filter((item) => item.id !== pedido.id));
    } catch (requestError) {
      setDeleteError(requestError instanceof Error ? requestError.message : "Não foi possível excluir o pedido.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="min-h-screen px-4 py-8 text-slate-900 sm:px-6 sm:py-10">
      <section className="mx-auto max-w-5xl">
        <header className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="bg-gradient-to-br from-[#E8262C] to-[#B32025] bg-clip-text text-transparent text-sm font-bold uppercase tracking-widest">ReeferConecta</p>
            <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Pedidos de peças</h1>
          </div>
          {canCreatePedidos(role) && (
            <Link className="w-full rounded-lg bg-sky-700 px-4 py-3 text-center font-semibold text-white hover:bg-sky-800 sm:w-auto" href="/pedidos/novo">
              Novo pedido
            </Link>
          )}
        </header>

        {loading && <p className="mt-8 text-white">Carregando pedidos...</p>}
        {error && <p className="mt-8 rounded-lg bg-red-50 p-4 text-red-700">{error}</p>}
        {deleteError && <p className="mt-4 rounded-lg bg-red-50 p-4 text-red-700">{deleteError}</p>}
        {!loading && !error && pedidos.length === 0 && <p className="mt-8 text-white">Nenhum pedido registrado.</p>}

        <div className="mt-8 grid gap-4">
          {pedidos.map((pedido) => (
            <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5" key={pedido.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-bold text-slate-900">
                  <Link className="hover:text-sky-700" href={`/pedidos/${pedido.id}`}>Pedido #{pedido.id} — {resolveSetorLabel(pedido)}</Link>
                </h2>
                <div className="flex gap-2">
                  {pedido.estoqueInsuficiente && (
                    <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Estoque insuficiente</span>
                  )}
                  {pedido.resposta && (
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${pedido.resposta.viavel ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                      {pedido.resposta.viavel ? "Viável" : "Não viável"}
                    </span>
                  )}
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${statusClasses[pedido.status]}`}>
                    {statusLabels[pedido.status]}
                  </span>
                  {canDeletePedidos(role) && (
                    <button className="text-sm font-semibold text-red-700 hover:text-red-900 disabled:opacity-50" type="button" disabled={deletingId === pedido.id} onClick={() => deletePedido(pedido)}>{deletingId === pedido.id ? "Excluindo..." : "Excluir"}</button>
                  )}
                </div>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                Solicitado por {pedido.solicitante} em {formatDateTime(pedido.createdAt)}
              </p>
              {pedido.observacao && <p className="mt-2 text-sm text-slate-700">Observação: {pedido.observacao}</p>}
              {pedido.dataAte && <p className="mt-1 text-sm text-slate-700">Data até: {formatDate(pedido.dataAte)}</p>}
              <ul className="mt-3 grid gap-1 text-sm text-slate-700">
                {pedido.itens.map((item) => (
                  <li key={item.nome} className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 py-1 first:border-t-0">
                    <span>{item.nome} — Qtd: {item.quantidadeSolicitada}</span>
                    <span className={item.estoqueInsuficiente ? "text-red-600" : "text-emerald-600"}>
                      Disponível: {item.quantidadeDisponivel}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
