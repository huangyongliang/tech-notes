#!/usr/bin/env python3
"""Every heading id from main 3b56fcd must still resolve in this build."""
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
SNAPSHOT = ROOT / "website" / "data" / "main-anchors.json"


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
    if snapshot.get("source_commit") != "3b56fcd5dcf65274afbc4d95fd186517ddac8b4b":
        fail("anchor baseline is not main 3b56fcd")
    for page in snapshot["pages"]:
        if not page.get("path"):
            continue
        line = source_heading(ROOT / page["path"])
        if "{#" in line and page["h1_id"] not in line:
            fail(f"{page['path']} pins a different id than main {page['h1_id']}")
        if page["h1_id"] == "tech-english" and "{#tech-english}" not in line:
            fail("Tech English lost the main id tech-english")


def page_html(site: Path, url: str) -> Path:
    if url == "/":
        return site / "index.html"
    return site / url.strip("/") / "index.html"


def check_site(site: Path, snapshot: dict) -> None:
    missing_pages = []
    missing_ids = []
    for page in snapshot["pages"]:
        html_path = page_html(site, page["url"])
        if not html_path.is_file():
            missing_pages.append(page["url"])
            continue
        text = html_path.read_text(encoding="utf-8", errors="replace")
        for anchor in page["ids"]:
            if f'id="{anchor}"' not in text:
                missing_ids.append(f"{page['url']}#{anchor}")
    if missing_pages:
        fail("main pages missing from this build: " + ", ".join(missing_pages[:8]))
    if missing_ids:
        fail("main anchors missing: " + ", ".join(missing_ids[:12]))


def main() -> int:
    snapshot = json.loads(SNAPSHOT.read_text(encoding="utf-8"))
    if len(snapshot["pages"]) < 100:
        fail("main anchor snapshot is too small")
    check_sources(snapshot)
    site = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    if site is not None:
        check_site(site, snapshot)
        total = sum(len(page["ids"]) for page in snapshot["pages"])
        print(f"ok anchors={len(snapshot['pages'])} ids={total} site={site}")
    else:
        print(f"ok anchors={len(snapshot['pages'])} sources-only")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
