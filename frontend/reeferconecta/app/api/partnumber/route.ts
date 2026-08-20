import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type PartNumberRecord = {
  id?: number;
  fabricante: string;
  linha?: string;
  componente: string;
  partNumbers: string[];
  descricao?: string;
  url?: string;
  imagem?: string;
};

type Database = {
  dados: PartNumberRecord[];
};

const databasePath = path.join(process.cwd(), "data", "part-numbers.json");

async function readDatabase(): Promise<Database> {
  try {
    const content = await fs.readFile(databasePath, "utf8");
    const database = JSON.parse(content) as Database;
    return { dados: Array.isArray(database.dados) ? database.dados : [] };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    await fs.mkdir(path.dirname(databasePath), { recursive: true });
    const database = { dados: [] };
    await fs.writeFile(databasePath, JSON.stringify(database, null, 2), "utf8");
    return database;
  }
}

export async function GET(request: Request) {
  const partNumber = new URL(request.url).searchParams.get("partNumber")?.trim().toLowerCase();
  const database = await readDatabase();
  const normalizedPartNumber = partNumber?.replace(/\s+/g, "");
  const results = partNumber
    ? database.dados.filter((record) => record.partNumbers.some((value) => {
        const normalizedValue = value.toLowerCase().replace(/\s+/g, "");
        return normalizedValue.includes(normalizedPartNumber ?? "");
      }))
    : database.dados;

  return NextResponse.json({
    results: results.map((record) => ({
      name: record.descricao?.trim() || record.componente,
      manufacturer: record.fabricante,
      link: record.url ?? "",
      snippet: record.descricao ?? `Registro local: ${record.partNumbers.join(", ")}`,
      imageUrl: record.imagem ?? "",
    })),
  });
}
