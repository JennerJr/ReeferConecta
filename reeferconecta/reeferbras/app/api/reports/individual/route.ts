import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import PDFDocument from "pdfkit";
import SVGtoPDFKit from "svg-to-pdfkit";
import fs from "fs";
import path from "path";
import getMongoClient, { getMongoDatabaseName, getMongoCollectionName } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/auth-session";
import { canAccessTeams } from "@/lib/authorization";

const piecesDatabase = process.env.MONGODB_DATABASE_PECAS || "pecas";
const CM_TO_PT = 28.3465;
const HEADER_HEIGHT = 3 * CM_TO_PT; // ~85pt
const PAGE_MARGIN = 40;

type ReportItem = { id?: string; responsavelReparo?: string; situacaoAtual?: string; createdAt?: string };
type Piece = { nome?: string; reports?: ReportItem[] };

function drawHeader(doc: PDFKit.PDFDocument, userName: string, startDate: string, endDate: string) {
  console.log("cwd:", process.cwd()); // ← temporário, remova depois
  const pageWidth = doc.page.width;

  doc.rect(0, 0, pageWidth, HEADER_HEIGHT).fill("#1e1833");

  const logoPath = path.join(process.cwd(), "public", "icons", "icon.svg");
  console.log("logoPath:", logoPath); // ← temporário também
  const logoSvg = fs.readFileSync(logoPath, "utf8");
  const logoWidth = 70;
  SVGtoPDFKit(doc, logoSvg, pageWidth - PAGE_MARGIN - logoWidth, 15, { width: logoWidth });

  doc
    .fillColor("#ef4444")
    .font("Helvetica-Bold")
    .fontSize(24)
    .text("Relatório Individual de Reparos", PAGE_MARGIN, 30, {
      width: pageWidth - PAGE_MARGIN * 2,
      align: "center",
    });

  doc
    .fillColor("#ffffff")
    .font("Helvetica")
    .fontSize(11)
    .text(`Usuário: ${userName} — Período: ${startDate} a ${endDate}`, PAGE_MARGIN, 62, {
      width: pageWidth - PAGE_MARGIN * 2,
      align: "center",
    });

  doc
    .moveTo(PAGE_MARGIN, HEADER_HEIGHT)
    .lineTo(pageWidth - PAGE_MARGIN, HEADER_HEIGHT)
    .strokeColor("#e5e7eb")
    .lineWidth(1)
    .stroke();
}

function drawTableHeader(doc: PDFKit.PDFDocument, y: number, columns: { label: string; width: number }[]) {
  const tableWidth = columns.reduce((sum, c) => sum + c.width, 0);
  doc.rect(PAGE_MARGIN, y, tableWidth, 24).fill("#ef4444");
  let x = PAGE_MARGIN;
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(10);
  columns.forEach((col) => {
    doc.text(col.label, x + 6, y + 7, { width: col.width - 12 });
    x += col.width;
  });
  return y + 24;
}

function drawTable(
  doc: PDFKit.PDFDocument,
  startY: number,
  reparos: { pieceName: string; situacaoAtual: string; createdAt: string }[]
) {
  const columns = [
    { label: "Peça", width: 220 },
    { label: "Situação", width: 160 },
    { label: "Data", width: 135 },
  ];
  const rowHeight = 24;
  let y = drawTableHeader(doc, startY, columns);

  doc.font("Helvetica").fontSize(9);
  reparos.forEach((reparo, index) => {
    if (y + rowHeight > doc.page.height - PAGE_MARGIN) {
      doc.addPage();
      y = drawTableHeader(doc, PAGE_MARGIN, columns);
      doc.font("Helvetica").fontSize(9);
    }

    doc.rect(PAGE_MARGIN, y, columns.reduce((s, c) => s + c.width, 0), rowHeight)
      .fill(index % 2 === 0 ? "#f9fafb" : "#ffffff");

    let x = PAGE_MARGIN;
    doc.fillColor("#111827");
    doc.text(reparo.pieceName, x + 6, y + 7, { width: columns[0].width - 12 });
    x += columns[0].width;
    doc.text(reparo.situacaoAtual, x + 6, y + 7, { width: columns[1].width - 12 });
    x += columns[1].width;
    doc.text(new Date(reparo.createdAt).toLocaleString("pt-BR"), x + 6, y + 7, { width: columns[2].width - 12 });

    y += rowHeight;
  });

  return y;
}

function drawPieSlice(
  doc: PDFKit.PDFDocument,
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  color: string
) {
  const points: [number, number][] = [[cx, cy]];
  const steps = 48;
  for (let i = 0; i <= steps; i++) {
    const angle = startAngle + (endAngle - startAngle) * (i / steps);
    points.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
  }
  doc.polygon(...points).fill(color);
}

function drawPieChart(
  doc: PDFKit.PDFDocument,
  startY: number,
  segments: { label: string; value: number; color: string }[]
) {
  const radius = 55;
  const cx = PAGE_MARGIN + radius + 10;
  const cy = startY + radius;
  const total = segments.reduce((sum, seg) => sum + seg.value, 0);

  if (total === 0) {
    doc
      .fillColor("#6b7280")
      .font("Helvetica")
      .fontSize(10)
      .text("Sem dados suficientes para o gráfico.", PAGE_MARGIN, startY + radius);
    return startY + radius * 2 + 20;
  }

  let angle = -Math.PI / 2; // começa no topo
  segments.forEach((seg) => {
    const sliceAngle = (seg.value / total) * Math.PI * 2;
    if (seg.value > 0) drawPieSlice(doc, cx, cy, radius, angle, angle + sliceAngle, seg.color);
    angle += sliceAngle;
  });

  // Legenda ao lado do gráfico
  const legendX = cx + radius + 30;
  let legendY = startY + 10;
  segments.forEach((seg) => {
    const percent = total > 0 ? Math.round((seg.value / total) * 100) : 0;
    doc.rect(legendX, legendY, 10, 10).fill(seg.color);
    doc
      .fillColor("#111827")
      .font("Helvetica")
      .fontSize(10)
      .text(`${seg.label}: ${seg.value} (${percent}%)`, legendX + 16, legendY - 1);
    legendY += 20;
  });

  return startY + radius * 2 + 20;
}

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

  const piecesDb = client.db(piecesDatabase);

  // Reports "com QC" — embutidos na peça
  const pieces = await piecesDb
    .collection<Piece>("pecasdb")
    .find({}, { projection: { nome: 1, reports: 1 } })
    .toArray();

  const reparosComQC = pieces.flatMap((piece) =>
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
  );

  // Reports "sem QC" — coleção separada
  type SeparateReport = {
    nomePeca?: string;
    responsavelReparo?: string;
    situacaoAtual?: string;
    createdAt?: string;
  };

  const reportsSemQCRaw = await piecesDb
    .collection<SeparateReport>("reportsdb")
    .find({})
    .toArray();

  const reparosSemQC = reportsSemQCRaw
    .filter((report) => report.responsavelReparo?.trim().toLowerCase() === userNameLower)
    .filter((report) => {
      const createdAt = report.createdAt ? new Date(report.createdAt) : null;
      return createdAt && !Number.isNaN(createdAt.getTime()) && createdAt >= start && createdAt <= end;
    })
    .map((report) => ({
      pieceName: report.nomePeca?.trim() || "Peça sem nome",
      situacaoAtual: report.situacaoAtual?.trim() || "—",
      createdAt: report.createdAt!,
    }));

  const reparos = [...reparosComQC, ...reparosSemQC].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const okCount = reparos.filter((r) => r.situacaoAtual.trim().toLowerCase().startsWith("ok")).length;
  const irreparableCount = reparos.filter(
    (r) => r.situacaoAtual.trim().toLowerCase() === "sem condições de reparo"
  ).length;

  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    drawHeader(doc, targetUser.name, startDate, endDate);

    const chartBottomY = drawPieChart(doc, HEADER_HEIGHT + 20, [
      { label: "Peças OK", value: okCount, color: "#22c55e" },
      { label: "Sem condição de reparo", value: irreparableCount, color: "#ef4444" },
    ]);

    if (reparos.length === 0) {
      doc
        .fillColor("#6b7280")
        .font("Helvetica")
        .fontSize(11)
        .text("Nenhum reparo encontrado para o período selecionado.", PAGE_MARGIN, chartBottomY);
    } else {
      const finalY = drawTable(doc, chartBottomY, reparos);
      doc
        .fillColor("#ef4444")
        .font("Helvetica-Bold")
        .fontSize(11)
        .text(`Total de reparos no período: ${reparos.length}`, PAGE_MARGIN, finalY + 15);
    }

    doc.end();
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="relatorio-${targetUser.name.replace(/\s+/g, "_")}.pdf"`,
    },
  });
}