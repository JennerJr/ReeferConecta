import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import getMongoClient from "@/lib/mongodb";
import { notifyReportSubmitted } from "@/lib/notifications";

type RepairReport = {
  id: string;
  responsavelReparo: string;
  descricaoReparo?: string;
  situacaoAtual: string;
  resistencia?: string;
  surge?: string;
  mega?: string;
  simulador?: string;
  corrente?: string;
  transformador?: string;
  inspeçãoVisual?: string;
  ordemServico?: string;
  serialNumberReport?: string;
  estatorTrocado?: string;
  scroll?: string;
  reparoFalange?: string;
  analiseMecanica?: string;
  testeFuncionamento?: string;
  outroTesteFuncionamento?: string;
  createdAt: string;
};

type PieceDocument = {
  id: number;
  qc: string;
  situacaoAtual?: string;
  reports?: RepairReport[];
  history?: PieceHistory[];
};

type PieceHistory = {
  id: string;
  action: "created" | "updated" | "report";
  details: string;
  userName: string;
  createdAt: string;
};

const databaseName = process.env.MONGODB_DATABASE_PECAS || "pecas";
const visualInspectionOptions = ["BIELA", "BOMBA DE LUBRIFICAÇÃO", "BORNE", "BUCHA", "CAMISA", "EIXO GIRA BREQUIM", "ESTATOR", "FILTRO", "PISTÕES", "PLACA DE VÁLVULAS"];
const mechanicalAnalysisOptions = ["Anel Guia do SCROLL", "Bucha Exêntrica", "Bucha do Mancal", "Cabeçote", "Conjunto de virabrequim", "Disco de compressão", "Mancal de virabrequim", "Mola do mecanismo de flutuação", "Selo Flutuante", "SCROLL fixo", "SCROLL movel", "Válvula de Retenção"];
const functionTestOptions = ["Corrente de operação entre 3A à 8A (BANCADA)", "Pressurização", "320 Psi à 400 Psi", "Teste em Container \"Baby\""];

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ erro: "Sessão não encontrada" }, { status: 401 });
    }

    const { id: rawId } = await context.params;
    const id = Number(rawId);
    if (!Number.isInteger(id)) {
      return NextResponse.json({ erro: "ID da peça inválido" }, { status: 400 });
    }

    const body = (await request.json()) as Partial<RepairReport> & { qc?: string; notify?: boolean };
    const responsavelReparo = user.name.trim();
    const descricaoReparo = body.descricaoReparo?.trim() || undefined;
    const submittedSituation = body.situacaoAtual?.trim();
    if (!responsavelReparo || !submittedSituation || !body.qc?.trim()) {
      return NextResponse.json({ erro: "Preencha o QC, responsável e situação." }, { status: 400 });
    }
    const surgeValues = body.surge?.trim() ? body.surge.split("/").map((value) => value.trim()).filter(Boolean) : [];
    if (surgeValues.length > 0 && surgeValues.length !== 3) {
      return NextResponse.json({ erro: "Informe as três medições de Surge." }, { status: 400 });
    }
    const selectedVisualInspections = body.inspeçãoVisual?.split(" / ").filter((value) => visualInspectionOptions.includes(value)) ?? [];
    const selectedMechanicalAnalysis = body.analiseMecanica?.split(" / ").filter((value) => mechanicalAnalysisOptions.includes(value)) ?? [];
    const selectedFunctionTests = body.testeFuncionamento?.split(" / ").filter((value) => functionTestOptions.includes(value)) ?? [];
    if (body.inspeçãoVisual?.trim() && selectedVisualInspections.length === 0) {
      return NextResponse.json({ erro: "Selecione uma opção válida de inspeção visual." }, { status: 400 });
    }
    if (body.analiseMecanica?.trim() && selectedMechanicalAnalysis.length === 0) {
      return NextResponse.json({ erro: "Selecione uma opção válida de análise mecânica." }, { status: 400 });
    }
    if (body.testeFuncionamento?.trim() && selectedFunctionTests.length === 0) {
      return NextResponse.json({ erro: "Selecione uma opção válida de teste de funcionamento." }, { status: 400 });
    }

    const collection = (await getMongoClient())
      .db(databaseName)
      .collection<PieceDocument>("pecasdb");
    const piece = await collection.findOne({ id });
    if (!piece) {
      return NextResponse.json({ erro: "Peça não encontrada" }, { status: 404 });
    }
    if (piece.qc !== body.qc.trim()) {
      return NextResponse.json({ erro: "QC não corresponde à peça selecionada." }, { status: 400 });
    }

    const replacement = submittedSituation === "Sem condições de reparo"
      ? "Sem condições de reparo"
      : "OK";
    const situacaoAtual = piece.situacaoAtual?.replace(/^Em reparo\b/i, replacement) || submittedSituation;
    const optionalMeasurements = {
      resistencia: body.resistencia?.trim() ? `${body.resistencia.trim()} Ω` : undefined,
      surge: surgeValues.length ? surgeValues.map((value) => `${value}%`).join(" / ") : undefined,
      mega: body.mega?.trim() ? `${body.mega.trim()} Ω` : undefined,
      simulador: body.simulador?.trim() || undefined,
      corrente: body.corrente?.trim() ? `${body.corrente.trim()} A` : undefined,
      transformador: body.transformador?.trim() ? `${body.transformador.trim()} V AC` : undefined,
      inspeçãoVisual: selectedVisualInspections.length ? selectedVisualInspections.join(" / ") : undefined,
      ordemServico: body.ordemServico?.trim() || undefined,
      serialNumberReport: body.serialNumberReport?.trim() || undefined,
      estatorTrocado: body.estatorTrocado?.trim() || undefined,
      scroll: body.scroll?.trim() || undefined,
      reparoFalange: body.reparoFalange?.trim() || undefined,
      analiseMecanica: selectedMechanicalAnalysis.length ? selectedMechanicalAnalysis.join(" / ") : undefined,
      testeFuncionamento: selectedFunctionTests.length ? selectedFunctionTests.join(" / ") : undefined,
      outroTesteFuncionamento: body.outroTesteFuncionamento?.trim() || undefined,
    };

    const report: RepairReport = {
      id: randomUUID(),
      responsavelReparo,
      descricaoReparo,
      situacaoAtual,
      ...optionalMeasurements,
      createdAt: new Date().toISOString(),
    };
    const history: PieceHistory = {
      id: randomUUID(),
      action: "report",
      details: `Report criado. Situação: ${situacaoAtual}${descricaoReparo ? `. Descrição: ${descricaoReparo}` : ""}`,
      userName: user?.name || "Usuário desconhecido",
      createdAt: report.createdAt,
    };
    await collection.updateOne(
      { id },
      {
        $set: {
          situacaoAtual,
          reports: [...(piece.reports ?? []), report],
          history: [...(piece.history ?? []), history],
        },
      },
    );

    if (body.notify !== false) {
      await notifyReportSubmitted(responsavelReparo, user.role, `${responsavelReparo} enviou um relatório para a peça QC ${piece.qc}.`);
    }

    return NextResponse.json({ success: true, report }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/pecas/:id/reports] erro ao salvar:", error);
    return NextResponse.json({ erro: "Não foi possível salvar o report." }, { status: 500 });
  }
}
