"use client";

import { useEffect, useState } from "react";
import { employeeRoles } from "@/lib/authorization";

type Employee = {
  _id: string;
  name: string;
  email: string;
  role: string;
  imageUrl?: string;
};

export default function EmployeeList() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadEmployees = () => {
    setLoading(true);
    setError("");
    fetch("/api/users?all=true")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Não foi possível carregar os funcionários.");
        setEmployees(data.users ?? []);
      })
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : "Não foi possível carregar os funcionários.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadEmployees();
    window.addEventListener("employee-created", loadEmployees);
    return () => window.removeEventListener("employee-created", loadEmployees);
  }, []);

  function openEmployee(employee: Employee) {
    setSelectedEmployee(employee);
    setEditName(employee.name);
    setEditEmail(employee.email);
    setEditRole(employee.role);
    setEditStatus("");
    setConfirmingDelete(false);
  }

  function closeEmployee() {
    setSelectedEmployee(null);
    setConfirmingDelete(false);
  }

  async function saveEmployee() {
    if (!selectedEmployee) return;
    setSaving(true);
    setEditStatus("");
    try {
      const response = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedEmployee._id, name: editName, email: editEmail, role: editRole }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível salvar as alterações.");
      setEmployees((current) => current.map((employee) => employee._id === data.user._id ? data.user : employee));
      setSelectedEmployee(data.user);
      setEditStatus("Funcionário atualizado com sucesso.");
    } catch (requestError) {
      setEditStatus(requestError instanceof Error ? requestError.message : "Não foi possível salvar as alterações.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteEmployee() {
    if (!selectedEmployee) return;
    setDeleting(true);
    setEditStatus("");
    try {
      const response = await fetch(`/api/users?id=${selectedEmployee._id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível excluir o funcionário.");
      setEmployees((current) => current.filter((employee) => employee._id !== selectedEmployee._id));
      closeEmployee();
    } catch (requestError) {
      setEditStatus(requestError instanceof Error ? requestError.message : "Não foi possível excluir o funcionário.");
      setConfirmingDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  const groupedEmployees = employees.reduce<Record<string, Employee[]>>((groups, employee) => {
    const role = employee.role || "sem role";
    groups[role] ??= [];
    groups[role].push(employee);
    return groups;
  }, {});

  const getInitials = (name: string) =>
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?";

  if (loading) return <p className="mt-8 text-gray-400">Carregando funcionários...</p>;
  if (error) return <p className="mt-8 rounded-md bg-red-900/40 p-4 text-red-200">{error}</p>;
  if (!employees.length) return <p className="mt-8 text-gray-400">Nenhum funcionário cadastrado.</p>;

  return (
    <section className="mt-10">
      <h2 className="text-2xl font-semibold text-white">Funcionários cadastrados</h2>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {Object.entries(groupedEmployees).map(([role, roleEmployees]) => (
          <section key={role} className="rounded-lg border border-white/10 bg-gray-900/70 p-5">
            <h3 className="text-lg font-semibold capitalize text-cyan-300">{role}</h3>
            <div className="mt-4 space-y-3">
              {roleEmployees.map((employee) => (
                <button
                  key={employee._id}
                  type="button"
                  onClick={() => openEmployee(employee)}
                  className="flex w-full items-center gap-4 rounded-md border border-white/10 bg-gray-800/70 p-4 text-left hover:border-cyan-400/60"
                >
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-cyan-400/60 bg-cyan-950/80">
                    {employee.imageUrl && !imageErrors[employee._id] ? (
                      <img
                        src={employee.imageUrl}
                        alt={`Foto de ${employee.name}`}
                        className="h-full w-full object-cover"
                        onError={() => {
                          setImageErrors((current) => ({ ...current, [employee._id]: true }));
                        }}
                      />
                    ) : null}
                    {(!employee.imageUrl || imageErrors[employee._id]) && (
                      <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-cyan-200">
                        {getInitials(employee.name)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-medium text-white">{employee.name}</p>
                    <p className="mt-1 break-all text-sm text-gray-400">{employee.email}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      {selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:items-center" onClick={closeEmployee}>
          <div className="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-lg border border-white/10 bg-gray-900 p-4 sm:p-6" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-xl font-semibold text-white">Editar funcionário</h3>
              <button type="button" onClick={closeEmployee} aria-label="Fechar" className="text-gray-400 hover:text-white">✕</button>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block text-sm font-medium text-gray-300">
                Nome
                <input value={editName} onChange={(event) => setEditName(event.target.value)} className="mt-2 w-full rounded-md border border-white/10 bg-gray-800 px-3 py-3 text-white outline-none focus:border-cyan-400" />
              </label>
              <label className="block text-sm font-medium text-gray-300">
                E-mail
                <input type="email" value={editEmail} onChange={(event) => setEditEmail(event.target.value)} className="mt-2 w-full rounded-md border border-white/10 bg-gray-800 px-3 py-3 text-white outline-none focus:border-cyan-400" />
              </label>
              <label className="block text-sm font-medium text-gray-300">
                Setor
                <select value={editRole} onChange={(event) => setEditRole(event.target.value)} className="mt-2 w-full rounded-md border border-white/10 bg-gray-800 px-3 py-3 text-white outline-none focus:border-cyan-400">
                  {employeeRoles.map((role) => <option key={role} value={role}>{role}</option>)}
                </select>
              </label>
            </div>

            {editStatus && <p className="mt-4 rounded-md bg-gray-800 px-3 py-3 text-sm text-cyan-300" role="status">{editStatus}</p>}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button type="button" disabled={saving} onClick={saveEmployee} className="w-full rounded-md bg-cyan-600 px-4 py-3 font-semibold text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
                {saving ? "Salvando..." : "Salvar alterações"}
              </button>

              {!confirmingDelete ? (
                <button type="button" onClick={() => setConfirmingDelete(true)} className="w-full rounded-md bg-red-700 px-4 py-3 font-semibold text-white hover:bg-red-600 sm:w-auto">
                  Excluir conta
                </button>
              ) : (
                <div className="flex w-full flex-col gap-3 rounded-md border border-red-500/40 bg-red-950/40 p-3">
                  <span className="text-sm text-red-100">Tem certeza que deseja excluir esta conta?</span>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button type="button" disabled={deleting} onClick={deleteEmployee} className="w-full rounded-md bg-red-700 px-3 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
                      {deleting ? "Excluindo..." : "Sim, excluir"}
                    </button>
                    <button type="button" disabled={deleting} onClick={() => setConfirmingDelete(false)} className="w-full rounded-md border border-white/20 px-3 py-2 text-sm font-semibold text-gray-200 hover:bg-white/10 sm:w-auto">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}