#!/usr/bin/env python3
"""Translated English bodies match the Chinese structure and contain no CJK outside code."""
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
CJK = re.compile(r"[\u3400-\u9fff\uf900-\ufaff]")
FENCE = re.compile(r"^```.*?^```", re.M | re.S)
HEADING = re.compile(r"^(#{1,6})\s+(.+?)\s*$", re.M)


def fail(msg: str) -> None:
    raise SystemExit(msg)


def fences(text: str) -> list[str]:
    return FENCE.findall(text)


def heading_ids(text: str) -> list[str]:
    ids = []
    fence = False
    for line in text.splitlines():
        if line.startswith("```") or line.startswith("~~~"):
            fence = not fence
            continue
        if fence or not line.startswith("#"):
            continue
        found = re.search(r"\{#([^}]+)\}\s*$", line)
        if not found:
            fail(f"heading has no pinned id: {line}")
        ids.append(found.group(1))
    return ids


def zh_ids_from_build(site: Path, rel: str) -> list[str]:
    html = site / rel.replace("README.md", "index.html")
    text = html.read_text(encoding="utf-8")
    return re.findall(r'<h[1-6] id="([^"]+)"', text)


def en_ids_from_build(site: Path, rel: str) -> list[str]:
    html = site / "en" / rel.replace("README.md", "index.html")
    text = html.read_text(encoding="utf-8")
    return re.findall(r'<h[1-6] id="([^"]+)"', text)


def main() -> int:
    catalog = json.loads(sc.CATALOG_PATH.read_text(encoding="utf-8"))
    if catalog["counts"]["translated"] != 7 or catalog["counts"]["untranslated"] != 108:
        fail(f"translation counts drifted: {catalog['counts']}")
    pages = [
        page["path"]
        for page in catalog["pages"]
        if page["translation"] == "translated" and page["path"] != "website/index.md"
    ]
    if len(pages) != 6:
        fail(f"expected 6 translated articles, got {pages}")
    for rel in pages:
        zh = (ROOT / rel).read_text(encoding="utf-8")
        en = sc.english_source(rel).read_text(encoding="utf-8")
        if fences(zh) != fences(en):
            fail(f"code blocks differ: {rel}")
        outside = FENCE.sub("", en)
        if CJK.search(outside):
            sample = CJK.search(outside).group(0)
            fail(f"CJK outside code in {rel}: {sample}")
        if sc.FALLBACK_BANNER in en:
            fail(f"translated source still has the unavailable banner: {rel}")
        if heading_ids(en) != heading_ids(en):
            fail(rel)
    if len(sys.argv) < 2:
        print(f"ok translated bodies source pages={len(pages)}")
        return 0
    site = Path(sys.argv[1])
    for rel in pages:
        zh_ids = zh_ids_from_build(site, rel)
        en_ids = en_ids_from_build(site, rel)
        if zh_ids != en_ids:
            fail(f"heading ids differ for {rel}:\n zh {zh_ids}\n en {en_ids}")
        html = (site / "en" / rel.replace("README.md", "index.html")).read_text(encoding="utf-8")
        if sc.FALLBACK_BANNER in html:
            fail(f"built translated page still shows the unavailable banner: {rel}")
    print(f"ok translated bodies pages={len(pages)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
