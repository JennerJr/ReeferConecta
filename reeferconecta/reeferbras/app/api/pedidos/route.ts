import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import { canAccessPedidos, canCreatePedidos, canDeletePedidos } from "@/lib/authorization";
import { getPartsForSetor, normalizeSetor, setorTabs } from "@/lib/catalog";
import { getAvailableQuantities } from "@/lib/pedidos-stock";
import { notifyPedidoCreated, notifySectorUsers } from "@/lib/notifications";
import getMongoClient from "@/lib/mongodb";

const PIECES_DATABASE = process.env.MONGODB_DATABASE_PECAS || "pecas";
const PEDIDOS_COLLECTION = "pedidosdb";

type PedidoItemInput = { nome?: string; quantidade?: number };

export type PedidoItem = {
  nome: string;
  quantidadeSolicitada: number;
  quantidadeDisponivel: number;
  estoqueInsuficiente: boolean;
};

export type PedidoResposta = {
  viavel: boolean;
  comentario?: string;
  respondidoPor: string;
  respondidoEm: string;
};

export type PedidoDocument = {
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

function resolveSetorLabel(setorValue: string) {
  return setorTabs.find((tab) => tab.value === setorValue)?.label ?? setorValue;
}

// ============================================================
// GET /api/pedidos — lista pedidos (setores só veem os próprios)
// ============================================================
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ erro: "Sessão não encontrada" }, { status: 401 });
    if (!canAccessPedidos(user.role)) {
      return NextResponse.json({ erro: "Entrada não autorizada" }, { status: 403 });
    }

    const collection = await pedidosCollection();
    const pedidos = await collection.find({}).sort({ id: -1 }).toArray();

    const role = normalizeSetor(user.role);
    const visiblePedidos = canCreatePedidos(user.role)
      ? pedidos
      : pedidos.filter((pedido) => pedido.setor === role);

    return NextResponse.json(visiblePedidos, { status: 200 });
  } catch (err) {
    console.error("[GET /api/pedidos] falha ao ler MongoDB:", err);
    return NextResponse.json({ erro: "Não foi possível listar os pedidos" }, { status: 500 });
  }
}

// ============================================================
// POST /api/pedidos — cria um novo pedido, avisando sobre estoque insuficiente
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ erro: "Sessão não encontrada" }, { status: 401 });
    if (!canCreatePedidos(user.role)) {
      return NextResponse.json({ erro: "Entrada não autorizada" }, { status: 403 });
    }

    const body = (await request.json()) as {
      setor?: string;
      observacao?: string;
      dataAte?: string;
      itens?: PedidoItemInput[];
      confirmarEstoqueInsuficiente?: boolean;
    };

    const setorTab = setorTabs.find((tab) => tab.value === body.setor);
    if (!setorTab) {
      return NextResponse.json({ erro: "Selecione um setor válido." }, { status: 400 });
    }

    const dataAte = body.dataAte?.trim() || undefined;
    if (dataAte && !/^\d{4}-\d{2}-\d{2}$/.test(dataAte)) {
      return NextResponse.json({ erro: "Data até inválida." }, { status: 400 });
    }

    const availablePartNames = new Set(getPartsForSetor(setorTab.value).map((part) => part.descricao.trim().toLowerCase()));
    const rawItens = body.itens ?? [];
    if (!rawItens.length) {
      return NextResponse.json({ erro: "Adicione ao menos uma peça ao pedido." }, { status: 400 });
    }

    const itensValidados: { nome: string; quantidade: number }[] = [];
    for (const item of rawItens) {
      const nome = item.nome?.trim();
      const quantidade = Number(item.quantidade);
      if (!nome || !availablePartNames.has(nome.toLowerCase())) {
        return NextResponse.json({ erro: `Peça inválida para o setor selecionado: ${nome ?? ""}` }, { status: 400 });
      }
      if (!Number.isInteger(quantidade) || quantidade < 1) {
        return NextResponse.json({ erro: `Quantidade inválida para a peça ${nome}.` }, { status: 400 });
      }
      itensValidados.push({ nome, quantidade });
    }

    const availability = await getAvailableQuantities(itensValidados.map((item) => item.nome));
    const itens: PedidoItem[] = itensValidados.map((item) => {
      const disponivel = availability.get(item.nome.toLowerCase())?.total ?? 0;
      return {
        nome: item.nome,
        quantidadeSolicitada: item.quantidade,
        quantidadeDisponivel: disponivel,
        estoqueInsuficiente: disponivel < item.quantidade,
      };
    });

    const estoqueInsuficiente = itens.some((item) => item.estoqueInsuficiente);
    if (estoqueInsuficiente && !body.confirmarEstoqueInsuficiente) {
      return NextResponse.json(
        { erro: "Estoque insuficiente para uma ou mais peças.", itens, requerConfirmacao: true },
        { status: 409 },
      );
    }

    const collection = await pedidosCollection();
    const lastPedido = await collection.findOne({}, { sort: { id: -1 } });
    const nextId = (lastPedido?.id ?? 0) + 1;

    const pedido: PedidoDocument = {
      id: nextId,
      setor: setorTab.value,
      setorLabel: setorTab.label,
      observacao: body.observacao?.trim() || undefined,
      dataAte,
      itens,
      estoqueInsuficiente,
      status: "pendente",
      solicitante: user.name.trim(),
      createdAt: new Date().toISOString(),
    };

    await collection.insertOne(pedido);

    const summary = `${pedido.solicitante} criou um pedido de peças para ${pedido.setorLabel}${estoqueInsuficiente ? " (com estoque insuficiente)" : ""}.`;
    await notifyPedidoCreated(pedido.solicitante, user.role, summary);
    await notifySectorUsers(pedido.setor, summary, pedido.solicitante, user.role, user._id);

    return NextResponse.json({ success: true, pedido }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/pedidos] erro ao salvar no MongoDB:", err);
    return NextResponse.json({ erro: "Não foi possível salvar o pedido." }, { status: 500 });
  }
}

// ============================================================
// DELETE /api/pedidos — remove um pedido existente
// ============================================================
export async function DELETE(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ erro: "Sessão não encontrada" }, { status: 401 });
    if (!canDeletePedidos(user.role)) {
      return NextResponse.json({ erro: "Entrada não autorizada" }, { status: 403 });
    }

    const id = Number(request.nextUrl.searchParams.get("id"));
    if (!Number.isInteger(id)) return NextResponse.json({ erro: "ID do pedido inválido" }, { status: 400 });

    const collection = await pedidosCollection();
    const result = await collection.deleteOne({ id });
    if (result.deletedCount === 0) return NextResponse.json({ erro: "Pedido não encontrado" }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/pedidos] erro ao remover:", err);
    return NextResponse.json({ erro: "Não foi possível remover o pedido." }, { status: 500 });
  }
}
