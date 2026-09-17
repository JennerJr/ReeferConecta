import getMongoClient from "@/lib/mongodb";

const databaseName = process.env.MONGODB_DATABASE_PECAS || "pecas";
const collectionName = "notifications";
const notifiedRoles = ["enc", "almox"];
const maxNotifications = 100;

export type NotificationDocument = {
  message: string;
  actorName: string;
  actorRole: string;
  createdAt: string;
  readBy: string[];
  recipientUserIds?: string[];
};

// Avisa ENC e almoxarifado quando um relatório é enviado por outro setor.
export async function notifyReportSubmitted(actorName: string, actorRole: string, message: string) {
  if (notifiedRoles.includes(actorRole.trim().toLowerCase())) return;
  const collection = (await getMongoClient()).db(databaseName).collection<NotificationDocument>(collectionName);
  await collection.insertOne({ message, actorName, actorRole, createdAt: new Date().toISOString(), readBy: [] });

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

// Consolida o envio de vários relatórios de uma vez em uma única notificação.
export async function notifyBatchReportsSubmitted(actorName: string, actorRole: string, count: number) {
  await notifyReportSubmitted(actorName, actorRole, `${actorName} enviou ${count} relatórios.`);
}

export async function notifyUser(userId: string, message: string, actorName: string, actorRole: string) {
  const collection = (await getMongoClient()).db(databaseName).collection<NotificationDocument>(collectionName);
  await collection.insertOne({
    message,
    actorName,
    actorRole,
    createdAt: new Date().toISOString(),
    readBy: [],
    recipientUserIds: [userId],
  });

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
