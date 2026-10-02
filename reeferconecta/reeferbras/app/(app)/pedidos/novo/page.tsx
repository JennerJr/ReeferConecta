"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { canCreatePedidos } from "@/lib/authorization";
import { fabricantes, getPartsForSetor, setorTabs } from "@/lib/catalog";

type ItemPedido = {
  nome: string;
  quantidade: number;
};

type ItemResultado = {
  nome: string;
  quantidadeSolicitada: number;
  quantidadeDisponivel: number;
  estoqueInsuficiente: boolean;
};

export default function NovoPedidoPage() {
  const router = useRouter();
  const [role, setRole] = useState<string>();
  const [loadingRole, setLoadingRole] = useState(true);
  const [setor, setSetor] = useState("");
  const [observacao, setObservacao] = useState("");
  const [dataAte, setDataAte] = useState("");
  const [itens, setItens] = useState<ItemPedido[]>([]);
  const [novoFabricante, setNovoFabricante] = useState("");
  const [novaPeca, setNovaPeca] = useState("");
  const [novaQuantidade, setNovaQuantidade] = useState(1);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [itensInsuficientes, setItensInsuficientes] = useState<ItemResultado[] | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((response) => response.json())
      .then((data) => setRole(data.user?.role))
      .catch(() => undefined)
      .finally(() => setLoadingRole(false));
  }, []);

  const pecasDisponiveis = setor && novoFabricante ? getPartsForSetor(setor, novoFabricante) : [];

  function handleSetorChange(value: string) {
    setSetor(value);
    setItens([]);
    setNovoFabricante("");
    setNovaPeca("");
    setItensInsuficientes(null);
  }

  function handleFabricanteChange(value: string) {
    setNovoFabricante(value);
    setNovaPeca("");
  }

  function handleAddItem() {
    setError("");
    const nome = novaPeca.trim();
    if (!nome) {
      setError("Selecione uma peça para adicionar.");
      return;
    }
    if (!Number.isInteger(novaQuantidade) || novaQuantidade < 1) {
      setError("Informe uma quantidade válida.");
      return;
    }
    if (itens.some((item) => item.nome.toLowerCase() === nome.toLowerCase())) {
      setError("Essa peça já foi adicionada à lista.");
      return;
    }
    setItens((current) => [...current, { nome, quantidade: novaQuantidade }]);
    setNovaPeca("");
    setNovaQuantidade(1);
    setItensInsuficientes(null);
  }

  function handleRemoveItem(nome: string) {
    setItens((current) => current.filter((item) => item.nome !== nome));
    setItensInsuficientes(null);
  }

  async function enviarPedido(confirmarEstoqueInsuficiente: boolean) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setor, observacao, dataAte, itens, confirmarEstoqueInsuficiente }),
      });
      const data = await response.json();
      if (response.status === 409 && data.requerConfirmacao) {
        setItensInsuficientes(data.itens as ItemResultado[]);
        return;
      }
      if (!response.ok) throw new Error(data.erro ?? "Não foi possível criar o pedido.");
      router.push("/pedidos");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível criar o pedido.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!setor) {
      setError("Selecione o setor do pedido.");
      return;
    }
    if (!itens.length) {
      setError("Adicione ao menos uma peça ao pedido.");
      return;
    }
    await enviarPedido(false);
  }

  if (loadingRole) return <main className="min-h-screen px-4 py-8"><p className="text-slate-300">Carregando...</p></main>;
  if (!canCreatePedidos(role)) {
    return <main className="min-h-screen px-4 py-8"><p className="rounded-lg bg-red-100 p-4 text-red-700">Você não tem permissão para acessar esta página.</p></main>;
  }

  return (
    <main className="min-h-screen px-4 py-8 text-slate-900 sm:px-6 sm:py-10">
      <section className="mx-auto max-w-3xl">
        <Link className="text-sm font-semibold text-sky-400 hover:text-sky-300" href="/pedidos">← Voltar para pedidos</Link>
        <p className="mt-2 bg-gradient-to-br from-[#E8262C] to-[#B32025] bg-clip-text text-transparent text-sm font-bold uppercase tracking-widest">ReeferConecta</p>
        <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Novo pedido de peças</h1>
        <p className="mt-2 text-slate-300">Selecione o setor, adicione as peças e quantidades desejadas.</p>

        <form className="mt-8 grid gap-4 rounded-lg bg-white p-6 shadow-sm" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">Setor
            <select className="rounded-lg border border-slate-300 px-3 py-2 font-normal" value={setor} onChange={(event) => handleSetorChange(event.target.value)} required>
              <option value="">Selecione o setor</option>
              {setorTabs.map((tab) => <option key={tab.value} value={tab.value}>{tab.label}</option>)}
            </select>
          </label>

          {setor && (
            <div className="grid gap-3 rounded-lg border border-slate-200 p-4">
              <h2 className="text-sm font-semibold text-slate-700">Adicionar peça</h2>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">Fabricante
                <select className="rounded-lg border border-slate-300 px-3 py-2 font-normal" value={novoFabricante} onChange={(event) => handleFabricanteChange(event.target.value)}>
                  <option value="">Selecione o fabricante</option>
                  {fabricantes.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
                <select className="rounded-lg border border-slate-300 px-3 py-2 font-normal" value={novaPeca} onChange={(event) => setNovaPeca(event.target.value)} disabled={!novoFabricante}>
                  <option value="">{novoFabricante ? "Selecione uma peça" : "Selecione primeiro o fabricante"}</option>
                  {pecasDisponiveis.map((part) => <option key={part.descricao} value={part.descricao}>{part.descricao}</option>)}
                </select>
                <input
                  className="w-24 rounded-lg border border-slate-300 px-3 py-2 font-normal"
                  type="number"
                  min={1}
                  value={novaQuantidade}
                  onChange={(event) => setNovaQuantidade(Number(event.target.value))}
                />
                <button className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800" type="button" onClick={handleAddItem}>
                  Adicionar peça
                </button>
              </div>
              {novoFabricante && pecasDisponiveis.length === 0 && <p className="text-sm text-slate-500">Nenhuma peça cadastrada para este setor e fabricante.</p>}
            </div>
          )}

          {itens.length > 0 && (
            <div className="grid gap-2">
              <h2 className="text-sm font-semibold text-slate-700">Peças no pedido</h2>
              <ul className="grid gap-2">
                {itens.map((item) => (
                  <li className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2" key={item.nome}>
                    <span>{item.nome} — Qtd: {item.quantidade}</span>
                    <button className="text-sm font-semibold text-red-600 hover:text-red-700" type="button" onClick={() => handleRemoveItem(item.nome)}>
                      Remover
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <label className="grid gap-2 text-sm font-semibold text-slate-700">Observação (opcional)
            <textarea className="min-h-20 rounded-lg border border-slate-300 px-3 py-2 font-normal" value={observacao} onChange={(event) => setObservacao(event.target.value)} />
          </label>

          <label className="grid max-w-xs gap-2 text-sm font-semibold text-slate-700">Data até
            <input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" type="date" value={dataAte} onChange={(event) => setDataAte(event.target.value)} />
          </label>

          {error && <p className="rounded-lg bg-red-100 p-3 text-red-700">{error}</p>}

          {itensInsuficientes && (
            <div className="grid gap-3 rounded-lg bg-amber-50 p-4 text-amber-800">
              <p className="font-semibold">Estoque insuficiente para as peças abaixo:</p>
              <ul className="grid gap-1 text-sm">
                {itensInsuficientes.filter((item) => item.estoqueInsuficiente).map((item) => (
                  <li key={item.nome}>{item.nome} — Solicitado: {item.quantidadeSolicitada}, Disponível: {item.quantidadeDisponivel}</li>
                ))}
              </ul>
              <p>Deseja realizar o pedido mesmo assim?</p>
              <div className="flex flex-wrap gap-3">
                <button className="rounded-lg bg-amber-700 px-4 py-2 font-semibold text-white hover:bg-amber-800 disabled:opacity-50" type="button" disabled={saving} onClick={() => enviarPedido(true)}>
                  {saving ? "Enviando..." : "Sim, realizar pedido mesmo assim"}
                </button>
                <button className="rounded-lg border border-amber-700 px-4 py-2 font-semibold text-amber-800" type="button" onClick={() => setItensInsuficientes(null)}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button className="rounded-lg bg-sky-700 px-4 py-2 font-semibold text-white hover:bg-sky-800 disabled:opacity-50" type="submit" disabled={saving}>
              {saving ? "Enviando..." : "Enviar pedido"}
            </button>
            <button className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700" type="button" onClick={() => router.push("/pedidos")}>
              Voltar
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
