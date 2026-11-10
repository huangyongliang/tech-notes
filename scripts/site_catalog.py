#!/usr/bin/env python3
"""Editorial status and translation coverage for the public site.

The checked-in catalog is the source the English slice reads.
`derive_catalog()` rebuilds that document from:

- homepage topic badges in website/index.md (topic indexes)
- status tables in topic README files (chapters)
- META below for pages that have neither

Existing prose does not imply editorial "complete".
Translation is a separate field. A page is translated only when this
catalog says so and website/en has a matching Markdown file.

PR 33 is recorded under pending_integrations and is not applied:
on this main, Web and Systems stay planned, and the two new chapter
files are not counted as English or as published pages.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = ROOT / "website" / "data" / "site-catalog.json"
EN_ROOT = ROOT / "website" / "en"

LABELS = {
    "planned": {"zh": "待开始", "en": "Not started"},
    "building": {"zh": "搭建中", "en": "In progress"},
    "complete": {"zh": "已完成", "en": "Complete"},
}
HOMEPAGE_STATUS = {"搭建中": "building", "待开始": "planned", "已完成": "complete"}
EMOJI_STATUS = {"🟡": "building", "⚪": "planned", "🟢": "complete"}

# Pages that are not a homepage topic row and not a chapter table row.
META_EDITORIAL = {
    "website/index.md": "building",
    "topics/README.md": "building",
    "topics/inbox/README.md": "building",
    "notes/README.md": "building",
    "resources/README.md": "building",
    "resources/links.md": "building",
    "CONTRIBUTING.md": "building",
    "STYLE.md": "building",
}

# Reviewed English sources. Anything else is untranslated, including
# pages that merely contain English words inside Chinese prose.
# The English home is generated from this catalog so its topic table
# cannot drift. The chapter file is hand-written.
TRANSLATED = {
    "website/index.md",
    "topics/getting-started/05-tech-english/README.md",
}
GENERATED_EN = {"website/index.md"}

PENDING_INTEGRATIONS = [
    {
        "pr": 33,
        "url": "https://github.com/huangyongliang/tech-notes/pull/33",
        "head": "ea769011e3af96324ba5deeeb22da3b98f2e035a",
        "base": "b95578b67fcc79e5bed0056b713a4cd846e7b109",
        "merged": False,
        "summary": (
            "Open Chinese batch. After it merges, Web and Systems become "
            "building, and two new Chinese chapters exist. Those chapters "
            "are not English and are not part of the frozen miniapp 35."
        ),
        "when_merged": [
            {
                "path": "topics/web/README.md",
                "editorial": "building",
                "translation": "untranslated",
            },
            {
                "path": "topics/systems/README.md",
                "editorial": "building",
                "translation": "untranslated",
            },
            {
                "path": "topics/web/origin/README.md",
                "editorial": "building",
                "translation": "untranslated",
                "new_file": True,
            },
            {
                "path": "topics/systems/distributed/README.md",
                "editorial": "building",
                "translation": "untranslated",
                "new_file": True,
            },
        ],
    }
]

H1_RE = re.compile(r"^#\s+(.+)$", re.M)
HAN_RE = re.compile(r"[\u4e00-\u9fff]")
HOME_ROW_RE = re.compile(
    r'<span class="t">([^<]+)<small>([^<]+)</small></span>'
    r'<span class="d">[^<]*</span>'
    r'<span class="s(?: s--wip)?">([^<]+)</span>\]\(([^)]+)\)'
)
TABLE_ROW_RE = re.compile(
    r"^\|\s*\d+\s*\|\s*\[([^\]]+)\]\(([^)]+)\)\s*\|.*\|\s*([🟢🟡⚪])\s*\|",
    re.M,
)


def content_paths(root: Path | None = None) -> list[str]:
    root = root or ROOT
    paths = []
    for path in sorted((root / "topics").rglob("*.md")):
        paths.append(path.relative_to(root).as_posix())
    for rel in (
        "website/index.md",
        "notes/README.md",
        "resources/README.md",
        "resources/links.md",
        "CONTRIBUTING.md",
        "STYLE.md",
    ):
        if (root / rel).is_file():
            paths.append(rel)
    return paths


def split_title(title: str) -> tuple[str, str | None]:
    """Split a bilingual H1. Proper names with no Chinese stay as-is."""
    title = re.sub(r"\s+", " ", title).strip()
    if not HAN_RE.search(title):
        return title, title
    match = re.match(r"^(.*?[\u4e00-\u9fff][^A-Za-z]*)\s+([A-Z].*)$", title)
    if match:
        return match.group(1).strip(), match.group(2).strip()
    return title, None


def read_h1(path: Path) -> str:
    text = path.read_text(encoding="utf-8")
    found = H1_RE.search(text)
    if not found:
        raise ValueError(f"missing H1: {path}")
    return found.group(1).strip()


def homepage_statuses(root: Path | None = None) -> dict[str, str]:
    root = root or ROOT
    text = (root / "website" / "index.md").read_text(encoding="utf-8")
    found = {}
    for _zh, _en, label, href in HOME_ROW_RE.findall(text):
        if label not in HOMEPAGE_STATUS:
            raise ValueError(f"unknown homepage status {label} for {href}")
        found[href] = HOMEPAGE_STATUS[label]
    return found


def chapter_statuses(root: Path | None = None) -> dict[str, str]:
    root = root or ROOT
    found = {}
    for readme in sorted((root / "topics").rglob("README.md")):
        text = readme.read_text(encoding="utf-8")
        for _label, href, emoji in TABLE_ROW_RE.findall(text):
            if emoji not in EMOJI_STATUS:
                continue
            target = (readme.parent / href).resolve()
            try:
                rel = target.relative_to((root / "topics").resolve())
            except ValueError:
                continue
            path = ("topics" / rel).as_posix()
            if path.endswith("/"):
                path += "README.md"
            elif not path.endswith(".md"):
                path = path.rstrip("/") + "/README.md"
            found[path] = EMOJI_STATUS[emoji]
    return found


def derive_catalog(root: Path | None = None) -> dict:
    root = root or ROOT
    home = homepage_statuses(root)
    chapters = chapter_statuses(root)
    pages = []
    for rel in content_paths(root):
        h1 = read_h1(root / rel)
        title_zh, title_en = split_title(h1)
        if rel in home:
            editorial = home[rel]
            kind = "topic"
        elif rel in chapters:
            editorial = chapters[rel]
            kind = "chapter"
        elif rel in META_EDITORIAL:
            editorial = META_EDITORIAL[rel]
            kind = "meta" if rel != "website/index.md" else "home"
        else:
            raise ValueError(f"no editorial status for {rel}")
        if rel == "website/index.md":
            title_zh, title_en = "技术笔记", "tech-notes"
            kind = "home"
        pages.append(
            {
                "path": rel,
                "title_zh": title_zh,
                "title_en": title_en,
                "editorial": editorial,
                "translation": "translated" if rel in TRANSLATED else "untranslated",
                "kind": kind,
            }
        )
    translated = [p["path"] for p in pages if p["translation"] == "translated"]
    return {
        "version": 1,
        "labels": LABELS,
        "note": (
            "editorial is the publishing state of the Chinese page. "
            "translation is separate. complete is never inferred from prose. "
            "pending_integrations is not applied to pages."
        ),
        "pages": pages,
        "counts": {
            "pages": len(pages),
            "translated": len(translated),
            "untranslated": len(pages) - len(translated),
            "editorial": {
                key: sum(1 for p in pages if p["editorial"] == key)
                for key in LABELS
            },
        },
        "pending_integrations": PENDING_INTEGRATIONS,
    }


def english_source(rel: str) -> Path:
    return EN_ROOT / rel


def coverage_errors(root: Path | None = None, catalog: dict | None = None) -> list[str]:
    root = root or ROOT
    catalog = catalog or json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    errors = []
    derived = derive_catalog(root)
    if catalog["pages"] != derived["pages"]:
        errors.append("site-catalog.json pages differ from homepage, status tables, and META")
    if catalog["counts"] != derived["counts"]:
        errors.append("site-catalog.json counts are stale")
    if catalog.get("pending_integrations") != derived["pending_integrations"]:
        errors.append("pending_integrations drifted from PR 33 note")
    if catalog.get("labels") != derived["labels"]:
        errors.append("status labels drifted")
    paths = [p["path"] for p in catalog["pages"]]
    if len(paths) != len(set(paths)):
        errors.append("duplicate catalog paths")
    for page in catalog["pages"]:
        if page["editorial"] not in LABELS:
            errors.append(f"bad editorial: {page['path']}")
        if page["translation"] not in ("translated", "untranslated"):
            errors.append(f"bad translation: {page['path']}")
        if page["editorial"] == "complete":
            errors.append(f"prose must not be marked complete: {page['path']}")
        src = english_source(page["path"])
        if (
            page["translation"] == "translated"
            and page["path"] not in GENERATED_EN
            and not src.is_file()
        ):
            errors.append(f"translated page has no English source: {page['path']}")
        if page["translation"] == "untranslated" and src.is_file():
            errors.append(f"English file exists but page is untranslated: {page['path']}")
    for rel in TRANSLATED:
        if rel not in paths:
            errors.append(f"TRANSLATED path missing from catalog: {rel}")
    pending_new = []
    for item in catalog["pending_integrations"]:
        if item.get("merged"):
            errors.append(f"pending integration marked merged: PR {item.get('pr')}")
        for change in item["when_merged"]:
            if change["translation"] != "untranslated":
                errors.append(f"pending page counted as English: {change['path']}")
            if change.get("new_file"):
                pending_new.append(change["path"])
                if (root / change["path"]).exists():
                    errors.append(f"pending new file already on this tree: {change['path']}")
                if change["path"] in paths:
                    errors.append(f"pending new file already catalogued: {change['path']}")
    # Current main still shows Web and Systems as planned.
    by_path = {p["path"]: p for p in catalog["pages"]}
    for rel in ("topics/web/README.md", "topics/systems/README.md"):
        if by_path[rel]["editorial"] != "planned":
            errors.append(f"{rel} should stay planned until PR 33 merges")
        if by_path[rel]["translation"] != "untranslated":
            errors.append(f"{rel} is not an English page")
    return errors


def main() -> int:
    catalog = derive_catalog()
    text = json.dumps(catalog, ensure_ascii=False, indent=2) + "\n"
    if "--write" in sys.argv:
        CATALOG_PATH.parent.mkdir(parents=True, exist_ok=True)
        CATALOG_PATH.write_text(text, encoding="utf-8")
        print(f"wrote {CATALOG_PATH} {catalog['counts']}")
        return 0
    if "--check" in sys.argv:
        errors = coverage_errors(catalog=json.loads(CATALOG_PATH.read_text(encoding="utf-8")))
        if errors:
            print("\n".join(errors))
            return 1
        print("ok", catalog["counts"])
        return 0
    print(text)
    return 0


if __name__ == "__main__":
    sys.dont_write_bytecode = True
    raise SystemExit(main())
