#!/usr/bin/env python3
"""Write the English slice into _site_src from the site catalog.

Translated pages are copied from website/en/. Every other catalog page
becomes an entry on en/not-translated.md. Chinese pages are not copied
into the English tree.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import site_catalog as sc  # noqa: E402

SEARCH_LIMIT = (
    "Search on these English pages still returns Chinese pages, because "
    "the search index is the whole site. Only the pages linked as English "
    "below are English. Any other hit is a Chinese source, not an English translation."
)


def anchor_for(path: str) -> str:
    text = path
    if text.endswith("/README.md"):
        text = text[: -len("/README.md")]
    elif text.endswith(".md"):
        text = text[: -len(".md")]
    return text.replace("/", "-")


def site_url(path: str) -> str:
    if path == "website/index.md":
        return "/"
    if path.endswith("/README.md"):
        slug = path[: -len("README.md")]
    elif path.endswith(".md"):
        slug = path[: -len(".md")] + "/"
    else:
        slug = path
    if not slug.startswith("/"):
        slug = "/" + slug
    if not slug.endswith("/"):
        slug += "/"
    return slug


def english_url(path: str) -> str:
    url = site_url(path)
    if url == "/":
        return "/en/"
    return "/en" + url


def render_home(catalog: dict) -> str:
    labels = catalog["labels"]
    counts = catalog["counts"]
    by_path = {page["path"]: page for page in catalog["pages"]}
    order = list(sc.homepage_statuses().keys())
    lines = [
        "# tech-notes",
        "",
        "[中文](../) · English",
        "",
        "A public engineering notebook: short notes, links, and a record of what was actually understood.",
        "",
        f"English coverage on this deploy: **{counts['translated']}** pages "
        f"({counts['translated'] - 1} chapter plus this home page). "
        f"**{counts['untranslated']}** pages have no English text. "
        "They are listed on [Not translated](not-translated.md), not filled in with Chinese.",
        "",
        "## Translated now",
        "",
        "- [Tech English](topics/getting-started/05-tech-english/) — how to read errors and official manuals.",
        "",
        "## Topics",
        "",
        "Status here is the editorial state of the Chinese page. It is not your reading progress, and it is not a translation badge.",
        "",
        "| Topic | Chinese title | Editorial status | English |",
        "|-------|---------------|------------------|---------|",
    ]
    for path in order:
        page = by_path[path]
        en_title = page["title_en"] or "No English title yet"
        status = labels[page["editorial"]]["en"]
        if page["translation"] == "translated" and path != "website/index.md":
            link = f"[English page]({english_url(path).removeprefix('/en/')})"
        else:
            link = f"[Not translated](not-translated.md#{anchor_for(path)})"
        lines.append(
            f"| {en_title} | {page['title_zh']} | {status} | {link} |"
        )
    lines += [
        "",
        "The quest map, game entrance, and experience points stay on the [Chinese home](../). This English page does not change them.",
        "",
    ]
    return "\n".join(lines)


def render_not_translated(catalog: dict) -> str:
    labels = catalog["labels"]
    counts = catalog["counts"]
    lines = [
        "# Not translated",
        "",
        "[中文 home](../) · [English home](./)",
        "",
        f"**{counts['untranslated']}** of **{counts['pages']}** catalog pages have no English body. "
        f"**{counts['translated']}** are translated. "
        "Opening English does not show the Chinese chapter in its place.",
        "",
        "Editorial status is the publishing state of the Chinese page. "
        f"None are marked {labels['complete']['en']}. "
        "A page can contain Chinese prose and still be in progress.",
        "",
        "PR 33 is open and not merged. It would mark Web and Systems as in progress and add two Chinese chapters. "
        "Those files are not on this site, and they are not counted as English.",
        "",
    ]
    groups = {"building": [], "planned": [], "complete": []}
    for page in catalog["pages"]:
        if page["translation"] == "translated":
            continue
        groups[page["editorial"]].append(page)
    for key in ("building", "planned", "complete"):
        rows = groups[key]
        lines.append(f"## {labels[key]['en']} ({len(rows)})")
        lines.append("")
        if not rows:
            lines.append("None.")
            lines.append("")
            continue
        for page in rows:
            en_title = page["title_en"] or "No English title yet"
            lines.append(
                f"- <span id=\"{anchor_for(page['path'])}\"></span>"
                f"**{en_title}** — Chinese title: {page['title_zh']}. "
                f"[Chinese page]({_chinese_href(page['path'])})"
            )
        lines.append("")
    return "\n".join(lines) + "\n"


def _chinese_href(path: str) -> str:
    """Link from en/not-translated.md back to the Chinese page."""
    url = site_url(path)
    if url == "/":
        return "../"
    return ".." + url


def render_lang_map(catalog: dict) -> str:
    translated = {}
    anchors = {}
    for page in catalog["pages"]:
        zh = site_url(page["path"])
        if page["translation"] == "translated":
            translated[zh] = english_url(page["path"])
        else:
            anchors[zh] = anchor_for(page["path"])
    payload = {"translated": translated, "anchors": anchors, "searchLimit": SEARCH_LIMIT}
    return "window.TN_LANG = " + json.dumps(payload, ensure_ascii=False, indent=2) + ";\n"


def build(site_src: Path, root: Path | None = None) -> dict:
    root = root or sc.ROOT
    catalog = json.loads((root / "website" / "data" / "site-catalog.json").read_text(encoding="utf-8"))
    errors = sc.coverage_errors(root, catalog)
    if errors:
        raise SystemExit("catalog check failed:\n" + "\n".join(errors))
    en_dir = site_src / "en"
    chapter = en_dir / "topics" / "getting-started" / "05-tech-english"
    chapter.mkdir(parents=True, exist_ok=True)
    (en_dir / "index.md").write_text(render_home(catalog), encoding="utf-8")
    source = sc.english_source("topics/getting-started/05-tech-english/README.md")
    (chapter / "README.md").write_text(source.read_text(encoding="utf-8"), encoding="utf-8")
    (en_dir / "not-translated.md").write_text(render_not_translated(catalog), encoding="utf-8")
    js = site_src / "javascripts"
    js.mkdir(parents=True, exist_ok=True)
    (js / "lang-map.js").write_text(render_lang_map(catalog), encoding="utf-8")
    return catalog["counts"]


def main() -> int:
    site = sc.ROOT / "_site_src"
    if not site.is_dir():
        raise SystemExit("_site_src is missing; run scripts/prepare_site_src.sh first")
    print(build(site))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
