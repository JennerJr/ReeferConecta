import getMongoClient, { getMongoCollectionName, getMongoDatabaseName } from "@/lib/mongodb";
import { employeeRoles } from "@/lib/authorization";
import { getSessionUser } from "@/lib/auth-session";
import DashboardFilters from "./dashboard-filters";
import DashboardReportsTabs from "./dashboard-reports-tabs";

export const dynamic = "force-dynamic";

type Report = { id?: string; responsavelReparo?: string; situacaoAtual?: string; createdAt?: string };
type Piece = { nome?: string; situacaoAtual?: string; reports?: Report[] };
type User = { name?: string; role?: string };
type RecentOkReport = { id: string; pieceName: string; responsibleName: string; createdAt: string };

const piecesDatabase = process.env.MONGODB_DATABASE_PECAS || "pecas";
const encFilterableSectors = ["lab.elétrica", "lab.eletronica", "cereco"] as const;
const masterFilterableSectors = ["enc"] as const;
const periods = ["all", "1-month", "3-months", "6-months", "1-year", "custom"] as const;

function formatSector(sector: string) {
  return sector.replace("lab.", "Lab. ").replace("eletronica", "Eletrônica").replace("elétrica", "Elétrica");
}

function getSingleSearchParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function getPeriodRange(period: string, startDate: string, endDate: string) {
  if (period === "custom") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) return null;
    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T23:59:59.999Z`);
    return !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start <= end ? { start, end } : null;
  }

  const months = period === "1-month" ? 1 : period === "3-months" ? 3 : period === "6-months" ? 6 : period === "1-year" ? 12 : 0;
  if (!months) return null;
  const end = new Date();
  const start = new Date(end);
  start.setMonth(start.getMonth() - months);
  return { start, end };
}

async function getDashboardData(filters: { sector: string; employee: string; period: string; startDate: string; endDate: string }) {
  const client = await getMongoClient();
  const sessionUser = await getSessionUser();
  if (!sessionUser) throw new Error("Sessão não encontrada");
  const [pieces, users] = await Promise.all([
    client.db(piecesDatabase).collection<Piece>("pecasdb").find({}, { projection: { nome: 1, situacaoAtual: 1, reports: 1 } }).toArray(),
    client.db(getMongoDatabaseName()).collection<User>(getMongoCollectionName()).find({}, { projection: { name: 1, role: 1 } }).toArray(),
  ]);
  const roleByName = new Map(users.filter((user) => user.name && user.role).map((user) => [user.name!.trim().toLowerCase(), user.role!.trim().toLowerCase()]));
  const sessionRole = sessionUser.role.trim().toLowerCase();
  const canViewAllDashboard = sessionRole === "enc" || sessionRole === "dev" || sessionRole === "master";
  const currentUserName = sessionUser.name.trim().toLowerCase();
  const filterableSectors: readonly string[] = sessionRole === "master" ? masterFilterableSectors : encFilterableSectors;
  const canFilterReports = sessionRole === "enc" || sessionRole === "master";
  const selectedSector = canFilterReports && filterableSectors.includes(filters.sector)
    ? filters.sector
    : sessionRole === "master" ? "enc" : "";
  const employees = users
    .flatMap((user) => {
      const name = user.name?.trim();
      const role = user.role?.trim().toLowerCase();
      return name && role ? [{ name, role }] : [];
    })
    .filter((user) => filterableSectors.includes(user.role))
    .sort((first, second) => first.name.localeCompare(second.name, "pt-BR"));
  const validEmployee = selectedSector
    ? employees.find((user) => user.role === selectedSector && user.name.toLowerCase() === filters.employee.toLowerCase())?.name ?? ""
    : "";
  const selectedPeriod = canFilterReports && periods.includes(filters.period as (typeof periods)[number]) ? filters.period : "all";
  const periodRange = getPeriodRange(selectedPeriod, filters.startDate, filters.endDate);
  const matchesReportFilter = (report: Report) => {
    const responsibleName = report.responsavelReparo?.trim().toLowerCase();
    if (!responsibleName) return false;
    if (periodRange) {
      const createdAt = report.createdAt ? new Date(report.createdAt) : null;
      if (!createdAt || Number.isNaN(createdAt.getTime()) || createdAt < periodRange.start || createdAt > periodRange.end) return false;
    }
    if (!canViewAllDashboard) return responsibleName === currentUserName;
    const reportRole = roleByName.get(responsibleName);
    return (!selectedSector || reportRole === selectedSector)
      && (!validEmployee || responsibleName === validEmployee.toLowerCase());
  };
  const piecesWithFilteredReports = pieces
    .map((piece) => ({ ...piece, reports: piece.reports?.filter(matchesReportFilter) }))
    .filter((piece) => (piece.reports?.length ?? 0) > 0);
  const recentOkReports: RecentOkReport[] = piecesWithFilteredReports
    .flatMap((piece) => (piece.reports ?? [])
      .filter((report) => report.situacaoAtual?.trim().toLowerCase().startsWith("ok") && report.createdAt && report.responsavelReparo?.trim())
      .map((report) => ({
        id: report.id || `${report.createdAt}-${piece.nome}`,
        pieceName: piece.nome?.trim() || "Peça sem nome",
        responsibleName: report.responsavelReparo!.trim(),
        createdAt: report.createdAt!,
      })))
    .sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime())
    .slice(0, 10);
  const allSectors = sessionRole === "master"
    ? [...masterFilterableSectors]
    : employeeRoles.filter((role) => !["almox", "enc", "master", "dev"].includes(role));
  const canViewOperationalSectorReports = canViewAllDashboard || sessionRole === "almox";
  const sectors = selectedSector
    ? [selectedSector]
    : canViewOperationalSectorReports ? allSectors : allSectors.filter((sector) => sector === sessionRole);
  const reportCounts = new Map<string, number>(allSectors.map((sector) => [sector, 0]));
  const piecesForSectorReport = sessionRole === "almox" ? pieces : piecesWithFilteredReports;
  for (const piece of piecesForSectorReport) {
    for (const report of piece.reports ?? []) {
      const role = report.responsavelReparo ? roleByName.get(report.responsavelReparo.trim().toLowerCase()) : undefined;
      if (role && reportCounts.has(role)) reportCounts.set(role, (reportCounts.get(role) ?? 0) + 1);
    }
  }
  return {
    reportsBySector: sectors.map((sector) => ({ label: formatSector(sector), count: reportCounts.get(sector) ?? 0 })),
    pieces: {
      ok: piecesWithFilteredReports.filter((piece) => piece.situacaoAtual?.trim().toLowerCase().startsWith("ok")).length,
      irreparable: piecesWithFilteredReports.filter((piece) => piece.situacaoAtual?.trim().toLowerCase() === "sem condições de reparo").length,
    },
    recentOkReports,
    filters: canFilterReports ? {
      sectors: filterableSectors,
      employees,
      selectedSector,
      selectedEmployee: validEmployee,
      selectedPeriod,
      startDate: selectedPeriod === "custom" && periodRange ? filters.startDate : "",
      endDate: selectedPeriod === "custom" && periodRange ? filters.endDate : "",
    } : null,
  };
}

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ sector?: string | string[]; employee?: string | string[]; period?: string | string[]; startDate?: string | string[]; endDate?: string | string[] }>;
}) {
  let data: Awaited<ReturnType<typeof getDashboardData>>;
  try {
    const params = await searchParams;
    data = await getDashboardData({
      sector: getSingleSearchParam(params.sector),
      employee: getSingleSearchParam(params.employee),
      period: getSingleSearchParam(params.period),
      startDate: getSingleSearchParam(params.startDate),
      endDate: getSingleSearchParam(params.endDate),
    });
  } catch (error) {
    console.error("[dashboard]", error);
    return <main className="px-4 py-8 text-red-300">Não foi possível carregar o dashboard.</main>;
  }

  const pieceCategories = [
    { label: "Peças OK", count: data.pieces.ok },
    { label: "Peças sem condições de reparo", count: data.pieces.irreparable },
  ];
  return (
      <main className="min-h-screen px-4 py-8 text-slate-900 sm:px-6 sm:py-10">
        <section className="mx-auto max-w-6xl">
          <p className="text-sm font-bold uppercase tracking-widest text-red-500">ReeferConecta</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Dashboard</h1>
          <p className="mt-2 text-slate-300">Visão geral dos relatórios por setor e da situação das peças.</p>
          {data.filters && <DashboardFilters {...data.filters} />}
          <DashboardReportsTabs reportsBySector={data.reportsBySector} pieceCategories={pieceCategories} />
          <section className="mt-8 rounded-xl border border-slate-700 bg-slate-900/70 p-5 sm:p-6">
            <div><h2 className="text-xl font-semibold text-white">Histórico de relatórios</h2><p className="mt-1 text-sm text-slate-400">Os 10 relatórios mais recentes com resultado OK.</p></div>
            {data.recentOkReports.length ? <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="border-b border-slate-700 text-slate-400"><tr><th className="px-3 py-3 font-medium">Peça</th><th className="px-3 py-3 font-medium">Usuário</th><th className="px-3 py-3 font-medium">Data do relatório</th></tr></thead><tbody className="text-slate-200">{data.recentOkReports.map((report) => <tr className="border-b border-slate-800" key={report.id}><td className="px-3 py-3 font-semibold text-white">{report.pieceName}</td><td className="px-3 py-3">{report.responsibleName}</td><td className="px-3 py-3">{new Date(report.createdAt).toLocaleString("pt-BR")}</td></tr>)}</tbody></table></div> : <p className="mt-6 rounded-lg border border-slate-700 px-4 py-3 text-sm text-slate-400">Nenhum relatório com resultado OK foi encontrado para os filtros selecionados.</p>}
          </section>
        </section>
      </main>
  );
}
