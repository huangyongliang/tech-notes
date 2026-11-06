/** Resolve a relative Markdown link from a manifest doc id. External URLs stay unresolved. */

export function resolveDocId(fromId: string, href: string): string | null {
  if (!fromId || !href) return null;
  const cut = href.split("#")[0].split("?")[0].trim();
  if (
    !cut ||
    cut.startsWith("http://") ||
    cut.startsWith("https://") ||
    cut.startsWith("mailto:")
  ) {
    return null;
  }
  const parts = ["topics", ...fromId.split("/")];
  for (const seg of cut.split("/")) {
    if (!seg || seg === ".") continue;
    if (seg === "..") {
      parts.pop();
      continue;
    }
    parts.push(seg.replace(/\.md$/i, ""));
  }
  if (parts[0] !== "topics") return null;
  const rest = parts.slice(1).filter(Boolean);
  if (rest.length === 1) return rest[0];
  if (rest.length === 2) return `${rest[0]}/${rest[1]}`;
  return null;
}
