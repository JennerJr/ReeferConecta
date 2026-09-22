'use client';

import Link from "next/link";
import {useEffect, useState} from 'react';
import { useRouter } from 'next/navigation';

type Piece = {
    id: number;
    titulo: string;
    descricao: string;
    status: string;
    pedidoPor:string,
    criadoEm: string;
}

export default function NovoChamadoPage() {
const router = useRouter();
const [titulo, setTitulo] = useState("");
const [descricao, setDescricao] = useState("");
const [pedidoPor, setPedidoPor] = useState("");
const [submitted, setSubmitted] = useState(false);
const [role, setRole] = useState("");
const [saving, setSaving] = useState(false);
const [error, setError] = useState("");
const [message, setMessage] = useState("");


function getCurrentDateTimeLocal() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}



useEffect(() => {
    fetch("/api/auth/session")
    .then((response) => response.json())
    .then((data) => {
        setPedidoPor(data.user?.name ?? "");
        setRole(data.user?.role?.trim().toLowerCase() ?? "");
    })
    .catch(()=> undefined);
}, [])

async function saveChamado(event: React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    setSaving(true);
    setSubmitted(true);
    setError("");
    setMessage("");

     try {
        const requiredFields: Array<[keyof Piece, string]> = [
          ["titulo", "Titulo"],
          ["descricao", "Descrição"],
          ["pedidoPor", "Pedido Por"],
        ];
        const emptyField = requiredFields.find(([field]) => !eval(field).trim());
        if (emptyField) throw new Error(`O campo ${emptyField[1]} é obrigatório.`);

        const response = await fetch("/api/chamados", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            titulo: titulo,
            descricao: descricao,
            status  : "Aberto",
            pedidoPor: pedidoPor,
            criadoEm: getCurrentDateTimeLocal(),

          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.erro ?? "Não foi possível realizar o chamado.");
        setMessage("Chamado salvo com sucesso.");
        setSubmitted(true);
    }  catch (requestError) {
        setError(requestError instanceof Error? requestError.message: "não foi possivel abrir o chamado")
    } finally {
        setSaving(false);
    }    
}
return(
    <main className="min-h-screen bg-gray-800 px-4 py-8 text-slate-900 sm:px-6 sm:py-10">
        <section className="mx-auto max-w-3xl">
            <Link className="text-sm font-semibold text-sky-400" href="/chamados">← Voltar para chamados</Link>
                <h1 className="mt-4 text-3xl font-bold text-white">Novo Chamado</h1>
                <form className="mt-8 space-y-5 rounded-xl border border-slate-700 bg-gray-800 p-4 sm:p-6" onSubmit={saveChamado}>
                    {message && <p className="rounded-lg bg-emerald-50 p-3 text-emerald-700">{message}</p>}
                    {error && <p className="rounded-lg bg-red-100 p-3 text-red-700">{error}</p>}

            <div className="grid gap-5">
            <label className="grid gap-2 text-sm font-semibold text-slate-200">
              Nome
              <input className="rounded-lg border border-slate-300 px-3 py-2 font-normal text-white outline-none" value={pedidoPor} onChange={(event) => setPedidoPor(event.target.value)} required />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-200">
              Titulo
              <input className="rounded-lg border border-slate-300 px-3 py-2 font-normal text-white outline-none" value={titulo} onChange={(event) => setTitulo(event.target.value)} required />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-200">
              Descrição do Chamado
              <textarea className="min-h-32 rounded-lg border border-slate-300 px-3 py-2 font-normal text-white outline-none" value={descricao} onChange={(event) => setDescricao(event.target.value)} required />
            </label>
                <button className="rounded-lg bg-red-700 px-4 py-3 font-semibold text-white hover:bg-red-800 disabled:opacity-50" disabled={saving} type="submit">{saving ? `Abrindo Chamado...` : `Abrir Chamado`}</button>

            </div>
                </form>
        </section>
    </main>
);


}

