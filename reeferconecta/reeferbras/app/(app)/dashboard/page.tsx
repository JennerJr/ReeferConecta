import getMongoClient, { getMongoCollectionName, getMongoDatabaseName } from "@/lib/mongodb";
import { employeeRoles } from "@/lib/authorization";
import { getSessionUser } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

type Report = { responsavelReparo?: string };
type Piece = { situacaoAtual?: string; reports?: Report[] };
type User = { name?: string; role?: string };
type SectorReport = { sector: string; count: number };

const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#a855f7"];
const piecesDatabase = process.env.MONGODB_DATABASE_PECAS || "pecas";

function formatSector(sector: string) {
  return sector.replace("lab.", "Lab. ").replace("eletronica", "Eletrônica").replace("elétrica", "Elétrica");
}

function buildConicGradient(items: SectorReport[]) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  if (!total) return "conic-gradient(#475569 0 100%)";
  let start = 0;
  return `conic-gradient(${items.map((item, index) => {
    const end = start + (item.count / total) * 100;
    const stop = `${colors[index % colors.length]} ${start}% ${end}%`;
    start = end;
    return stop;
  }).join(", ")})`;
}

async function getDashboardData() {
  const client = await getMongoClient();
  const sessionUser = await getSessionUser();
  if (!sessionUser) throw new Error("Sessão não encontrada");
  const [pieces, users] = await Promise.all([
    client.db(piecesDatabase).collection<Piece>("pecasdb").find({}, { projection: { situacaoAtual: 1, reports: 1 } }).toArray(),
    client.db(getMongoDatabaseName()).collection<User>(getMongoCollectionName()).find({}, { projection: { name: 1, role: 1 } }).toArray(),
  ]);
  const roleByName = new Map(users.filter((user) => user.name && user.role).map((user) => [user.name!.trim().toLowerCase(), user.role!.trim().toLowerCase()]));
  const sessionRole = sessionUser.role.trim().toLowerCase();
  const canViewAllDashboard = sessionRole === "enc" || sessionRole === "dev";
  const currentUserName = sessionUser.name.trim().toLowerCase();
  const piecesWithUserReports = canViewAllDashboard
    ? pieces
    : pieces
      .map((piece) => ({
        ...piece,
        reports: piece.reports?.filter((report) => report.responsavelReparo?.trim().toLowerCase() === currentUserName),
      }))
      .filter((piece) => (piece.reports?.length ?? 0) > 0);
  const allSectors = employeeRoles.filter((role) => role !== "almox");
  const sectors = canViewAllDashboard ? allSectors : allSectors.filter((sector) => sector === sessionRole);
  const reportCounts = new Map<string, number>(allSectors.map((sector) => [sector, 0]));
  const reportPieces = canViewAllDashboard ? pieces : piecesWithUserReports;
  for (const piece of reportPieces) {
    for (const report of piece.reports ?? []) {
      const role = report.responsavelReparo ? roleByName.get(report.responsavelReparo.trim().toLowerCase()) : undefined;
      if (role && reportCounts.has(role)) reportCounts.set(role, (reportCounts.get(role) ?? 0) + 1);
    }
  }
  return {
    reportsBySector: sectors.map((sector) => ({ sector, count: reportCounts.get(sector) ?? 0 })),
    pieces: { new: piecesWithUserReports.length, ok: piecesWithUserReports.filter((piece) => piece.situacaoAtual?.trim().toLowerCase().startsWith("ok")).length },
  };
}

export default async function Dashboard() {
  let data: Awaited<ReturnType<typeof getDashboardData>>;
  try {
    data = await getDashboardData();
  } catch (error) {
    console.error("[dashboard]", error);
    return <main className="px-4 py-8 text-red-300">Não foi possível carregar o dashboard.</main>;
  }

  const totalReports = data.reportsBySector.reduce((sum, item) => sum + item.count, 0);
  const notOk = data.pieces.new - data.pieces.ok;
  return (
      <main className="min-h-screen px-4 py-8 text-slate-900 sm:px-6 sm:py-10">
        <section className="mx-auto max-w-6xl">
          <p className="text-sm font-bold uppercase tracking-widest text-red-500">ReeferConecta</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Dashboard</h1>
          <p className="mt-2 text-slate-300">Visão geral dos relatórios por setor e da situação das peças.</p>
          <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="min-w-0 rounded-xl border border-slate-700 bg-slate-900/70 p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0"><h2 className="text-xl font-semibold text-white">Relatórios por setor</h2><p className="mt-1 text-sm text-slate-400">Total: {totalReports} relatórios · Almoxarifado excluído</p></div>
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full" style={{ background: buildConicGradient(data.reportsBySector) }}><div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">{totalReports}</div></div>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">{data.reportsBySector.map((item, index) => <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-700 px-3 py-2" key={item.sector}><span className="flex min-w-0 items-center gap-2 text-sm text-slate-200"><span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />{formatSector(item.sector)}</span><strong className="text-white">{item.count}</strong></div>)}</div>
            </section>
            <section className="min-w-0 rounded-xl border border-slate-700 bg-slate-900/70 p-5 sm:p-6">
              <h2 className="text-xl font-semibold text-white">Peças novas x peças OK</h2><p className="mt-1 text-sm text-slate-400">Comparativo de todas as peças cadastradas.</p>
              <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[360px] text-left text-sm"><thead className="border-b border-slate-700 text-slate-400"><tr><th className="px-3 py-3 font-medium">Categoria</th><th className="px-3 py-3 text-right font-medium">Quantidade</th><th className="px-3 py-3 text-right font-medium">Percentual</th></tr></thead><tbody className="text-slate-200">{[["Peças novas", data.pieces.new], ["Peças OK", data.pieces.ok], ["Ainda não OK", notOk]].map(([label, count]) => <tr className="border-b border-slate-800" key={label}><td className="px-3 py-3">{label}</td><td className="px-3 py-3 text-right font-semibold text-white">{count}</td><td className="px-3 py-3 text-right">{data.pieces.new ? `${Math.round((Number(count) / data.pieces.new) * 100)}%` : "0%"}</td></tr>)}</tbody></table></div>
            </section>
          </div>
        </section>
      </main>
  );
}
