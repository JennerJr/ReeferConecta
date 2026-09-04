import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL;
const globalForRedis = globalThis as typeof globalThis & {
  redisClient?: ReturnType<typeof createClient>;
};

export async function getRedisClient() {
  if (!redisUrl) throw new Error("REDIS_URL não foi definida no ambiente");
  const client = globalForRedis.redisClient ?? createClient({ url: redisUrl });
  if (!client.isOpen) await client.connect();
  if (process.env.NODE_ENV !== "production") globalForRedis.redisClient = client;
  return client;
}