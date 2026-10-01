import carrierParts from "@/data/carrier.json";
import daikinParts from "@/data/daikin.json";
import starcoolParts from "@/data/starcool.json";
import thermokingParts from "@/data/thermoking.json";
import outrosParts from "@/data/outros.json";

type CatalogEntry = { linha?: string; setor?: string; componente: string; descricao: string; imagem?: string };

const catalogParts: CatalogEntry[] = [
  ...(carrierParts as CatalogEntry[]),
  ...(daikinParts as CatalogEntry[]),
  ...(starcoolParts as CatalogEntry[]),
  ...(thermokingParts as CatalogEntry[]),
  ...(outrosParts as CatalogEntry[]),
];

// Normaliza variações de grafia (acentos, pontuação, espaços) para comparar setores com segurança.
export function normalizeSetor(value?: string) {
  return value?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/gi, "").toLowerCase() ?? "";
}

export const setorTabs = [
  { value: "labeletrica", label: "Lab. Elétrica" },
  { value: "labeletronica", label: "Lab. Eletrônica" },
  { value: "cereco", label: "Cereco" },
] as const;

export function getSetorForComponente(nome?: string): string {
  if (!nome?.trim()) return "";
  const match = catalogParts.find((part) => part.descricao === nome || part.componente === nome);
  return normalizeSetor(match?.setor);
}
