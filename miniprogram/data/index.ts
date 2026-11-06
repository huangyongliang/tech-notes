import type { CatalogFile, Doc } from "./types";
import { CATALOG as RAW } from "./catalog";

export function getCatalog(): CatalogFile {
  return RAW as CatalogFile;
}

export function getDoc(id: string): Doc | null {
  return getCatalog().docs[id] ?? null;
}

/** Chapter docs only. Topic hubs and the roadmap are not checklist items. */
export function chapterIdSet(): Set<string> {
  const ids = new Set<string>();
  for (const doc of Object.values(getCatalog().docs)) {
    if (doc.kind === "chapter") ids.add(doc.id);
  }
  return ids;
}
