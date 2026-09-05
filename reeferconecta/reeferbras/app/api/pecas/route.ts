import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import { canManagePieces } from "@/lib/authorization";
import getMongoClient from "@/lib/mongodb";

// ============================================================
// Interface do registro de uma peça (formulário)
// ============================================================
interface PecaForm {
  nome: string;
  serialNumber: string;
  fabricante: string;
  localidade: string;
  tecnicoResponsavel: string;
  partNumber: string;
  dataChegada: string;
  situacaoAtual: string;
  imagemUrl?: string;
  dataSaida?: string;
}

// ============================================================
// Interface do documento salvo (com os campos extras do banco)
// ============================================================
interface PecaDocument {
  id: number;
  nome: string;
  serialNumber: string;
  fabricante: string;
  localidade: string;
  tecnicoResponsavel: string;
  partNumber: string;
  dataChegada: string;
  situacaoAtual: string;
  imagemUrl?: string;
  dataSaida?: string;
  qc: string;
  createdAt: string;
  reports?: RepairReport[];
}

export interface RepairReport {
  id: string;
  responsavelReparo: string;
  descricaoReparo: string;
  situacaoAtual: string;
  createdAt: string;
}

const PIECES_DATABASE = process.env.MONGODB_DATABASE_PECAS || "pecas";
const PIECES_COLLECTION = "pecasdb";

async function piecesCollection() {
  const client = await getMongoClient();
  return client.db(PIECES_DATABASE).collection<PecaDocument>(PIECES_COLLECTION);
}

// ============================================================
// Função de validação (Zod não está disponível aqui — validação manual)
// ============================================================
function validatePiece(piece: PecaForm): string[] {
  const errors: string[] = [];
  const requiredFields: Array<[keyof PecaForm, string]> = [
    ["nome", "Nome"],
    ["serialNumber", "Número de Série"],
    ["fabricante", "Fabricante"],
    ["tecnicoResponsavel", "Técnico Responsável"],
  ];

  for (const [field, label] of requiredFields) {
    if (!piece[field] || !piece[field].toString().trim()) {
      errors.push(`O campo ${label} é obrigatório`);
    }
  }

  // Validação de data ou data e hora no formato aceito pelo input datetime-local.
  if (piece.dataChegada) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/;
    if (!dateRegex.test(piece.dataChegada)) {
      errors.push("Data de chegada deve estar no formato YYYY-MM-DDTHH:mm");
    }
  }

  return errors;
}

// ============================================================
// Geração do QC usando a data, o serial (quando informado) e o ID da peça.
// ============================================================
function generateQC(piece: PecaForm, id: number): string {
  const dataPart = piece.dataChegada.slice(0, 10).replace(/-/g, "/");
  const serial = piece.serialNumber?.trim().replace(/[^a-zA-Z0-9]/g, "");
  return serial ? `${dataPart}-${serial}-${id}` : `${dataPart}-${id}`;
}

function getCurrentDateTimeLocal(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

// ============================================================
// GET /api/pecas — lista todas as peças salvas no MongoDB
// ============================================================
export async function GET() {
  try {
    const collection = await piecesCollection();
    const pieces = await collection.find({}).sort({ id: 1 }).toArray();
    return NextResponse.json(pieces, { status: 200 });
  } catch (err) {
    console.error("[GET /api/pecas] falha ao ler MongoDB:", err);
    return NextResponse.json(
      { success: false, error: "Não foi possível listar as peças" },
      { status: 500 }
    );
  }
}

// ============================================================
// POST /api/pecas — cria uma nova peça e salva no MongoDB

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!canManagePieces(user?.role)) {
      return NextResponse.json({ erro: "Entrada não autorizada" }, { status: 403 });
    }

    const piece = (await request.json()) as PecaForm;
    piece.dataChegada = piece.dataChegada || getCurrentDateTimeLocal();

    // validação
    const errors = validatePiece(piece);
    if (errors.length) {
      return NextResponse.json({ erro: errors.join('; ') }, { status: 400 });
    }

    const collection = await piecesCollection();
    const lastPiece = await collection.findOne({}, { sort: { id: -1 } });
    const nextId = (lastPiece?.id ?? 0) + 1;
    const qc = generateQC(piece, nextId);
    const now = new Date().toISOString();

    const doc: PecaDocument = {
      id: nextId,
      nome: piece.nome,
      serialNumber: piece.serialNumber,
      fabricante: piece.fabricante,
      localidade: piece.localidade,
      tecnicoResponsavel: piece.tecnicoResponsavel,
      partNumber: piece.partNumber,
      dataChegada: piece.dataChegada,
      situacaoAtual: piece.situacaoAtual,
      imagemUrl: piece.imagemUrl,
      dataSaida: piece.dataSaida,
      qc,
      createdAt: now,
    };

    await collection.insertOne(doc);

    // Retorna o QC para o cliente (frontend espera data.qc) e o objeto criado
    return NextResponse.json({ success: true, qc, peca: doc }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/pecas] erro ao salvar no MongoDB:', err);
    return NextResponse.json({ success: false, erro: 'Não foi possível salvar a peça' }, { status: 500 });
  }
}

// ============================================================
// PUT /api/pecas — atualiza uma peça existente
// ============================================================
export async function PUT(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!canManagePieces(user?.role)) {
      return NextResponse.json({ erro: "Entrada não autorizada" }, { status: 403 });
    }

    const input = (await request.json()) as Partial<PecaDocument>;
    const id = Number(input.id);

    if (!Number.isInteger(id)) {
      return NextResponse.json({ erro: "ID da peça inválido" }, { status: 400 });
    }

    const collection = await piecesCollection();
    const current = await collection.findOne({ id });

    if (!current) {
      return NextResponse.json({ erro: "Peça não encontrada" }, { status: 404 });
    }

    const updated: PecaDocument = {
      id: current.id,
      nome: input.nome ?? current.nome,
      serialNumber: input.serialNumber ?? current.serialNumber,
      fabricante: input.fabricante ?? current.fabricante,
      localidade: input.localidade ?? current.localidade,
      tecnicoResponsavel: input.tecnicoResponsavel ?? current.tecnicoResponsavel,
      partNumber: input.partNumber ?? current.partNumber,
      dataChegada: input.dataChegada ?? current.dataChegada,
      situacaoAtual: input.situacaoAtual ?? current.situacaoAtual,
      imagemUrl: input.imagemUrl ?? current.imagemUrl,
      dataSaida: input.dataSaida ?? current.dataSaida,
      qc: current.qc,
      createdAt: current.createdAt,
      reports: current.reports,
    };
    const errors = validatePiece(updated);

    if (errors.length) {
      return NextResponse.json({ erro: errors.join("; ") }, { status: 400 });
    }

    await collection.updateOne({ id }, { $set: updated });

    return NextResponse.json({ success: true, peca: updated }, { status: 200 });
  } catch (err) {
    console.error("[PUT /api/pecas] erro ao atualizar:", err);
    return NextResponse.json({ success: false, erro: "Não foi possível atualizar a peça" }, { status: 500 });
  }
}