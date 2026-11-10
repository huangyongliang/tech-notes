#!/usr/bin/env python3
"""Compare pinned H1 anchors with the pre-change build snapshot."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import site_catalog as sc  # noqa: E402

ROOT = sc.ROOT
SNAPSHOT = ROOT / "website" / "data" / "h1-anchors.json"


def fail(msg: str) -> None:
    raise SystemExit(msg)


def source_heading(path: Path) -> str:
    fence = False
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith("```") or line.startswith("~~~"):
            fence = not fence
            continue
        if fence:
            continue
        if re.match(r"^#\s+\S", line):
            return line
    raise SystemExit(f"missing H1: {path}")


def check_sources(snapshot: dict) -> None:
    for page in snapshot["pages"]:
        line = source_heading(ROOT / page["path"])
        if "{#" in line and page["h1_id"] not in line:
            fail(f"{page['path']} pins a different id than {page['h1_id']}")
        visible = re.sub(r"\s*\{#[^}]+\}\s*$", "", line[2:]).strip()
        old = re.sub(r"&amp;", "&", page.get("old_text") or "")
        if old and sc.strip_gloss(old) != visible and page["h1_id"] not in line:
            fail(f"{page['path']} changed without pinning {page['h1_id']}")


def check_site(site: Path, snapshot: dict) -> None:
    missing = []
    for page in snapshot["pages"]:
        url = page["url"]
        html_path = site / "index.html" if url == "/" else site / url.strip("/") / "index.html"
        if not html_path.is_file():
            missing.append(page["url"])
            continue
        text = html_path.read_text(encoding="utf-8", errors="replace")
        match = re.search(r'<h1[^>]*\sid="([^"]+)"', text)
        if not match or match.group(1) != page["h1_id"]:
            got = match.group(1) if match else "none"
            fail(f"{page['url']} h1 id is {got}, snapshot {page['h1_id']}")
    if missing:
        fail("missing built pages: " + ", ".join(missing[:8]))


def main() -> int:
    snapshot = json.loads(SNAPSHOT.read_text(encoding="utf-8"))
    if len(snapshot["pages"]) < 100:
        fail("anchor snapshot is too small")
    check_sources(snapshot)
    site = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    if site is not None:
        check_site(site, snapshot)
        print(f"ok anchors={len(snapshot['pages'])} site={site}")
    else:
        print(f"ok anchors={len(snapshot['pages'])} sources-only")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
