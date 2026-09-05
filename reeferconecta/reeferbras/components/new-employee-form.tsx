"use client";

import { FormEvent, useState } from "react";
import { employeeRoles } from "@/lib/authorization";

const roles = employeeRoles;

export default function NewEmployeeForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("almox");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus("");

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível cadastrar o funcionário.");

      setName("");
      setEmail("");
      setRole("almox");
      setStatus("Funcionário cadastrado com sucesso. A senha padrão é reeferconecta.");
      window.dispatchEvent(new Event("employee-created"));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Não foi possível cadastrar o funcionário.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <details className="mt-8 max-w-2xl rounded-lg border border-white/10 bg-gray-900/70 p-4 sm:p-6">
      <summary className="cursor-pointer list-none text-2xl font-semibold text-white marker:hidden">
        <span className="flex items-center justify-between gap-4">
          Adicionar novo funcionário
          <span className="text-cyan-400" aria-hidden="true">+</span>
        </span>
      </summary>
      <p className="mt-2 text-sm text-gray-400">A senha inicial será reeferconecta.</p>

      <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
        <label className="block text-sm font-medium text-gray-300">
          Nome completo
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-2 w-full rounded-md border border-white/10 bg-gray-800 px-3 py-3 text-white outline-none focus:border-cyan-400"
          />
        </label>

        <label className="block text-sm font-medium text-gray-300">
          E-mail
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-md border border-white/10 bg-gray-800 px-3 py-3 text-white outline-none focus:border-cyan-400"
          />
        </label>

        <label className="block text-sm font-medium text-gray-300">
          Role
          <select
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className="mt-2 w-full rounded-md border border-white/10 bg-gray-800 px-3 py-3 text-white outline-none focus:border-cyan-400"
          >
            {roles.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>

        {status && <p className="rounded-md bg-gray-800 px-3 py-3 text-sm text-cyan-300" role="status">{status}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-md bg-cyan-600 px-4 py-3 font-semibold text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {saving ? "Cadastrando..." : "Cadastrar funcionário"}
        </button>
      </form>
    </details>
  );
}