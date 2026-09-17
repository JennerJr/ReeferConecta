import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getSessionUser } from "@/lib/auth-session";
import { canReceiveReportNotifications } from "@/lib/authorization";
import getMongoClient from "@/lib/mongodb";
import { notifyBatchReportsSubmitted, type NotificationDocument } from "@/lib/notifications";

const databaseName = process.env.MONGODB_DATABASE_PECAS || "pecas";
const collectionName = "notifications";

async function notificationsCollection() {
  const client = await getMongoClient();
  return client.db(databaseName).collection<NotificationDocument>(collectionName);
}

function notificationsQuery(userId: string, receivesReportNotifications: boolean) {
  return receivesReportNotifications
    ? { $or: [{ recipientUserIds: userId }, { recipientUserIds: { $exists: false } }] }
    : { recipientUserIds: userId };
}

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Sessão não encontrada" }, { status: 401 });

    const collection = await notificationsCollection();
    const documents = await collection
      .find(notificationsQuery(user._id, canReceiveReportNotifications(user.role)))
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();
    const notifications = documents.map((document) => ({
      id: document._id.toString(),
      message: document.message,
      createdAt: document.createdAt,
      read: document.readBy?.includes(user._id) ?? false,
    }));
    const unreadCount = notifications.filter((notification) => !notification.read).length;

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error("[GET /api/notifications]", error);
    return NextResponse.json({ error: "Não foi possível carregar as notificações" }, { status: 500 });
  }
}

// Consolida a notificação de múltiplos relatórios enviados de uma vez.
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Sessão não encontrada" }, { status: 401 });

    const input = (await request.json()) as { count?: number };
    const count = Number(input.count);
    if (!Number.isInteger(count) || count < 1 || count > 50) {
      return NextResponse.json({ error: "Quantidade inválida" }, { status: 400 });
    }

    await notifyBatchReportsSubmitted(user.name.trim(), user.role, count);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/notifications]", error);
    return NextResponse.json({ error: "Não foi possível registrar a notificação" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Sessão não encontrada" }, { status: 401 });

    const input = (await request.json()) as { id?: string; all?: boolean };
    const collection = await notificationsCollection();
    const query = notificationsQuery(user._id, canReceiveReportNotifications(user.role));

    if (input.all) {
      await collection.updateMany({ $and: [query, { readBy: { $ne: user._id } }] }, { $addToSet: { readBy: user._id } });
    } else if (input.id && ObjectId.isValid(input.id)) {
      await collection.updateOne({ $and: [query, { _id: new ObjectId(input.id) }] }, { $addToSet: { readBy: user._id } });
    } else {
      return NextResponse.json({ error: "Informe o id da notificação ou all" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PATCH /api/notifications]", error);
    return NextResponse.json({ error: "Não foi possível atualizar as notificações" }, { status: 500 });
  }
}
