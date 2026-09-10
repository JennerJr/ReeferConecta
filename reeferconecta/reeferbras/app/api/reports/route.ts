import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import getMongoClient from "@/lib/mongodb";

type StandaloneReport = {
  id: string;
  responsavelReparo: string;
  descricaoReparo?: string;
  nomePeca: string;
  tecnicoResponsavel: string;
  situacaoAtual: string;
  ordemServico?: string;
  resistencia?: string;
  surge?: string;
  mega?: string;
  simulador?: string;
  corrente?: string;
  transformador?: string;
  inspeçãoVisual?: string;
  serialNumberReport?: string;
  estatorTrocado?: string;
  scroll?: string;
  reparoFalange?: string;
  analiseMecanica?: string;
  testeFuncionamento?: string;
  outroTesteFuncionamento?: string;
  createdAt: string;
};

type ReportInput = Omit<StandaloneReport, "id" | "responsavelReparo" | "createdAt">;

const databaseName = process.env.MONGODB_DATABASE_PECAS || "pecas";
const collectionName = "reportsdb";
const visualInspectionOptions = ["BIELA", "BOMBA DE LUBRIFICAÇÃO", "BORNE", "BUCHA", "CAMISA", "EIXO GIRA BREQUIM", "ESTATOR", "FILTRO", "PISTÕES", "PLACA DE VÁLVULAS"];
const mechanicalAnalysisOptions = ["Anel Guia do SCROLL", "Bucha Exêntrica", "Bucha do Mancal", "Cabeçote", "Conjunto de virabrequim", "Disco de compressão", "Mancal de virabrequim", "Mola do mecanismo de flutuação", "Selo Flutuante", "SCROLL fixo", "SCROLL movel", "Válvula de Retenção"];
const functionTestOptions = ["Corrente de operação entre 3A à 8A (BANCADA)", "Pressurização", "320 Psi à 400 Psi", "Teste em Container \"Baby\""];

type PieceReport = Omit<StandaloneReport, "ordemServico"> & { ordemServico?: string };
type Piece = { id: number; nome?: string; fabricante?: string; qc?: string; reports?: PieceReport[] };

function validList(value: string | undefined, options: string[]) {
  const values = value?.split(" / ").map((item) => item.trim()).filter(Boolean) ?? [];
  return { values, valid: !value?.trim() || (values.length > 0 && values.every((item) => options.includes(item))) };
}

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ erro: "Sessão não encontrada" }, { status: 401 });
    const client = await getMongoClient();
    const [standaloneReports, pieces] = await Promise.all([
      client.db(databaseName).collection<StandaloneReport>(collectionName).find({}).toArray(),
      client.db(databaseName).collection<Piece>("pecasdb").find({}, { projection: { id: 1, nome: 1, fabricante: 1, qc: 1, reports: 1 } }).toArray(),
    ]);
    const canViewAll = user.role.trim().toLowerCase() === "enc";
    const name = user.name.trim().toLowerCase();
    const visibleStandalone = canViewAll ? standaloneReports : standaloneReports.filter((report) => report.responsavelReparo.trim().toLowerCase() === name);
    const pieceReports = pieces.flatMap((piece) => (piece.reports ?? [])
      .filter((report) => canViewAll || report.responsavelReparo.trim().toLowerCase() === name)
      .map((report) => ({ ...report, pieceId: piece.id, pieceName: piece.nome, manufacturer: piece.fabricante, qc: piece.qc })));
    const reports = [
      ...pieceReports,
      ...visibleStandalone.map((report) => ({ ...report, pieceId: undefined, pieceName: "Report sem peça", manufacturer: "", qc: "" })),
    ].sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime());
    return NextResponse.json({ reports });
  } catch (error) {
    console.error("[GET /api/reports] erro ao carregar:", error);
    return NextResponse.json({ erro: "Não foi possível carregar os reports." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ erro: "Sessão não encontrada" }, { status: 401 });
    const role = user.role.trim().toLowerCase();
    const body = (await request.json()) as { reports?: ReportInput[] };
    const inputs = body.reports ?? [];
    if (!inputs.length || inputs.length > 50) return NextResponse.json({ erro: "Envie entre 1 e 50 reports." }, { status: 400 });

    const reports: StandaloneReport[] = [];
    for (const input of inputs) {
      const ordemServico = input.ordemServico?.trim() || undefined;
      const situacaoAtual = input.situacaoAtual?.trim();
      const nomePeca = input.nomePeca?.trim();
      if ((ordemServico && !/^\d+$/.test(ordemServico)) || !nomePeca || !situacaoAtual) {
        return NextResponse.json({ erro: "Preencha o nome da peça e a situação. A OS, quando informada, deve ser numérica." }, { status: 400 });
      }
      const visual = validList(input.inspeçãoVisual, visualInspectionOptions);
      const mechanical = validList(input.analiseMecanica, mechanicalAnalysisOptions);
      const tests = validList(input.testeFuncionamento, functionTestOptions);
      if (!visual.valid || !mechanical.valid || !tests.valid) return NextResponse.json({ erro: "Uma das seleções do report é inválida." }, { status: 400 });
      if (role === "cereco" && input.scroll === "Sim" && input.reparoFalange !== "Sim" && input.reparoFalange !== "Não") {
        return NextResponse.json({ erro: "Informe se houve reparo da falange." }, { status: 400 });
      }
      reports.push({
        ...input,
        ordemServico,
        nomePeca,
        tecnicoResponsavel: user.name.trim(),
        situacaoAtual,
        responsavelReparo: user.name.trim(),
        id: randomUUID(),
        createdAt: new Date().toISOString(),
        resistencia: role === "lab.elétrica" ? input.resistencia?.trim() || undefined : undefined,
        surge: role === "lab.elétrica" ? input.surge?.trim() || undefined : undefined,
        mega: role === "lab.elétrica" ? input.mega?.trim() || undefined : undefined,
        simulador: role === "lab.elétrica" ? input.simulador?.trim() || undefined : undefined,
        corrente: role === "lab.elétrica" ? input.corrente?.trim() || undefined : undefined,
        transformador: role === "lab.elétrica" ? input.transformador?.trim() || undefined : undefined,
        inspeçãoVisual: role === "cereco" && visual.values.length ? visual.values.join(" / ") : undefined,
        serialNumberReport: role === "cereco" ? input.serialNumberReport?.trim() || undefined : undefined,
        estatorTrocado: role === "cereco" ? input.estatorTrocado?.trim() || undefined : undefined,
        scroll: role === "cereco" ? input.scroll?.trim() || undefined : undefined,
        reparoFalange: role === "cereco" ? input.reparoFalange?.trim() || undefined : undefined,
        analiseMecanica: role === "cereco" && mechanical.values.length ? mechanical.values.join(" / ") : undefined,
        testeFuncionamento: role === "cereco" && tests.values.length ? tests.values.join(" / ") : undefined,
        outroTesteFuncionamento: role === "cereco" ? input.outroTesteFuncionamento?.trim() || undefined : undefined,
      });
    }

    const collection = (await getMongoClient()).db(databaseName).collection<StandaloneReport>(collectionName);
    await collection.insertMany(reports);
    return NextResponse.json({ success: true, reports }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/reports] erro ao salvar:", error);
    return NextResponse.json({ erro: "Não foi possível salvar os reports sem QC." }, { status: 500 });
  }
}
