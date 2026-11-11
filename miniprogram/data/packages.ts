import type { Block, TocItem } from "./types";

export interface ChapterBody {
  blocks: Block[];
  toc: TocItem[];
}

export interface ChapterPack {
  id: string;
  docs: Record<string, ChapterBody>;
}

type Loaded = ChapterPack & { CONTENT?: ChapterPack };

function asPack(mod: Loaded): ChapterPack {
  const pack = mod && mod.CONTENT ? mod.CONTENT : mod;
  if (!pack || !pack.docs) {
    throw new Error("chapter pack missing");
  }
  return pack;
}

const loading = new Map<string, Promise<ChapterPack>>();

function requestPack(packageId: string): Promise<ChapterPack> {
  // Paths are string literals so the miniprogram bundler can see each subpackage.
  switch (packageId) {
    case "basics":
      return require.async("../packages/basics/content").then(asPack);
    case "theory":
      return require.async("../packages/theory/content").then(asPack);
    case "java":
      return require.async("../packages/java/content").then(asPack);
    case "microservices":
      return require.async("../packages/microservices/content").then(asPack);
    case "ai":
      return require.async("../packages/ai/content").then(asPack);
    case "rest":
      return require.async("../packages/rest/content").then(asPack);
    default:
      return Promise.reject(new Error("unknown chapter package"));
  }
}

/** Download a chapter subpackage. Repeated calls share one in-flight request. */
export function loadChapterPack(packageId: string): Promise<ChapterPack> {
  const existing = loading.get(packageId);
  if (existing) return existing;
  const pending = requestPack(packageId).catch((error: unknown) => {
    loading.delete(packageId);
    throw error;
  });
  loading.set(packageId, pending);
  return pending;
}
