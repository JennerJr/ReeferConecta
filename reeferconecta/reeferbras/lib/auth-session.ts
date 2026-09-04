import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { getRedisClient } from "@/lib/redis";

const sessionTtlSeconds = 60 * 60 * 24 * 7;
const sessionCookie = "reeferconecta_session";

export type AuthUser = {
  _id: string;
  name: string;
  email: string;
  role: string;
  imageUrl: string;
};

export async function createSession(user: AuthUser) {
  const sessionId = randomBytes(32).toString("hex");
  const redis = await getRedisClient();
  await redis.set(`session:${sessionId}`, JSON.stringify(user), { EX: sessionTtlSeconds });
  const cookieStore = await cookies();
  cookieStore.set(sessionCookie, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: sessionTtlSeconds,
    path: "/",
  });
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(sessionCookie)?.value;
  if (!sessionId) return null;
  const redis = await getRedisClient();
  const value = await redis.get(`session:${sessionId}`);
  if (!value) return null;
  await redis.expire(`session:${sessionId}`, sessionTtlSeconds);
  return JSON.parse(value) as AuthUser;
}

export async function destroySession() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(sessionCookie)?.value;
  if (sessionId) {
    const redis = await getRedisClient();
    await redis.del(`session:${sessionId}`);
  }
  cookieStore.delete(sessionCookie);
}