"use client";

import { useEffect, useState } from "react";

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

  useEffect(() => {
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

      loadEmployees();
      window.addEventListener("employee-created", loadEmployees);
      return () => window.removeEventListener("employee-created", loadEmployees);
      }, []);

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
                <article key={employee._id} className="flex items-center gap-4 rounded-md border border-white/10 bg-gray-800/70 p-4">
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
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}