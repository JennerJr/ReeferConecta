import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import getMongoClient, { getMongoCollectionName, getMongoDatabaseName } from "@/lib/mongodb";
import { employeeRoles } from "@/lib/authorization";

type Report = {
  responsavelReparo?: string;
};

type Piece = {
  situacaoAtual?: string;
  reports?: Report[];
};

type User = {
  name?: string;
  role?: string;
};

const piecesDatabase = process.env.MONGODB_DATABASE_PECAS || "pecas";
const piecesCollection = "pecasdb";

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return NextResponse.json({ error: "Sessão não encontrada" }, { status: 401 });

    const client = await getMongoClient();
    const [pieces, users] = await Promise.all([
      client.db(piecesDatabase).collection<Piece>(piecesCollection).find({}, { projection: { situacaoAtual: 1, reports: 1 } }).toArray(),
      client.db(getMongoDatabaseName()).collection<User>(getMongoCollectionName()).find({}, { projection: { name: 1, role: 1 } }).toArray(),
    ]);

    const roleByName = new Map(
      users
        .filter((user) => user.name && user.role)
        .map((user) => [user.name!.trim().toLowerCase(), user.role!.trim().toLowerCase()]),
    );
    const sectors = employeeRoles.filter((role) => role !== "almox");
    const reportCounts = new Map<string, number>(sectors.map((sector) => [sector, 0]));

    for (const piece of pieces) {
      for (const report of piece.reports ?? []) {
        const role = report.responsavelReparo ? roleByName.get(report.responsavelReparo.trim().toLowerCase()) : undefined;
        if (role && role !== "almox" && reportCounts.has(role)) {
          reportCounts.set(role, (reportCounts.get(role) ?? 0) + 1);
        }
      }
    }

    return NextResponse.json({
      reportsBySector: sectors.map((sector) => ({ sector, count: reportCounts.get(sector) ?? 0 })),
      pieces: {
        new: pieces.length,
        ok: pieces.filter((piece) => piece.situacaoAtual?.trim().toLowerCase().startsWith("ok")).length,
      },
    });
  } catch (error) {
    console.error("[GET /api/dashboard]", error);
    return NextResponse.json({ error: "Não foi possível carregar o dashboard" }, { status: 500 });
  }
}
