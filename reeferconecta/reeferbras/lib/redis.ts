import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL;
const globalForRedis = globalThis as typeof globalThis & {
  redisClientPromise?: Promise<ReturnType<typeof createClient>>;
};

export async function getRedisClient() {
  if (!redisUrl) throw new Error("REDIS_URL não foi definida no ambiente");
  if (globalForRedis.redisClientPromise) return globalForRedis.redisClientPromise;

  const client = createClient({ url: redisUrl });
  globalForRedis.redisClientPromise = client.connect()
    .then(() => client)
    .catch((error) => {
      globalForRedis.redisClientPromise = undefined;
      throw error;
    });

  return globalForRedis.redisClientPromise;
}