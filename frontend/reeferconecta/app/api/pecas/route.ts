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
  terminal: string;
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
  terminal: string;
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
    ["terminal", "Terminal"],
    ["tecnicoResponsavel", "Técnico Responsável"],
  ];

  for (const [field, label] of requiredFields) {
    if (!piece[field] || !piece[field].toString().trim()) {
      errors.push(`O campo ${label} é obrigatório`);
    }
  }

  // Validação de formato de data (YYYY-MM-DD)
  if (piece.dataChegada) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(piece.dataChegada)) {
      errors.push("Data de chegada deve estar no formato YYYY-MM-DD");
    }
  }

  return errors;
}

// ============================================================
// Geração do QC (para este MVP, uma representação simples)
// Baseado em data + parte-number para ser único
// ============================================================
function generateQC(piece: PecaForm): string {
  // Se houver partNumber, usar data + parte number
  // Se não, usar data + timestamp
  const dataPart = piece.dataChegada.replace(/-/g, "");
  const partRef = piece.partNumber?.replace(/[^a-zA-Z0-9]/g, "")?.substring(0, 6) ?? "";
  return `${dataPart}${partRef}`;
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
// ============================================================...[trun