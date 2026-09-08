import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import getMongoClient, { getMongoCollectionName, getMongoDatabaseName } from "@/lib/mongodb";
import { createSession } from "@/lib/auth-session";

type UserRecord = {
  name: string;
  email: string;
  role?: string;
  imageUrl?: string;
  passwordHash?: string;
};

export async function POST(request: NextRequest) {
  try {
    const input = (await request.json()) as { email?: string; password?: string };
    const email = input.email?.trim().toLowerCase();
    if (!email || !input.password) {
      return NextResponse.json({ error: "E-mail e senha são obrigatórios" }, { status: 400 });
    }

    const client = await getMongoClient();
    const databaseName = getMongoDatabaseName();
    const collection = client.db(databaseName).collection<UserRecord>(getMongoCollectionName());
    const record = await collection.findOne({ email });

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