import { MongoClient } from "mongodb";

const globalForMongo = globalThis as typeof globalThis & {
  mongoClientPromise?: Promise<MongoClient>;
};

export default function getMongoClient() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI não foi definida no ambiente");
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
