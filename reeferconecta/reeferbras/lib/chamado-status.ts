// Mapeia o status textual do chamado para uma cor de indicação visual.
export function getChamadoStatusColor(status?: string): "green" | "yellow" | "red" | "gray" {
  const normalized = status?.trim().toLowerCase() ?? "";

  if (normalized === "chamado finalizado") return "green";
  if (normalized === "chamado não realizado") return "red";
  if (normalized === "chamado em andamento" || normalized === "aberto") return "yellow";

  return "gray";
}

export const chamadoStatusBadgeClasses: Record<ReturnType<typeof getChamadoStatusColor>, string> = {
  green: "bg-emerald-100 text-emerald-700",
  yellow: "bg-yellow-100 text-yellow-700",
  red: "bg-red-100 text-red-700",
  gray: "bg-slate-200 text-slate-700",
};

export function getChamadoStatusBadgeClass(status?: string): string {
  return chamadoStatusBadgeClasses[getChamadoStatusColor(status)];
}
