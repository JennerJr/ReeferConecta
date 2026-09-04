import { betterAuth } from "better-auth";
import { getRedisClient } from "@/lib/redis";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET || "reeferconecta-development-secret",
  emailAndPassword: {
    enabled: true,
  },
  secondaryStorage: {
    get: async (key) => (await getRedisClient()).get(`better-auth:${key}`),
    set: async (key, value, ttl) => {
      const redis = await getRedisClient();
      if (ttl) await redis.set(`better-auth:${key}`, value, { EX: ttl });
      else await redis.set(`better-auth:${key}`, value);
    },
    delete: async (key) => {
      await (await getRedisClient()).del(`better-auth:${key}`);
    },
    getAndDelete: async (key) => {
      const redis = await getRedisClient();
      const value = await redis.get(`better-auth:${key}`);
      await redis.del(`better-auth:${key}`);
      return value;
    },
    increment: async (key, amount) => {
      const redis = await getRedisClient();
      return redis.incrBy(`better-auth:${key}`, amount);
    },
  },
});