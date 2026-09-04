import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";

export async function GET() {
  try {
    return NextResponse.json({ user: await getSessionUser() });
  } catch (error) {
    console.error("[GET /api/auth/session]", error);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}