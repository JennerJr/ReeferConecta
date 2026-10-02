import getMongoClient, { getMongoCollectionName, getMongoDatabaseName } from "@/lib/mongodb";
import { normalizeSetor } from "@/lib/catalog";

const databaseName = process.env.MONGODB_DATABASE_PECAS || "pecas";
const collectionName = "notifications";
const notifiedRoles = ["enc", "almox"];
const maxNotifications = 100;

export type NotificationType = "report" | "pedido";

export type NotificationDocument = {
  message: string;
  actorName: string;
  actorRole: string;
  createdAt: string;
  readBy: string[];
  recipientUserIds?: string[];
  type?: NotificationType;
};

async function notificationsCollection() {
  return (await getMongoClient()).db(databaseName).collection<NotificationDocument>(collectionName);
}

async function pruneOldNotifications() {
  const collection = await notificationsCollection();
  const total = await collection.countDocuments();
  if (total > maxNotifications) {
    const oldest = await collection
      .find({}, { projection: { _id: 1 } })
      .sort({ createdAt: 1 })
      .limit(total - maxNotifications)
      .toArray();
    await collection.deleteMany({ _id: { $in: oldest.map((document) => document._id) } });
  }
}

// Avisa ENC e almoxarifado quando um relatório é enviado por outro setor.
export async function notifyReportSubmitted(actorName: string, actorRole: string, message: string) {
  if (notifiedRoles.includes(actorRole.trim().toLowerCase())) return;
  const collection = await notificationsCollection();
  await collection.insertOne({ message, actorName, actorRole, createdAt: new Date().toISOString(), readBy: [], type: "report" });
  await pruneOldNotifications();
}

// Consolida o envio de vários relatórios de uma vez em uma única notificação.
export async function notifyBatchReportsSubmitted(actorName: string, actorRole: string, count: number) {
  await notifyReportSubmitted(actorName, actorRole, `${actorName} enviou ${count} relatórios.`);
}

// Avisa ENC e almoxarifado quando um novo pedido de peças é criado.
export async function notifyPedidoCreated(actorName: string, actorRole: string, message: string) {
  const collection = await notificationsCollection();
  await collection.insertOne({ message, actorName, actorRole, createdAt: new Date().toISOString(), readBy: [], type: "pedido" });
  await pruneOldNotifications();
}

export async function notifyUser(userId: string, message: string, actorName: string, actorRole: string, type?: NotificationType) {
  const collection = await notificationsCollection();
  await collection.insertOne({
    message,
    actorName,
    actorRole,
    createdAt: new Date().toISOString(),
    readBy: [],
    recipientUserIds: [userId],
    type,
  });
  await pruneOldNotifications();
}

// Avisa individualmente cada pessoa do setor informado quando um pedido é criado para esse setor.
export async function notifySectorUsers(setor: string, message: string, actorName: string, actorRole: string, excludeUserId?: string) {
  const client = await getMongoClient();
  const usersCollection = client.db(getMongoDatabaseName()).collection(getMongoCollectionName());
  const users = await usersCollection.find({}, { projection: { _id: 1, role: 1 } }).toArray();
  const recipientIds = users
    .filter((candidate) => normalizeSetor(String(candidate.role)) === setor && candidate._id.toString() !== excludeUserId)
    .map((candidate) => candidate._id.toString());

  await Promise.all(recipientIds.map((userId) => notifyUser(userId, message, actorName, actorRole, "pedido")));
}
