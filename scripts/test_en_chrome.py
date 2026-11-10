#!/usr/bin/env python3
"""English chrome uses title_en. Translation counts stay unchanged."""
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
TAG = re.compile(r"<[^>]+>")


def fail(msg: str) -> None:
    raise SystemExit(msg)


def visible(html: str) -> str:
    text = re.sub(r"<script[\s\S]*?</script>", " ", html, flags=re.I)
    text = re.sub(r"<style[\s\S]*?</style>", " ", text, flags=re.I)
    labels = " ".join(re.findall(r'aria-label="([^"]*)"', html))
    return TAG.sub(" ", text) + " " + labels


def slice_between(html: str, start: str, end: str) -> str:
    at = html.find(start)
    if at == -1:
        return ""
    stop = html.find(end, at + len(start))
    if stop == -1:
        return html[at:]
    return html[at:stop]


def check_catalog(catalog: dict) -> None:
    missing = [page["path"] for page in catalog["pages"] if not page.get("title_en")]
    if missing:
        fail("missing title_en: " + ", ".join(missing[:8]))
    if catalog["counts"]["translated"] != 7 or catalog["counts"]["untranslated"] != catalog["counts"]["pages"] - 7:
        fail(f"translation counts drifted: {catalog['counts']}")
    translated = [page["path"] for page in catalog["pages"] if page["translation"] == "translated"]
    if len(translated) != 7:
        fail(f"translated set changed: {translated}")
    for page in catalog["pages"]:
        if page["translation"] == "untranslated" and page["path"] in sc.TRANSLATED:
            fail(f"display name marked translated: {page['path']}")
        if CJK.search(page["title_en"] or ""):
            fail(f"title_en contains CJK: {page['path']} {page['title_en']}")


def check_site(site: Path, catalog: dict) -> None:
    en = site / "en"
    pages = sorted(en.rglob("index.html"))
    if not pages:
        fail("english build is missing")
    bad = []
    for html_path in pages:
        html = html_path.read_text(encoding="utf-8", errors="replace")
        regions = {
            "title": slice_between(html, "<title>", "</title>"),
            "tabs": slice_between(html, 'class="md-tabs"', "</nav>"),
            "nav": slice_between(html, "md-sidebar--primary", "md-sidebar--secondary"),
            "crumbs": slice_between(html, 'class="md-path', "</nav>"),
            "footer": slice_between(html, 'class="md-footer__inner', "</nav>"),
        }
        h1s = re.findall(r"<h1\b[^>]*>[\s\S]*?</h1>", html, flags=re.I)
        regions["h1"] = " ".join(h1s)
        for name, chunk in regions.items():
            if name == "crumbs" and not chunk:
                continue
            if CJK.search(visible(chunk)):
                sample = CJK.search(visible(chunk)).group(0)
                bad.append(f"{html_path.relative_to(site)} {name} has {sample}")
    index = json.loads((en / "search" / "search_index.json").read_text(encoding="utf-8"))
    for doc in index.get("docs") or []:
        title = doc.get("title") or ""
        if CJK.search(title):
            bad.append(f"search {doc.get('location')} {title[:40]}")
    if bad:
        fail("English chrome still has CJK:\n" + "\n".join(bad[:15]))
    by_path = {page["path"]: page for page in catalog["pages"]}
    sample = (en / "topics/java/01-language-basics/index.html").read_text(encoding="utf-8")
    if by_path["topics/java/01-language-basics/README.md"]["title_en"] not in visible(sample):
        fail("sample article is missing its English title")
    if "English translation unavailable" not in sample:
        fail("untranslated banner changed")
    print(f"ok en chrome pages={len(pages)} titles={len(catalog['pages'])}")


def main() -> int:
    catalog = json.loads(sc.CATALOG_PATH.read_text(encoding="utf-8"))
    check_catalog(catalog)
    derived = sc.derive_catalog()
    if [page["title_en"] for page in derived["pages"]] != [page["title_en"] for page in catalog["pages"]]:
        fail("catalog title_en drifted from the generator")
    if derived["counts"] != catalog["counts"]:
        fail("derived counts drifted")
    if len(sys.argv) < 2:
        print(f"ok en chrome source titles={len(catalog['pages'])}")
        return 0
    check_site(Path(sys.argv[1]), catalog)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
