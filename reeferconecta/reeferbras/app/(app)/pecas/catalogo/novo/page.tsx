"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { canManagePieces } from "@/lib/authorization";

const fabricantes = ["Star Cool", "Daikin", "Carrier", "Thermo King", "Outros"];
const setores = [
  { value: "lab.elétrica", label: "Lab. Elétrica" },
  { value: "lab.eletronica", label: "Lab. Eletrônica" },
  { value: "cereco", label: "Cereco" },
];

export default function CadastrarComponentePage() {
  const router = useRouter();
  const [role, setRole] = useState<string>();
  const [loadingRole, setLoadingRole] = useState(true);
  const [fabricante, setFabricante] = useState("");
  const [setor, setSetor] = useState("");
  const [componente, setComponente] = useState("");
  const [imagem, setImagem] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((response) => response.json())
      .then((data) => setRole(data.user?.role))
      .catch(() => undefined)
      .finally(() => setLoadingRole(false));
  }, []);

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImagem(typeof reader.result === "string" ? reader.result : "");
    reader.readAsDataURL(file);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!fabricante || !setor || !componente.trim()) {
      setError("Preencha fabricante, setor e componente.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/pecas/catalogo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fabricante, setor, componente: componente.trim(), imagem }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.erro ?? "Não foi possível cadastrar a peça.");
      setSuccess("Peça cadastrada com sucesso!");
      router.push("/pecas");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível cadastrar a peça.");
    } finally {
      setSaving(false);
    }
  }

  if (loadingRole) return <main className="min-h-screen px-4 py-8"><p className="text-slate-300">Carregando...</p></main>;
  if (!canManagePieces(role)) {
    return <main className="min-h-screen px-4 py-8"><p className="rounded-lg bg-red-100 p-4 text-red-700">Você não tem permissão para acessar esta página.</p></main>;
  }

  return (
    <main className="min-h-screen px-4 py-8 text-slate-900 sm:px-6 sm:py-10">
      <section className="mx-auto max-w-2xl">
        <Link className="text-sm font-semibold text-sky-400 hover:text-sky-300" href="/pecas">← Voltar para peças</Link>
        <p className="mt-2 bg-gradient-to-br from-[#E8262C] to-[#B32025] bg-clip-text text-transparent text-sm font-bold uppercase tracking-widest">ReeferConecta</p>
        <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Cadastrar nova peça</h1>
        <p className="mt-2 text-slate-300">Adicione um novo componente ao catálogo de peças do fabricante selecionado.</p>

        <form className="mt-8 grid gap-4 rounded-lg bg-white p-6 shadow-sm" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">Fabricante
            <select className="rounded-lg border border-slate-300 px-3 py-2 font-normal" value={fabricante} onChange={(event) => setFabricante(event.target.value)} required>
              <option value="">Selecione o fabricante</option>
              {fabricantes.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">Setor
            <select className="rounded-lg border border-slate-300 px-3 py-2 font-normal" value={setor} onChange={(event) => setSetor(event.target.value)} required>
              <option value="">Selecione o setor</option>
              {setores.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">Componente
            <input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" value={componente} onChange={(event) => setComponente(event.target.value)} placeholder="Nome do componente" required />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">Imagem (opcional)
            <input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" type="file" accept="image/*" onChange={handleImageChange} />
          </label>
          {imagem && <img className="h-32 w-32 rounded-lg border border-slate-300 object-cover" src={imagem} alt="Prévia da imagem do componente" />}

          {error && <p className="rounded-lg bg-red-100 p-3 text-red-700">{error}</p>}
          {success && <p className="rounded-lg bg-emerald-100 p-3 text-emerald-700">{success}</p>}

          <div className="flex flex-wrap gap-3">
            <button className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800 disabled:opacity-50" type="submit" disabled={saving}>{saving ? "Salvando..." : "Cadastrar"}</button>
            <button className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700" type="button" onClick={() => router.push("/pecas")}>Voltar</button>
          </div>
        </form>
      </section>
    </main>
  );
}
