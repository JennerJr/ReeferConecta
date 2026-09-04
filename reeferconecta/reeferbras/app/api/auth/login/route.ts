import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import getMongoClient from "@/lib/mongodb";
import { createSession } from "@/lib/auth-session";

export async function POST(request: NextRequest) {
  try {
    const input = (await request.json()) as { email?: string; password?: string };
    const email = input.email?.trim().toLowerCase();
    if (!email || !input.password) {
      return NextResponse.json({ error: "E-mail e senha são obrigatórios" }, { status: 400 });
    }

    const client = await getMongoClient();
    const record = await client
      .db(process.env.MONGODB_DATABASE || "reeferconecta")
      .collection("creddb")
      .findOne<{ _id: { toString(): string }; name: string; email: string; role?: string; imageUrl?: string; passwordHash?: string }>({ email });

    if (!record?.passwordHash || !(await bcrypt.compare(input.password, record.passwordHash))) {
      return NextResponse.json({ error: "E-mail ou senha inválidos" }, { status: 401 });
    }

    await createSession({
      _id: record._id.toString(),
      name: record.name,
      email: record.email,
      role: record.role || "user",
      imageUrl: record.imageUrl || "",
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/auth/login]", error);
    return NextResponse.json({ error: "O serviço de autenticação está temporariamente indisponível. Tente novamente." }, { status: 503 });
  }
}