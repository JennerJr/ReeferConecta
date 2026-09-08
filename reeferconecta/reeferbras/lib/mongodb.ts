import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const url = process.env.MONGODB_URI;
const database = process.env.MONGODB_DATABASE;
const collection = process.env.MONGODB_COLLECTION;

const globalForMongo = globalThis as typeof globalThis & {
  mongoClientPromise?: Promise<MongoClient>;
};

export default function getMongoClient() {
  const configuredDatabase = database?.trim();
  const uri = url || (
    configuredDatabase?.startsWith("mongodb") ? configuredDatabase : undefined
  );
  if (!uri) {
    throw new Error("MONGODB_URI não foi definida no ambiente");
  }
  if (!/^mongodb(?:\+srv)?:\/\//.test(uri)) {
    throw new Error("MONGODB_URI inválida: use uma URI iniciando com mongodb:// ou mongodb+srv://");
  }

  if (globalForMongo.mongoClientPromise) {
    return globalForMongo.mongoClientPromise;
  }

  const clientPromise = new MongoClient(uri, {
    connectTimeoutMS: 10000,
    serverSelectionTimeoutMS: 10000,
  }).connect().catch((error) => {
    globalForMongo.mongoClientPromise = undefined;
    throw error;
  });
  globalForMongo.mongoClientPromise = clientPromise;
  return clientPromise;
}

export function getMongoDatabaseName() {
  const configuredDatabase = database?.trim();
  if (!configuredDatabase) {
    throw new Error("MONGODB_DATABASE não foi definida no ambiente");
  }
  return configuredDatabase;
}

export function getMongoCollectionName() {
  const configuredCollection = collection?.trim();
  if (!configuredCollection) {
    throw new Error("MONGODB_COLLECTION não foi definida no ambiente");
  }
  return configuredCollection;
}
