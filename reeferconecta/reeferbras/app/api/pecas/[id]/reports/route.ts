import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import { canManagePieces } from "@/lib/authorization";
import getMongoClient from "@/lib/mongodb";

type RepairReport = {
  id: string;
  responsavelReparo: string;
  descricaoReparo: string;
  situacaoAtual: string;
  createdAt: string;
};

type PieceDocument = {
  id: number;
  qc: string;
  situacaoAtual?: string;
  reports?: RepairReport[];
};

const databaseName = process.env.MONGODB_DATABASE_PECAS || "pecas";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getSessionUser();
    if (!canManagePieces(user?.role)) {
      return NextResponse.json({ erro: "Entrada não autorizada" }, { status: 403 });
    }

    const { id: rawId } = await context.params;
    const id = Number(rawId);
    if (!Number.isInteger(id)) {
      return NextResponse.json({ erro: "ID da peça inválido" }, { status: 400 });
    }

    const body = (await request.json()) as Partial<RepairReport> & { qc?: string };
    const responsavelReparo = body.responsavelReparo?.trim();
    const descricaoReparo = body.descricaoReparo?.trim();
    const situacaoAtual = body.situacaoAtual?.trim();
    if (!responsavelReparo || !descricaoReparo || !situacaoAtual || !body.qc?.trim()) {
      return NextResponse.json({ erro: "Preencha o QC, responsável, descrição e situação." }, { status: 400 });
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

    const report: RepairReport = {
      id: randomUUID(),
      responsavelReparo,
      descricaoReparo,
      situacaoAtual,
      createdAt: new Date().toISOString(),
    };
    await collection.updateOne(
      { id },
      { $push: { reports: report }, $set: { situacaoAtual } },
    );

    return NextResponse.json({ success: true, report }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/pecas/:id/reports] erro ao salvar:", error);
    return NextResponse.json({ erro: "Não foi possível salvar o report." }, { status: 500 });
  }
}
