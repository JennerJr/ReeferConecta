"use client";

import { useState } from "react";

type Employee = {
  name: string;
  role: string;
};

type DashboardFiltersProps = {
  sectors: readonly string[];
  employees: Employee[];
  selectedSector: string;
  selectedEmployee: string;
  selectedPeriod: string;
  startDate: string;
  endDate: string;
};

function formatSector(sector: string) {
  return sector.replace("lab.", "Lab. ").replace("eletronica", "Eletrônica").replace("elétrica", "Elétrica");
}

export default function DashboardFilters({
  sectors,
  employees,
  selectedSector,
  selectedEmployee,
  selectedPeriod,
  startDate,
  endDate,
}: DashboardFiltersProps) {
  const [sector, setSector] = useState(selectedSector);
  const [employee, setEmployee] = useState(selectedEmployee);
  const [period, setPeriod] = useState(selectedPeriod);
  const [selectedStartDate, setSelectedStartDate] = useState(startDate);
  const [selectedEndDate, setSelectedEndDate] = useState(endDate);
  const employeesInSector = employees.filter((employee) => employee.role === sector);

  return (
    <form className="mt-6 grid gap-4 rounded-xl border border-slate-700 bg-slate-900/70 p-4 sm:grid-cols-2 lg:grid-cols-3 lg:items-end" action="/dashboard">
      <label className="grid gap-2 text-sm font-semibold text-slate-200">
        Setor
        <select
          className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 font-normal text-white outline-none focus:border-sky-500"
          name="sector"
          value={sector}
          onChange={(event) => {
            setSector(event.target.value);
            setEmployee("");
          }}
        >
          <option value="">Todos os setores</option>
          {sectors.map((option) => <option key={option} value={option}>{formatSector(option)}</option>)}
        </select>
      </label>
      <label className="grid gap-2 text-sm font-semibold text-slate-200">
        Funcionário
        <select
          className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 font-normal text-white outline-none focus:border-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
          name="employee"
          value={sector ? employee : ""}
          disabled={!sector}
          onChange={(event) => setEmployee(event.target.value)}
        >
          <option value="">Todos os funcionários</option>
          {employeesInSector.map((employee) => <option key={`${employee.role}-${employee.name}`} value={employee.name}>{employee.name}</option>)}
        </select>
      </label>
      <label className="grid gap-2 text-sm font-semibold text-slate-200">
        Período
        <select
          className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 font-normal text-white outline-none focus:border-sky-500"
          name="period"
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
        >
          <option value="all">Todo o período</option>
          <option value="1-month">Último mês</option>
          <option value="3-months">Últimos 3 meses</option>
          <option value="6-months">Últimos 6 meses</option>
          <option value="1-year">Último ano</option>
          <option value="custom">Período específico</option>
        </select>
      </label>
      {period === "custom" && <>
        <label className="grid gap-2 text-sm font-semibold text-slate-200">
          Data inicial
          <input className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 font-normal text-white outline-none focus:border-sky-500" type="date" name="startDate" value={selectedStartDate} onChange={(event) => setSelectedStartDate(event.target.value)} required />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-200">
          Data final
          <input className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 font-normal text-white outline-none focus:border-sky-500" type="date" name="endDate" value={selectedEndDate} onChange={(event) => setSelectedEndDate(event.target.value)} required />
        </label>
      </>}
      <button className="rounded-lg bg-sky-700 px-4 py-2 font-semibold text-white hover:bg-sky-800" type="submit">Aplicar filtros</button>
    </form>
  );
}
