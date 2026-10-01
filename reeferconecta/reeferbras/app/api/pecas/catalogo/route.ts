import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import { canManagePieces } from "@/lib/authorization";

type CatalogPart = {
  linha: string;
  setor: string;
  componente: string;
  descricao: string;
  imagem?: string;
};

const fileByFabricante: Record<string, string> = {
  Carrier: "carrier.json",
  Daikin: "daikin.json",
  "Star Cool": "starcool.json",
  "Thermo King": "thermoking.json",
  Outros: "outros.json",
};

const setores = ["lab.elétrica", "lab.eletronica", "cereco"];

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ erro: "Sessão não encontrada" }, { status: 401 });
    if (!canManagePieces(user.role)) return NextResponse.json({ erro: "Sem permissão para cadastrar peças." }, { status: 403 });

    const body = (await request.json()) as { fabricante?: string; setor?: string; componente?: string; imagem?: string };
    const fabricante = body.fabricante?.trim() ?? "";
    const setor = body.setor?.trim() ?? "";
    const componente = body.componente?.trim() ?? "";
    const imagem = body.imagem?.trim() || undefined;

    const fileName = fileByFabricante[fabricante];
    if (!fileName) return NextResponse.json({ erro: "Fabricante inválido." }, { status: 400 });
    if (!setores.includes(setor)) return NextResponse.json({ erro: "Setor inválido." }, { status: 400 });
    if (!componente) return NextResponse.json({ erro: "Informe o componente." }, { status: 400 });

    const filePath = path.join(process.cwd(), "data", fileName);
    const raw = await readFile(filePath, "utf-8");
    const parts: CatalogPart[] = JSON.parse(raw);

    const newPart: CatalogPart = { linha: "Container", setor, componente, descricao: componente, ...(imagem ? { imagem } : {}) };
    parts.push(newPart);

    await writeFile(filePath, JSON.stringify(parts, null, 2), "utf-8");

    return NextResponse.json({ parte: newPart }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/pecas/catalogo] erro ao cadastrar:", error);
    return NextResponse.json({ erro: "Não foi possível cadastrar a peça." }, { status: 500 });
  }
}
