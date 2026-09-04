import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

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
}

// ============================================================
// Caminho do arquivo local de fallback
// ============================================================
const LOCAL_DATA_FILE = path.join(process.cwd(), "data", "pecas.json");

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
// Helper para carregar/salvar o arquivo local
// ============================================================
interface LocalStore {
  pecas: PecaDocument[];
}

function loadLocalStore(): LocalStore {
  try {
    if (fs.existsSync(LOCAL_DATA_FILE)) {
      const raw = fs.readFileSync(LOCAL_DATA_FILE, "utf-8");
      return JSON.parse(raw) as LocalStore;
    }
  } catch {
    // Se o arquivo existir mas estiver corrompido, ignora e recomeça
  }
  return { pecas: [] };
}

function saveLocalStore(store: LocalStore): void {
  // Garante que o diretório data/ existe
  const dataDir = path.dirname(LOCAL_DATA_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(LOCAL_DATA_FILE, JSON.stringify(store, null, 2), "utf-8");
}

// ============================================================
// GET /api/pecas — lista todas as peças salvas localmente
// ============================================================
export async function GET() {
  try {
    const store = loadLocalStore();
    return NextResponse.json(store.pecas, { status: 200 });
  } catch (err) {
    console.error("[GET /api/pecas] falha ao ler local:", err);
    return NextResponse.json(
      { success: false, error: "Não foi possível listar as peças" },
      { status: 500 }
    );
  }
}

// ============================================================
// POST /api/pecas — cria uma nova peça e salva localmente

export async function POST(request: NextRequest) {
  try {
    const piece = (await request.json()) as PecaForm;
    piece.dataChegada = piece.dataChegada || getCurrentDateTimeLocal();

    // validação
    const errors = validatePiece(piece);
    if (errors.length) {
      return NextResponse.json({ erro: errors.join('; ') }, { status: 400 });
    }

    const store = loadLocalStore();
    const nextId = (store.pecas.reduce((max, p) => Math.max(max, p.id), 0) || 0) + 1;
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

    store.pecas.push(doc);
    saveLocalStore(store);

    // Retorna o QC para o cliente (frontend espera data.qc) e o objeto criado
    return NextResponse.json({ success: true, qc, peca: doc }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/pecas] erro ao salvar:', err);
    return NextResponse.json({ success: false, erro: 'Não foi possível salvar a peça' }, { status: 500 });
  }
}

// ============================================================
// PUT /api/pecas — atualiza uma peça existente
// ============================================================
export async function PUT(request: NextRequest) {
  try {
    const input = (await request.json()) as Partial<PecaDocument>;
    const id = Number(input.id);

    if (!Number.isInteger(id)) {
      return NextResponse.json({ erro: "ID da peça inválido" }, { status: 400 });
    }

    const store = loadLocalStore();
    const index = store.pecas.findIndex((piece) => piece.id === id);

    if (index === -1) {
      return NextResponse.json({ erro: "Peça não encontrada" }, { status: 404 });
    }

    const current = store.pecas[index];
    const updated: PecaDocument = {
      ...current,
      ...input,
      id: current.id,
      qc: current.qc,
      createdAt: current.createdAt,
    };
    const errors = validatePiece(updated);

    if (errors.length) {
      return NextResponse.json({ erro: errors.join("; ") }, { status: 400 });
    }

    store.pecas[index] = updated;
    saveLocalStore(store);

    return NextResponse.json({ success: true, peca: updated }, { status: 200 });
  } catch (err) {
    console.error("[PUT /api/pecas] erro ao atualizar:", err);
    return NextResponse.json({ success: false, erro: "Não foi possível atualizar a peça" }, { status: 500 });
  }
}