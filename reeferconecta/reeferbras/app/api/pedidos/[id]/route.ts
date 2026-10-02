import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import { canCreatePedidos, pedidoSectorRoles } from "@/lib/authorization";
import { normalizeSetor } from "@/lib/catalog";
import getMongoClient from "@/lib/mongodb";

const PIECES_DATABASE = process.env.MONGODB_DATABASE_PECAS || "pecas";
const PEDIDOS_COLLECTION = "pedidosdb";

type PedidoItem = {
  nome: string;
  quantidadeSolicitada: number;
  quantidadeDisponivel: number;
  estoqueInsuficiente: boolean;
};

type PedidoResposta = {
  viavel: boolean;
  comentario?: string;
  respondidoPor: string;
  respondidoEm: string;
};

type PedidoDocument = {
  id: number;
  setor: string;
  setorLabel: string;
  observacao?: string;
  dataAte?: string;
  itens: PedidoItem[];
  estoqueInsuficiente: boolean;
  status: "pendente" | "atendido" | "cancelado";
  solicitante: string;
  createdAt: string;
  resposta?: PedidoResposta;
};

async function pedidosCollection() {
  const client = await getMongoClient();
  return client.db(PIECES_DATABASE).collection<PedidoDocument>(PEDIDOS_COLLECTION);
}

// Pessoas do setor dono do pedido (ou dev/enc/master/almox) podem ver e responder.
function canAccessThisPedido(role: string | undefined, pedidoSetor: string) {
  if (canCreatePedidos(role)) return true;
  return pedidoSectorRoles.includes((role?.trim().toLowerCase() ?? "") as (typeof pedidoSectorRoles)[number]) && normalizeSetor(role) === pedidoSetor;
}

// ============================================================
// GET /api/pedidos/[id] — detalhes completos de um pedido
// ============================================================
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ erro: "Sessão não encontrada" }, { status: 401 });

    const { id: rawId } = await params;
    const id = Number(rawId);
    if (!Number.isInteger(id)) return NextResponse.json({ erro: "ID do pedido inválido" }, { status: 400 });

    const collection = await pedidosCollection();
    const pedido = await collection.findOne({ id });
    if (!pedido) return NextResponse.json({ erro: "Pedido não encontrado" }, { status: 404 });

    if (!canAccessThisPedido(user.role, pedido.setor)) {
      return NextResponse.json({ erro: "Entrada não autorizada" }, { status: 403 });
    }

    return NextResponse.json(pedido, { status: 200 });
  } catch (err) {
    console.error("[GET /api/pedidos/[id]] erro ao buscar:", err);
    return NextResponse.json({ erro: "Não foi possível carregar o pedido." }, { status: 500 });
  }
}

// ============================================================
// PATCH /api/pedidos/[id] — setor responde se o pedido é viável até a data solicitada
// ============================================================
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ erro: "Sessão não encontrada" }, { status: 401 });

    const { id: rawId } = await params;
    const id = Number(rawId);
    if (!Number.isInteger(id)) return NextResponse.json({ erro: "ID do pedido inválido" }, { status: 400 });

    const collection = await pedidosCollection();
    const pedido = await collection.findOne({ id });
    if (!pedido) return NextResponse.json({ erro: "Pedido não encontrado" }, { status: 404 });

    if (!canAccessThisPedido(user.role, pedido.setor)) {
      return NextResponse.json({ erro: "Entrada não autorizada" }, { status: 403 });
    }

    const body = (await request.json()) as { viavel?: boolean; comentario?: string };
    if (typeof body.viavel !== "boolean") {
      return NextResponse.json({ erro: "Informe se o pedido é viável ou não." }, { status: 400 });
    }

    const resposta: PedidoResposta = {
      viavel: body.viavel,
      comentario: body.comentario?.trim() || undefined,
      respondidoPor: user.name.trim(),
      respondidoEm: new Date().toISOString(),
    };

    await collection.updateOne({ id }, { $set: { resposta } });

    return NextResponse.json({ success: true, resposta }, { status: 200 });
  } catch (err) {
    console.error("[PATCH /api/pedidos/[id]] erro ao responder:", err);
    return NextResponse.json({ erro: "Não foi possível registrar a resposta." }, { status: 500 });
  }
}
