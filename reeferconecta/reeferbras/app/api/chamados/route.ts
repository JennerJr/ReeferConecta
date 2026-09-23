import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import getMongoClient from "@/lib/mongodb";
import { notifyReportSubmitted } from "@/lib/notifications";
import { canManagePieces } from "@/lib/authorization";

type standAloneChamado = {
    titulo: string;
    descricao: string;
    pedidoPor: string;
    criadoEm: string;
    history?: ChamadoHistory[];
}

type chamadoDoc = {
  id: number;
  titulo: string;
  descricao: string;
  status: string;
  pedidoPor: string;
  criadoEm: string;
  history?: ChamadoHistory[];
}

export interface ChamadoHistory {
  id: string;
  action: "created" | "updated" | "report";
  details: string;
  userName: string;
  criadoEm: string;
}

const databaseName = process.env.MONGODB_DATABASE_CHAMADOS || "chamados";
const collectionName = "chamadosdb";
async function chamadosCollection() {
  const client = await getMongoClient();
  return client.db(databaseName).collection<chamadoDoc>(collectionName);
}

// ============================================================
// Função de validação (Zod não está disponível aqui — validação manual)
// ============================================================
function validatePiece(piece: standAloneChamado, validadeDate = true): string[] {
  const errors: string[] = [];
  const requiredFields: Array<[keyof standAloneChamado, string]> = [
    ["titulo", "Título"],
    ["descricao", "Descrição"],
    ["pedidoPor", "Pedido Por"],
  ];

  for (const [field, label] of requiredFields) {
    if (!piece[field] || !piece[field].toString().trim()) {
      errors.push(`O campo ${label} é obrigatório`);
    }
  }

  // Validação de data ou data e hora no formato aceito pelo input datetime-local.
  if (validadeDate && piece.criadoEm) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/;
    if (!dateRegex.test(piece.criadoEm)) {
      errors.push("Data de criação deve estar no formato YYYY-MM-DDTHH:mm");
    }
  }

  return errors;
}

function getCurrentDateTimeLocal(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}





// ============================================================
// GET /api/chamados — lista todos os chamados salvos no MongoDB
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const collection = await chamadosCollection();
    const pieces = await collection.find({}).sort({ id: 1 }).toArray();
 if (request.nextUrl.searchParams.get("all") === "true") {
      return NextResponse.json(pieces, { status: 200 });
    }

    const user = await getSessionUser();
    if (!user) return NextResponse.json({ erro: "Sessão não encontrada" }, { status: 401 });
    
    return NextResponse.json(pieces, { status: 200 });
  } catch (err) {
    console.error("[GET /api/chamado] falha ao ler MongoDB:", err);
    return NextResponse.json(
      { success: false, error: "Não foi possível listar os chamados" },
      { status: 500 }
    );
  }

}


// ============================================================
// POST /api/chamados — cria um novo chamado e salva no MongoDB
export async function POST(request: NextRequest) {
  
try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ erro: "Sessão não encontrada" }, { status: 401 });

    const piece = (await request.json()) as standAloneChamado;
    piece.criadoEm = piece.criadoEm || getCurrentDateTimeLocal();

    // validação
    const errors = validatePiece(piece);
    if (errors.length) {
      return NextResponse.json({ erro: errors.join('; ') }, { status: 400 });
    }

    const collection = await chamadosCollection();
    const lastPiece = await collection.findOne({}, { sort: { id: -1 } });
    const nextId = (lastPiece?.id ?? 0) + 1;
    const now = new Date().toISOString();
    const history: ChamadoHistory = {
      id: randomUUID(),
      action: "created",
      details: "Chamado Aberto",
      userName: user?.name || "Usuário desconhecido",
      criadoEm: now,
    };

    const doc: chamadoDoc = {
      id: nextId,
      titulo: piece.titulo,
      descricao: piece.descricao,
      status: "aberto",
      pedidoPor: piece.pedidoPor,
      criadoEm: now,
      history: [history],
    };

    await collection.insertOne(doc);

    // Retorna o objeto criado
    return NextResponse.json({ success: true, chamado: doc }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/chamados] erro ao salvar no MongoDB:', err);
    return NextResponse.json({ success: false, erro: 'Não foi possível salvar o chamado' }, { status: 500 });
  }
}

  // ============================================================
  // PUT /api/chamados — atualiza um chamado existente
  // ============================================================
  export async function PUT(request: NextRequest) {
    try {
      const user = await getSessionUser();
      if (!canManagePieces(user?.role)) {
        return NextResponse.json({ erro: "Entrada não autorizada" }, { status: 403 });
      }
  
      const input = (await request.json()) as Partial<chamadoDoc>;
      const id = Number(input.id);
  
      if (!Number.isInteger(id)) {
        return NextResponse.json({ erro: "ID do chamado inválido" }, { status: 400 });
      }
  
      const collection = await chamadosCollection();
      const current = await collection.findOne({ id });
  
      if (!current) {
        return NextResponse.json({ erro: "Chamado não encontrado" }, { status: 404 });
      }
  
      const updated: chamadoDoc = {
        id: current.id,
        titulo: input.titulo ?? current.titulo,
        descricao: input.descricao ?? current.descricao,
        status: input.status ?? current.status,
        pedidoPor: input.pedidoPor ?? current.pedidoPor,
        criadoEm: current.criadoEm,
        history: current.history,
      };
      const errors = validatePiece(updated, false);
  
      if (errors.length) {
        return NextResponse.json({ erro: errors.join("; ") }, { status: 400 });
      }
  
      const changedFields = [
        ["Título", current.titulo, updated.titulo],
        ["Descrição", current.descricao, updated.descricao],
        ["Status", current.status, updated.status],
        ["Pedido por", current.pedidoPor, updated.pedidoPor],
      ]
        .filter(([, previous, next]) => previous !== next)
        .map(([label, previous, next]) => `${label}: ${previous || "vazio"} → ${next || "vazio"}`);
      const history: ChamadoHistory = {
        id: randomUUID(),
        action: "updated",
        details: changedFields.length ? `Alterações: ${changedFields.join("; ")}` : "Dados revisados sem alterações",
        userName: user?.name || "Usuário desconhecido",
        criadoEm: new Date().toISOString(),
      };
      updated.history = [...(current.history ?? []), history];
  
      await collection.updateOne({ id }, { $set: updated });
  
      return NextResponse.json({ success: true, chamado: updated }, { status: 200 });
    } catch (err) {
      console.error("[PUT /api/chamados] erro ao atualizar:", err);
      return NextResponse.json({ success: false, erro: "Não foi possível atualizar o chamado" }, { status: 500 });
    }
  }