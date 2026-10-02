"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { setorTabs } from "@/lib/catalog";

type PageProps = { params: Promise<{ id: string }> };

type PedidoItem = {
  nome: string;
  quantidadeSolicitada: number;
  quantidadeDisponivel: number;
  estoqueInsuficiente: boolean;
};

type PedidoResposta = {
  viavel: boolean;
  comentario?: string;
  respondidoPor: string;
  respondidoEm: string;
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
  resposta?: PedidoResposta;
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

export default function PedidoDetalhePage({ params }: PageProps) {
  const { id } = use(params);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [comentario, setComentario] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    fetch(`/api/pedidos/${id}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.erro ?? "Não foi possível carregar o pedido.");
        setPedido(data);
        setComentario(data.resposta?.comentario ?? "");
      })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Erro ao carregar o pedido."))
      .finally(() => setLoading(false));
  }, [id]);

  async function responder(viavel: boolean) {
    setSubmitting(true);
    setSubmitError("");
    try {
      const response = await fetch(`/api/pedidos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ viavel, comentario: comentario.trim() || undefined }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.erro ?? "Não foi possível registrar a resposta.");
      setPedido((current) => current ? { ...current, resposta: data.resposta } : current);
    } catch (requestError) {
      setSubmitError(requestError instanceof Error ? requestError.message : "Não foi possível registrar a resposta.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <main className="mx-auto max-w-3xl px-4 py-8 text-white sm:px-6 sm:py-10">Carregando...</main>;
  if (error) return <main className="mx-auto max-w-3xl px-4 py-8 text-red-700 sm:px-6 sm:py-10">{error}</main>;
  if (!pedido) return null;

  return (
    <main className="min-h-screen px-4 py-8 text-slate-900 sm:px-6 sm:py-10">
      <section className="mx-auto max-w-3xl">
        <Link className="text-sm font-semibold text-sky-700" href="/pedidos">← Voltar para pedidos</Link>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Pedido #{pedido.id} — {resolveSetorLabel(pedido)}</h1>
          <span className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${statusClasses[pedido.status]}`}>
            {statusLabels[pedido.status]}
          </span>
        </div>

        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 sm:p-6">
          <p className="text-sm text-slate-600">Solicitado por {pedido.solicitante} em {formatDateTime(pedido.createdAt)}</p>
          {pedido.observacao && <p className="mt-2 text-sm text-slate-700">Observação: {pedido.observacao}</p>}
          {pedido.dataAte && <p className="mt-1 text-sm text-slate-700">Data até: {formatDate(pedido.dataAte)}</p>}
          {pedido.estoqueInsuficiente && (
            <p className="mt-2 inline-block rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">Estoque insuficiente</p>
          )}

          <h2 className="mt-6 text-lg font-semibold">Peças solicitadas</h2>
          <ul className="mt-2 grid gap-1 text-sm text-slate-700">
            {pedido.itens.map((item) => (
              <li key={item.nome} className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 py-2 first:border-t-0">
                <span>{item.nome} — Qtd solicitada: {item.quantidadeSolicitada}</span>
                <span className={item.estoqueInsuficiente ? "text-red-600" : "text-emerald-600"}>
                  Disponível: {item.quantidadeDisponivel}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 sm:p-6">
          <h2 className="text-lg font-semibold">Resposta do setor</h2>
          {pedido.resposta ? (
            <div className="mt-3">
              <p className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${pedido.resposta.viavel ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                {pedido.resposta.viavel ? "Viável até a data solicitada" : "Não viável até a data solicitada"}
              </p>
              {pedido.resposta.comentario && <p className="mt-2 text-sm text-slate-700">{pedido.resposta.comentario}</p>}
              <p className="mt-2 text-xs text-slate-500">Respondido por {pedido.resposta.respondidoPor} em {formatDateTime(pedido.resposta.respondidoEm)}</p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-600">Ainda não há resposta para este pedido.</p>
          )}

          <div className="mt-4 grid gap-3">
            <label className="grid gap-1 text-sm font-semibold text-slate-700">Comentário (opcional)
              <textarea className="min-h-20 rounded-lg border border-slate-300 px-3 py-2 font-normal text-slate-900" value={comentario} onChange={(event) => setComentario(event.target.value)} />
            </label>
            {submitError && <p className="rounded-lg bg-red-100 p-2 text-sm text-red-700">{submitError}</p>}
            <div className="flex flex-wrap gap-2">
              <button className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50" type="button" disabled={submitting} onClick={() => responder(true)}>
                {submitting ? "Enviando..." : "Viável até a data"}
              </button>
              <button className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50" type="button" disabled={submitting} onClick={() => responder(false)}>
                {submitting ? "Enviando..." : "Não viável até a data"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
