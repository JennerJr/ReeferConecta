import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import clientPromise, { getMongoCollectionName, getMongoDatabaseName } from "@/lib/mongodb";
import { getSessionUser, updateSessionUser } from "@/lib/auth-session";
import { canAccessTeams, employeeRoles, hasRole } from "@/lib/authorization";

type UserInput = {
  name?: string;
  email?: string;
  role?: string;
  imageUrl?: string;
};

function normalizeUser(input: UserInput) {
  const name = input.name?.trim() ?? "";
  const emailIdentifier = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return {
    name,
    email: emailIdentifier ? `${emailIdentifier}@reeferbras.com` : "",
    role: input.role?.trim() || "user",
    imageUrl: input.imageUrl?.trim() || "",
  };
}

function validateUser(user: ReturnType<typeof normalizeUser>) {
  if (!user.name) return "Nome é obrigatório";
  if (!user.email || !/^\S+@\S+\.\S+$/.test(user.email)) return "E-mail inválido";
  if (!employeeRoles.some((role) => role.toLowerCase() === user.role.toLowerCase())) return "Role inválida";
  return null;
}

function serializeUser(user: Record<string, unknown> | null) {
  if (!user) return null;
  return { ...user, _id: user._id instanceof ObjectId ? user._id.toString() : user._id };
}

async function usersCollection() {
  const client = await clientPromise();
  return client.db(getMongoDatabaseName()).collection(getMongoCollectionName());
}

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (request.nextUrl.searchParams.get("all") === "true") {
      if (!canAccessTeams(sessionUser?.role)) {
        return NextResponse.json({ error: "Entrada não autorizada" }, { status: 403 });
      }

      const collection = await usersCollection();
      const users = await collection
        .find({}, { projection: { passwordHash: 0 } })
        .sort({ name: 1 })
        .toArray();
      return NextResponse.json({ users: users.map((user) => serializeUser(user)) });
    }

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
    const sessionUser = await getSessionUser();
    if (!canAccessTeams(sessionUser?.role)) {
      return NextResponse.json({ error: "Entrada não autorizada" }, { status: 403 });
    }

    const user = normalizeUser((await request.json()) as UserInput);
    const validationError = validateUser(user);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

    const collection = await usersCollection();
    const now = new Date();
    const document = {
      ...user,
      passwordHash: await bcrypt.hash("reeferconecta", 12),
      createdAt: now,
      updatedAt: now,
    };
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
    const input = (await request.json()) as Pick<UserInput, "imageUrl" | "role"> & {
      id?: string;
      currentPassword?: string;
      newPassword?: string;
    };
    if (!input.id || !ObjectId.isValid(input.id)) {
      return NextResponse.json({ error: "ID do usuário inválido" }, { status: 400 });
    }
    if (input.id !== sessionUser._id) {
      return NextResponse.json({ error: "Você só pode alterar seu próprio perfil" }, { status: 403 });
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
    const requestedRole = input.role?.trim();
    const canChangeRole = hasRole(sessionUser.role, ["enc", "dev"]);
    const isCurrentRole = Boolean(requestedRole && requestedRole.toLowerCase() === sessionUser.role.toLowerCase());
    const isPrimaryRoleReturn = Boolean(requestedRole && sessionUser.primaryRole && requestedRole.toLowerCase() === sessionUser.primaryRole.toLowerCase());
    if (requestedRole && !canChangeRole && !isCurrentRole && !isPrimaryRoleReturn) {
      return NextResponse.json({ error: "Somente usuários ENC e DEV podem alterar o setor" }, { status: 403 });
    }
    if (requestedRole && !employeeRoles.some((role) => role.toLowerCase() === requestedRole.toLowerCase())) {
      return NextResponse.json({ error: "Setor inválido" }, { status: 400 });
    }
    const role = requestedRole
      ? employeeRoles.find((allowedRole) => allowedRole.toLowerCase() === requestedRole.toLowerCase())!
      : sessionUser.role;
    const primaryRole = sessionUser.primaryRole || (canChangeRole ? sessionUser.role : undefined);
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
      { $set: { imageUrl, role, ...(primaryRole ? { primaryRole } : {}), updatedAt: new Date() } },
      { returnDocument: "after" },
    );

    if (!result) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    await updateSessionUser({ ...sessionUser, imageUrl, role, primaryRole });
    return NextResponse.json({ user: serializeUser({ ...sessionUser, imageUrl, role, primaryRole }) });
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