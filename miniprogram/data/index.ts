import type { CatalogFile, Doc } from "./types";
import { CATALOG as RAW } from "./catalog";

export function getCatalog(): CatalogFile {
  return RAW as CatalogFile;
}

export function getDoc(id: string): Doc | null {
  return getCatalog().docs[id] ?? null;
}
