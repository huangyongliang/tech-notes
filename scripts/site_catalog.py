#!/usr/bin/env python3
"""Editorial status and translation coverage for the public site.

`website/data/site-catalog.json` is what the homepage generator and the
English site read. `derive_catalog()` is the drift lock: it rebuilds the
same document from the generated homepage badges, the handwritten chapter
tables, and META below. The build does not treat those tables as the
source, and it does not rewrite them.

Three statuses stay separate:

- editorial: 待开始 / 搭建中 / 已完成
- translation: 已译 / 部分 / 未译 (部分 is a topic rollup, not a page)
- on-device quest progress, which never enters this file

Existing prose does not imply editorial "complete". A page is translated
only when this catalog says so and website/en has a matching Markdown
file. Showing the Chinese body on an English URL is not translated.

PR 33 is recorded under pending_integrations and is not applied.
After it merges, update the catalog (Web and Systems become building,
and the two new chapters are untranslated) and regenerate the homepage.
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
TR_LABELS = {
    "translated": {"zh": "已译", "en": "Translated"},
    "partial": {"zh": "部分", "en": "Partial"},
    "untranslated": {"zh": "未译", "en": "Not translated"},
}
FALLBACK_BANNER = "English translation unavailable. Showing the Chinese original."
# Surfaces this generator rewrites. Topic README emoji tables are not in it.
GENERATED_SURFACES = (
    "website/index.md topic rows",
    "english nav and english home",
    "slice chapter status line",
    "fallback banner and search title",
)
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
INDEX_ROW_RE = re.compile(
    r'\[<span class="n">(?P<num>\d+)</span>'
    r'<span class="t">(?P<title>.*?)</span>'
    r'<span class="d">(?P<desc>[^<]*)</span>'
    r'(?P<status>.*?)\]\((?P<href>[^)]+)\)'
    r'(?:\{ \.tn2-todo \})?'
)
STATUS_RE = re.compile(r'<span class="s(?: s--wip)?">([^<]+)</span>')
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
    """Split a trailing English gloss off a Chinese H1.

    The gloss is the last capitalized Latin phrase. A Latin token inside
    the Chinese title, such as AI or Java, stays with the Chinese title.
    """
    title = re.sub(r"\s+", " ", title).strip()
    if not HAN_RE.search(title):
        return title, title
    match = re.match(
        r"^(.*[\u4e00-\u9fff][^A-Za-z]*?)\s+([A-Z][A-Za-z0-9][A-Za-z0-9 ,/&+\-:.]*)$",
        title,
    )
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
    for match in INDEX_ROW_RE.finditer(text):
        label_match = STATUS_RE.search(match.group("status"))
        if not label_match:
            raise ValueError(f"homepage row has no editorial badge: {match.group('href')}")
        label = label_match.group(1)
        href = match.group("href")
        if label not in HOMEPAGE_STATUS:
            raise ValueError(f"unknown homepage status {label} for {href}")
        found[href] = HOMEPAGE_STATUS[label]
    if len(found) != 13:
        raise ValueError(f"expected 13 homepage topic rows, found {len(found)}")
    return found


def translation_rollup(page: dict, pages: list[dict]) -> str:
    """Topic rows roll up child chapters. Pages themselves are never partial."""
    if page["kind"] != "topic":
        return page["translation"]
    prefix = page["path"][: -len("README.md")]
    flags = {page["translation"]}
    for other in pages:
        if other["path"] != page["path"] and other["path"].startswith(prefix):
            flags.add(other["translation"])
    if flags == {"translated"}:
        return "translated"
    if "translated" in flags:
        return "partial"
    return "untranslated"


def mixed_h1_paths(root: Path | None = None) -> list[str]:
    """Chinese H1s that still carry a Latin gloss. Not rewritten in bulk.

    Proper names inside a Chinese title are included in this count so the
    leftover set stays visible. DevOps-style English-only titles are not.
    """
    root = root or ROOT
    found = []
    for rel in content_paths(root):
        if rel == "website/index.md":
            continue
        h1 = read_h1(root / rel)
        if HAN_RE.search(h1) and re.search(r"[A-Za-z]{2,}", h1):
            found.append(rel)
    return found


def split_front_matter(text: str) -> tuple[str, str]:
    if text.startswith("---\n"):
        end = text.find("\n---\n", 4)
        if end != -1:
            return text[: end + 5], text[end + 5 :]
    return "", text


def status_paragraph(page: dict, lang: str) -> str:
    editorial = LABELS[page["editorial"]][lang]
    translation = TR_LABELS[page["translation"]][lang]
    if lang == "zh":
        return (
            f'<p class="tn-status">编辑状态：{editorial}。翻译：{translation}。'
            "这不是本机已学进度。</p>\n\n"
        )
    return (
        f'<p class="tn-status" lang="en">Editorial status: {editorial}. '
        f"Translation: {translation}. This is not on-device progress.</p>\n\n"
    )


def apply_homepage(text: str, catalog: dict) -> str:
    """Rewrite topic-row badges from the catalog. Ignores the badge text already in `text`."""
    by_path = {page["path"]: page for page in catalog["pages"]}
    pages = catalog["pages"]

    def repl(match: re.Match) -> str:
        href = match.group("href")
        page = by_path[href]
        editorial = page["editorial"]
        if editorial not in LABELS:
            raise ValueError(f"bad editorial for {href}")
        title = re.sub(r"<small>.*?</small>", "", match.group("title")).strip()
        wip = " s--wip" if editorial == "building" else ""
        todo = "{ .tn2-todo }" if editorial == "planned" else ""
        roll = translation_rollup(page, pages)
        return (
            f'[<span class="n">{match.group("num")}</span>'
            f'<span class="t">{title}</span>'
            f'<span class="d">{match.group("desc")}</span>'
            f'<span class="s-pair"><span class="s{wip}">{LABELS[editorial]["zh"]}</span>'
            f'<span class="s s--tr">{TR_LABELS[roll]["zh"]}</span></span>]({href}){todo}'
        )

    rewritten, count = INDEX_ROW_RE.subn(repl, text)
    if count != 13:
        raise ValueError(f"expected 13 homepage rows, rewrote {count}")
    rewritten = re.sub(r"(### [^<\n]+?)\s*<small>.*?</small>", r"\1", rewritten)
    marker = '<p class="tn2-lede">整个笔记本的目录。高亮的正在搭建，灰色的还没开始。</p>'
    note = (
        '<p class="tn-status">编辑状态是待开始、搭建中、已完成。'
        "翻译是已译、部分、未译。"
        "本机已学进度只在这台浏览器里，清掉记录不会改变编辑状态。</p>"
    )
    if "清掉记录不会改变编辑状态" not in rewritten:
        if marker not in rewritten:
            raise ValueError("homepage lede missing")
        rewritten = rewritten.replace(marker, marker + "\n\n" + note, 1)
    return rewritten


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
        elif rel in TRANSLATED:
            title_en = read_h1(english_source(rel))
            title_zh, _gloss = split_title(h1)
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
        "version": 2,
        "labels": LABELS,
        "translation_labels": TR_LABELS,
        "generated_surfaces": list(GENERATED_SURFACES),
        "note": (
            "editorial is the publishing state of the Chinese page. "
            "translation is separate. partial is computed for topic rows and is not stored per page. "
            "complete is never inferred from prose. "
            "On-device quest progress is not in this file. "
            "Topic README emoji tables are handwritten and are not a generated surface. "
            "pending_integrations is not applied to pages. "
            "mixed_h1_remaining still uses a Chinese title plus a Latin gloss; do not bulk-rewrite it."
        ),
        "mixed_h1_remaining": mixed_h1_paths(root),
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
    if catalog.get("translation_labels") != derived["translation_labels"]:
        errors.append("translation labels drifted")
    if catalog.get("mixed_h1_remaining") != derived["mixed_h1_remaining"]:
        errors.append("mixed H1 list is stale")
    if catalog.get("generated_surfaces") != derived["generated_surfaces"]:
        errors.append("generated surface list drifted")
    for page in catalog["pages"]:
        if "xp" in page or "learned" in page or "progress" in page:
            errors.append(f"personal progress stored in catalog: {page['path']}")
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
    if "--write-homepage" in sys.argv:
        catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
        path = ROOT / "website" / "index.md"
        path.write_text(apply_homepage(path.read_text(encoding="utf-8"), catalog), encoding="utf-8")
        print(f"wrote {path}")
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
