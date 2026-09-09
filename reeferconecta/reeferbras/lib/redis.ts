import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL;
const redisRestUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisRestToken = process.env.UPSTASH_REDIS_REST_TOKEN;

type RedisClient = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { EX?: number }): Promise<unknown>;
  del(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  incrBy(key: string, amount: number): Promise<number>;
};

function createRestClient(): RedisClient {
  if (!redisRestUrl || !redisRestToken) {
    throw new Error("UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN não foram definidas no ambiente");
  }
  const restUrl = redisRestUrl;
  const restToken = redisRestToken;

  async function command<T>(parts: Array<string | number>) {
    const response = await fetch(restUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${restToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parts),
    });
    if (!response.ok) throw new Error(`Redis REST respondeu com status ${response.status}`);
    const data = await response.json() as { result: T; error?: string };
    if (data.error) throw new Error(data.error);
    return data.result;
  }

  return {
    get: (key) => command<string | null>(["GET", key]),
    set: (key, value, options) => options?.EX
      ? command(["SET", key, value, "EX", options.EX])
      : command(["SET", key, value]),
    del: (key) => command<number>(["DEL", key]),
    expire: (key, seconds) => command<number>(["EXPIRE", key, seconds]),
    incrBy: (key, amount) => command<number>(["INCRBY", key, amount]),
  };
}

const globalForRedis = globalThis as typeof globalThis & {
  redisClientPromise?: Promise<RedisClient>;
};

export async function getRedisClient() {
  if (globalForRedis.redisClientPromise) return globalForRedis.redisClientPromise;

  if (redisRestUrl && redisRestToken) {
    globalForRedis.redisClientPromise = Promise.resolve(createRestClient());
    return globalForRedis.redisClientPromise;
  }
  if (!redisUrl) throw new Error("REDIS_URL ou credenciais Redis REST não foram definidas no ambiente");

  const client = createClient({ url: redisUrl });
  globalForRedis.redisClientPromise = client.connect()
    .then(() => client)
    .catch((error) => {
      globalForRedis.redisClientPromise = undefined;
      throw error;
    });

  return globalForRedis.redisClientPromise;
}