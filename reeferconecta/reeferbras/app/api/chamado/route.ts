import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import getMongoClient from "@/lib/mongodb";
import { notifyReportSubmitted } from "@/lib/notifications";
type standAloneChamado = {
    id: string;
    titulo: string;
    descricao: string;
    status: string;
    pedidoPor: string;
    criadoEm: string;
}

type ChamadosInput = Omit<standAloneChamado, "id" | "criadoEm">;

const databaseName = process.env.MONGODB_DATABASE_CHAMADOS || "chamados";
const collectionName = "chamadosdb";

function validList(value: string | undefined, options: string[]) {
  const values = value?.split(" / ").map((item) => item.trim()).filter(Boolean) ?? [];
  return { values, valid: !value?.trim() || (values.length > 0 && values.every((item) => options.includes(item))) };
}

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ erro: "Sessão não encontrada" }, { status: 401 });
    const client = await getMongoClient();
    const [standAloneChamados] = await Promise.all([
      client.db(databaseName).collection<standAloneChamado>(collectionName).find({}).toArray(),
    ]);
    const canViewAll = user.role.trim().toLowerCase() === "dev";
    const name = user.name.trim().toLowerCase();
    const visibleStandalone = canViewAll ? standAloneChamados : standAloneChamados.filter((report) => report.pedidoPor.trim().toLowerCase() === name);
    const reports = visibleStandalone.sort((first, second) => new Date(second.criadoEm).getTime() - new Date(first.criadoEm).getTime());
    return NextResponse.json({ reports });
  } catch (error) {
    console.error("[GET /api/chamado] erro ao carregar:", error);
    return NextResponse.json({ erro: "Não foi possível carregar os chamados." }, { status: 500 });
  }
}

export async function POST(request: NextRequest){
    try{
        const user = await getSessionUser();
            if (!user) return NextResponse.json({ erro: "Sessão não encontrada" }, { status: 401 });
            const role = user.role.trim().toLowerCase();
            const body = (await request.json()) as { chamados?: ChamadosInput[] };
            const inputs = body.chamados ?? [];

            const chamados: standAloneChamado[] = [];
                for (const input of inputs) {
                  const status = input.status?.trim();
                  const titulo = input.titulo?.trim();
                  if (!titulo || !status) {
                    return NextResponse.json({ erro: "Preencha o título e o status do chamado." }, { status: 400 });
                  }
                  chamados.push({
                    ...inputs,
                    id: randomUUID(),
                    titulo,
                    descricao: input.descricao?.trim() ?? "",
                    status,
                    pedidoPor: user.name.trim(),
                    criadoEm: new Date().toISOString(),
                  });
                }
                const collection = (await getMongoClient()).db(databaseName).collection<standAloneChamado>(collectionName);

                const actorName = user.name.trim();
                    const summary = chamados.length > 1
                      ? `${actorName} enviou ${chamados.length} chamados.`
                      : `${actorName} enviou um chamado (${chamados[0].titulo}).`;
                    await notifyReportSubmitted(actorName, user.role, summary);

            await collection.insertMany(chamados);
            return NextResponse.json({ success: true, chamados }, { status: 201 });
    }catch (error) {
    console.error("[POST /api/chamado] erro ao salvar:", error);
    return NextResponse.json({ erro: "Não foi possível salvar os chamados." }, { status: 500 });
  }
}