"use client";

import { canAccessTeams } from "@/lib/authorization";
import { useEffect, useState } from "react";

type Employee = {
  _id: string;
  name: string;
  email: string;
  role: string;
};

export default function GenIndReport() {
  const [open, setOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [role, setRole] = useState<string>();
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [userId, setUserId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const handleGenerate = async () => {
  if (!userId || !startDate || !endDate) return;
  setGenerating(true);
  setGenerateError(null);

  try {
    const params = new URLSearchParams({ userId, startDate, endDate });
    const res = await fetch(`/api/reports/individual?${params.toString()}`);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Erro ao gerar relatório");
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-${userId}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    setOpen(false);
  } catch (err) {
    setGenerateError(err instanceof Error ? err.message : "Erro desconhecido");
  } finally {
    setGenerating(false);
  }
};

  const handleOpen = () => {
    setOpen(true);
    if (employees.length === 0) {
      setLoadingEmployees(true);
      setFetchError(null);
    }
  };

  useEffect(() => {
    if (!open || employees.length > 0) return;

    let cancelled = false;

    fetch("/api/auth/session")
      .then((response) => response.json())
      .then((data) => setRole(data.user?.role))
      .catch(() => undefined);

    fetch("/api/users?all=true")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao buscar usuários");
        return data;
      })
      .then((data) => {
        if (!cancelled) setEmployees(data.users ?? []);
      })
      .catch((err) => {
        if (!cancelled) setFetchError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoadingEmployees(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, employees.length]);



  return (
    <>
      <button
        onClick={handleOpen}
        className="w-full rounded-lg bg-sky-700 px-4 py-3 text-center font-semibold text-white hover:bg-sky-800 sm:w-auto"
        >
        Gerar Relatório Individual
      </button>

      {canAccessTeams(role) &&  open && (
        
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
          <div className="h-full w-full max-w-sm bg-slate-900 p-6 text-white">
            <h2 className="text-lg font-semibold">Relatório Individual</h2>

            {fetchError && (
              <p className="mt-4 rounded-md bg-red-900/40 px-3 py-2 text-sm text-red-300">
                {fetchError}
              </p>
            )}

            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              disabled={loadingEmployees}
              className="mt-4 w-full rounded-md bg-slate-800 px-3 py-2 disabled:opacity-50"
            >
              <option value="">
                {loadingEmployees ? "Carregando usuários..." : "Selecione o usuário"}
              </option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>{emp.name}</option>
              ))}
            </select>

            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-3 w-full rounded-md bg-slate-800 px-3 py-2" />
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-3 w-full rounded-md bg-slate-800 px-3 py-2" />

            <div className="mt-6 flex gap-2">
              <button
  onClick={handleGenerate}
  disabled={generating}
  className="flex-1 rounded-md bg-sky-700 px-4 py-2 font-semibold disabled:opacity-50"
>
  {generating ? "Gerando..." : "Gerar"}
</button>
{generateError && <p className="mt-2 text-sm text-red-300">{generateError}</p>}
              <button onClick={() => { setOpen(false); }} className="flex-1 rounded-md bg-slate-700 px-4 py-2">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}