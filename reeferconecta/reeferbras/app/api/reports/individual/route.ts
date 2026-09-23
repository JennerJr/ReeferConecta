import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import PDFDocument from "pdfkit";
import getMongoClient, { getMongoDatabaseName, getMongoCollectionName } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/auth-session";
import { canAccessTeams } from "@/lib/authorization";

const piecesDatabase = process.env.MONGODB_DATABASE_PECAS || "pecas";

type ReportItem = {
  id?: string;
  responsavelReparo?: string;
  situacaoAtual?: string;
  createdAt?: string;
};

type Piece = {
  nome?: string;
  reports?: ReportItem[];
};

export async function GET(request: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!canAccessTeams(sessionUser?.role)) {
    return NextResponse.json({ error: "Entrada não autorizada" }, { status: 403 });
  }

  const userId = request.nextUrl.searchParams.get("userId");
  const startDate = request.nextUrl.searchParams.get("startDate");
  const endDate = request.nextUrl.searchParams.get("endDate");

  if (!userId || !ObjectId.isValid(userId) || !startDate || !endDate) {
    return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
  }

  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T23:59:59.999Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return NextResponse.json({ error: "Período inválido" }, { status: 400 });
  }

  const client = await getMongoClient();

  const targetUser = await client
    .db(getMongoDatabaseName())
    .collection(getMongoCollectionName())
    .findOne({ _id: new ObjectId(userId) });

  if (!targetUser?.name) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  }

  const userNameLower = targetUser.name.trim().toLowerCase();

  const pieces = await client
    .db(piecesDatabase)
    .collection<Piece>("pecasdb")
    .find({}, { projection: { nome: 1, reports: 1 } })
    .toArray();

  const reparos = pieces
    .flatMap((piece) =>
      (piece.reports ?? [])
        .filter((report) => report.responsavelReparo?.trim().toLowerCase() === userNameLower)
        .filter((report) => {
          const createdAt = report.createdAt ? new Date(report.createdAt) : null;
          return createdAt && !Number.isNaN(createdAt.getTime()) && createdAt >= start && createdAt <= end;
        })
        .map((report) => ({
          pieceName: piece.nome?.trim() || "Peça sem nome",
          situacaoAtual: report.situacaoAtual?.trim() || "—",
          createdAt: report.createdAt!,
        }))
    )
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // === A PARTIR DAQUI é o trecho que muda ===
  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    const COLORS = {
      title: "#ef4444",
      text: "#000000",
      muted: "#6b7280",
    };

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc
      .fillColor(COLORS.title)
      .fontSize(20)
      .text("Relatório Individual de Reparos", { align: "center" });

    doc.moveDown();
    doc
      .fillColor(COLORS.text)
      .fontSize(12)
      .text(`Usuário: ${targetUser.name}`)
      .text(`Período: ${startDate} a ${endDate}`);

    doc.moveDown();

    if (reparos.length === 0) {
      doc.fillColor(COLORS.muted).text("Nenhum reparo encontrado para o período selecionado.");
    } else {
      reparos.forEach((reparo, index) => {
        doc
          .fillColor(COLORS.text)
          .fontSize(11)
          .text(`${index + 1}. ${reparo.pieceName}`);

        doc
          .fillColor(COLORS.muted)
          .fontSize(10)
          .text(`Situação: ${reparo.situacaoAtual}`)
          .text(`Data: ${new Date(reparo.createdAt).toLocaleString("pt-BR")}`);

        doc.moveDown(0.5);
      });

      doc.moveDown();
      doc.fillColor(COLORS.title).fontSize(11).text(`Total de reparos no período: ${reparos.length}`);
    }

    doc.end();
  });
  // === ATÉ AQUI ===

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="relatorio-${targetUser.name.replace(/\s+/g, "_")}.pdf"`,
    },
  });
}