import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import clientPromise from "@/lib/mongodb";
import { getSessionUser } from "@/lib/auth-session";

type UserInput = {
  name?: string;
  email?: string;
  role?: string;
  imageUrl?: string;
};

function normalizeUser(input: UserInput) {
  return {
    name: input.name?.trim() ?? "",
    email: input.email?.trim().toLowerCase() ?? "",
    role: input.role?.trim() || "user",
    imageUrl: input.imageUrl?.trim() || "",
  };
}

function validateUser(user: ReturnType<typeof normalizeUser>) {
  if (!user.name) return "Nome é obrigatório";
  if (!user.email || !/^\S+@\S+\.\S+$/.test(user.email)) return "E-mail inválido";
  return null;
}

function serializeUser(user: Record<string, unknown> | null) {
  if (!user) return null;
  return { ...user, _id: user._id instanceof ObjectId ? user._id.toString() : user._id };
}

async function usersCollection() {
  const client = await clientPromise();
  return client.db(process.env.MONGODB_DATABASE || "reeferconecta").collection("creddb");
}

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    const email = sessionUser?.email || request.nextUrl.searchParams.get("email")?.trim().toLowerCase();
    if (!email) return NextResponse.json({ user: null }, { status: 401 });
    const collection = await usersCollection();
    const user = email ? await collection.findOne({ email }) : null;

    return NextResponse.json({ user: serializeUser(user) });
  } catch (error) {
    console.error("[GET /api/users]", error);
    return NextResponse.json({ error: "Não foi possível buscar o usuário" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = normalizeUser((await request.json()) as UserInput);
    const validationError = validateUser(user);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

    const collection = await usersCollection();
    const now = new Date();
    const document = { ...user, createdAt: now, updatedAt: now };
    const result = await collection.insertOne(document);

    return NextResponse.json({ user: serializeUser({ ...document, _id: result.insertedId }) }, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      return NextResponse.json({ error: "Já existe um usuário com este e-mail" }, { status: 409 });
    }
    console.error("[POST /api/users]", error);
    return NextResponse.json({ error: "Não foi possível criar o usuário" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return NextResponse.json({ error: "Sessão não encontrada" }, { status: 401 });
    const input = (await request.json()) as Pick<UserInput, "imageUrl"> & {
      id?: string;
      currentPassword?: string;
      newPassword?: string;
    };
    if (!input.id || !ObjectId.isValid(input.id)) {
      return NextResponse.json({ error: "ID do usuário inválido" }, { status: 400 });
    }
    if (input.id !== sessionUser._id) {
      return NextResponse.json({ error: "Você só pode alterar sua própria foto" }, { status: 403 });
    }

    if (input.currentPassword !== undefined || input.newPassword !== undefined) {
      if (!input.currentPassword || !input.newPassword || input.newPassword.length < 8) {
        return NextResponse.json({ error: "A nova senha deve ter pelo menos 8 caracteres" }, { status: 400 });
      }
      const collection = await usersCollection();
      const currentUser = await collection.findOne<{ passwordHash?: string }>({ _id: new ObjectId(input.id) });
      if (!currentUser?.passwordHash || !(await bcrypt.compare(input.currentPassword, currentUser.passwordHash))) {
        return NextResponse.json({ error: "A senha atual está incorreta" }, { status: 401 });
      }
      await collection.updateOne(
        { _id: new ObjectId(input.id) },
        { $set: { passwordHash: await bcrypt.hash(input.newPassword, 12), updatedAt: new Date() } },
      );
      return NextResponse.json({ success: true });
    }

    const imageUrl = input.imageUrl?.trim() || "";
    const validRemoteImage = /^https?:\/\//i.test(imageUrl);
    const validLocalImage = /^data:image\/(png|jpeg|gif|webp);base64,/i.test(imageUrl);
    if (imageUrl && !validRemoteImage && !validLocalImage) {
      return NextResponse.json({ error: "A foto deve ser uma URL HTTP/HTTPS ou uma imagem local válida" }, { status: 400 });
    }
    if (validLocalImage && imageUrl.length > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "A imagem processada deve ter no máximo 10 MB" }, { status: 400 });
    }

    const collection = await usersCollection();
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(input.id) },
      { $set: { imageUrl, updatedAt: new Date() } },
      { returnDocument: "after" },
    );

    if (!result) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    return NextResponse.json({ user: serializeUser(result) });
  } catch (error) {
    console.error("[PATCH /api/users]", error);
    return NextResponse.json({ error: "Não foi possível atualizar o usuário" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "ID do usuário inválido" }, { status: 400 });
    }

    const collection = await usersCollection();
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    if (!result.deletedCount) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/users]", error);
    return NextResponse.json({ error: "Não foi possível excluir o usuário" }, { status: 500 });
  }
}