import getMongoClient from "@/lib/mongodb";

const piecesDatabase = process.env.MONGODB_DATABASE_PECAS || "pecas";

type PecaStockDocument = { nome?: string; situacaoAtual?: string };
type ReportStockDocument = { nomePeca?: string; situacaoAtual?: string };

export type AvailableQuantity = { comQc: number; semQc: number; total: number };

function isOk(status?: string) {
  return status?.trim().toLowerCase().startsWith("ok") ?? false;
}

// Soma peças "com QC" (pecasdb) e "sem QC" (reportsdb) marcadas como OK para um nome de peça.
export async function getAvailableQuantities(nomes: string[]): Promise<Map<string, AvailableQuantity>> {
  const client = await getMongoClient();
  const db = client.db(piecesDatabase);
  const [pieces, reports] = await Promise.all([
    db.collection<PecaStockDocument>("pecasdb").find({}, { projection: { nome: 1, situacaoAtual: 1 } }).toArray(),
    db.collection<ReportStockDocument>("reportsdb").find({}, { projection: { nomePeca: 1, situacaoAtual: 1 } }).toArray(),
  ]);

  const result = new Map<string, AvailableQuantity>();
  for (const nome of nomes) {
    const normalizedNome = nome.trim().toLowerCase();
    if (result.has(normalizedNome)) continue;
    const comQc = pieces.filter((piece) => piece.nome?.trim().toLowerCase() === normalizedNome && isOk(piece.situacaoAtual)).length;
    const semQc = reports.filter((report) => report.nomePeca?.trim().toLowerCase() === normalizedNome && isOk(report.situacaoAtual)).length;
    result.set(normalizedNome, { comQc, semQc, total: comQc + semQc });
  }
  return result;
}
