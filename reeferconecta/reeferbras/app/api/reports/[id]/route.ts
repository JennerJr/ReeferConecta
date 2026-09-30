import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import getMongoClient from "@/lib/mongodb";

type StoredReport = {
  id: string;
  tecnicoResponsavel: string;
  responsavelReparo: string;
  descricaoReparo?: string;
  situacaoAtual: string;
  ordemServico?: string;
};

type EditInput = {
  responsavelReparo?: string;
  ordemServico?: string;
  descricaoReparo?: string;
  situacaoAtual?: string;
};

const databaseName = process.env.MONGODB_DATABASE_PECAS || "pecas";
const collectionName = "reportsdb";
const situations = ["OK", "Sem condições de reparo"];

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ erro: "Sessão não encontrada" }, { status: 401 });

    const { id } = await params;
    const body = (await request.json()) as EditInput;

    const client = await getMongoClient();
    const collection = client.db(databaseName).collection<StoredReport>(collectionName);

    const existing = await collection.findOne({ id });
    if (!existing) return NextResponse.json({ erro: "Relatório não encontrado." }, { status: 404 });

    const isEnc = user.role.trim().toLowerCase() === "enc";
    const isAuthor = existing.tecnicoResponsavel.trim().toLowerCase() === user.name.trim().toLowerCase();
    if (!isEnc && !isAuthor) return NextResponse.json({ erro: "Você não pode editar este relatório." }, { status: 403 });

    const situacaoAtual = body.situacaoAtual?.trim() ?? "";
    const ordemServico = body.ordemServico?.trim() || undefined;
    const responsavelReparo = body.responsavelReparo?.trim() || existing.responsavelReparo;
    const descricaoReparo = body.descricaoReparo?.trim() ?? "";

    if (!situations.includes(situacaoAtual)) {
      return NextResponse.json({ erro: "Situação inválida." }, { status: 400 });
    }
    if (ordemServico && !/^\d+$/.test(ordemServico)) {
      return NextResponse.json({ erro: "A OS, quando informada, deve ser numérica." }, { status: 400 });
    }

    await collection.updateOne(
      { id },
      ordemServico
        ? { $set: { responsavelReparo, descricaoReparo, situacaoAtual, ordemServico } }
        : { $set: { responsavelReparo, descricaoReparo, situacaoAtual }, $unset: { ordemServico: "" } },
    );

    return NextResponse.json({ success: true, report: { responsavelReparo, descricaoReparo, situacaoAtual, ordemServico } });
  } catch (error) {
    console.error("[PATCH /api/reports/[id]] erro ao editar:", error);
    return NextResponse.json({ erro: "Não foi possível salvar a edição." }, { status: 500 });
  }
}