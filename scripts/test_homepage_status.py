#!/usr/bin/env python3
"""Homepage terminal and topic-list counts come from the catalog."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import build_english_slice as bes  # noqa: E402
import site_catalog as sc  # noqa: E402

ROOT = sc.ROOT
COUNT_RE = re.compile(r"(\d+) 个子主题")
SLUG_RE = re.compile(r"topics/([A-Za-z0-9-]+)/")
TERM_SLUG_RE = re.compile(r"([A-Za-z0-9-]+)/</em>")


def fail(msg: str) -> None:
    raise SystemExit(msg)


def topic_by_slug(catalog: dict) -> dict[str, dict]:
    return {
        sc.topic_slug(page["path"]): page
        for page in catalog["pages"]
        if page["kind"] == "topic"
    }


def assert_line_counts(line: str, catalog: dict, where: str) -> None:
    numbers = [int(n) for n in COUNT_RE.findall(line)]
    if not numbers:
        return
    by_slug = topic_by_slug(catalog)
    slugs = SLUG_RE.findall(line) or TERM_SLUG_RE.findall(line)
    rel_slugs = re.findall(r"\]\(([A-Za-z0-9-]+)/\)", line)
    if len(slugs) == len(numbers):
        pairs = list(zip(slugs, numbers))
    elif len(rel_slugs) == len(numbers) and all(slug in by_slug for slug in rel_slugs):
        pairs = list(zip(rel_slugs, numbers))
    elif "Java" in line and "微服务" in line and len(numbers) == 2:
        pairs = [("java", numbers[0]), ("microservices", numbers[1])]
    elif "从架构拆分" in line or "看全部" in line:
        pairs = [("microservices", numbers[0])]
    elif "这 " in line and "全部理论" in line:
        pairs = [("cs-theory", numbers[0])]
    else:
        fail(f"unattributed count in {where}: {line.strip()}")
    for slug, number in pairs:
        page = by_slug[slug]
        expect = sc.subtopic_count(catalog, page["path"])
        if number != expect:
            fail(f"{where} {slug} says {number}, catalog has {expect}")


def assert_converted(path: Path, catalog: dict) -> None:
    text = path.read_text(encoding="utf-8")
    if re.search(r"\d+\s*章", text):
        fail(f"hard-coded chapter count remains in {path.relative_to(ROOT)}")
    for line in text.splitlines():
        assert_line_counts(line, catalog, str(path.relative_to(ROOT)))


def assert_terminal(text: str, catalog: dict, lang: str, order: list[str]) -> None:
    body = sc.render_terminal_body(catalog, lang, order)
    if body not in text:
        fail(f"{lang} terminal is not the catalog tree")
    for path in order:
        page = next(item for item in catalog["pages"] if item["path"] == path)
        comment = sc.status_comment(page, sc.subtopic_count(catalog, path), lang)
        if comment not in text:
            fail(f"missing {lang} terminal line: {comment}")
    if "理论基础 ·" in text:
        fail("terminal still uses the old theory gloss")


def main() -> int:
    catalog = json.loads(sc.CATALOG_PATH.read_text(encoding="utf-8"))
    home_path = ROOT / "website" / "index.md"
    home = home_path.read_text(encoding="utf-8")
    readme_path = ROOT / "README.md"
    readme = readme_path.read_text(encoding="utf-8")
    index_path = ROOT / "topics" / "README.md"
    index = index_path.read_text(encoding="utf-8")
    if sc.apply_homepage(home, catalog) != home:
        fail("homepage is not the catalog generator output")
    if sc.apply_readme(readme, catalog) != readme:
        fail("root README is not the catalog generator output")
    if sc.apply_topic_index(index, catalog) != index:
        fail("topic index is not the catalog generator output")

    order = sc.topic_order_from(home)
    assert_terminal(home, catalog, "zh", order)
    english = bes.render_home(catalog)
    assert_terminal(english, catalog, "en", order)
    by_path = {page["path"]: page for page in catalog["pages"]}
    for path in order:
        page = by_path[path]
        count = sc.subtopic_count(catalog, path)
        label = sc.LABELS[page["editorial"]]["zh"]
        row = next(line for line in home.splitlines() if 'class="d"' in line and f"]({path})" in line)
        if label not in row or f"{count} 个子主题" not in row:
            fail(f"Chinese topic row drifted: {row}")
        en_label = sc.LABELS[page["editorial"]]["en"]
        en_row = next(line for line in english.splitlines() if line.startswith(f"| {page['title_zh']} |"))
        if en_row != (
            f"| {page['title_zh']} | {count} | {en_label} | "
            f"{sc.TR_LABELS[sc.translation_rollup(page, catalog['pages'])]['en']} | "
            f"[Open]({bes.english_url(path).removeprefix('/en/')}) |"
        ):
            fail(f"English topic row drifted: {en_row}")

    for path in (home_path, readme_path, index_path):
        assert_converted(path, catalog)
    if "已有一章" in index:
        fail("topic index still spells the page count in prose")
    for line in english.splitlines():
        if re.search(r"\d+\s*章", line):
            fail(f"English home still has a hard-coded chapter count: {line}")

    mutated = json.loads(json.dumps(catalog))
    removed = False
    kept = []
    for page in mutated["pages"]:
        if not removed and page["path"].startswith("topics/java/") and page["kind"] == "chapter":
            removed = True
            continue
        if page["path"] == "topics/ai/README.md":
            page["editorial"] = "planned"
        kept.append(page)
    mutated["pages"] = kept
    changed = sc.apply_homepage(home, mutated)
    if "# 11 个子主题 · 搭建中" not in changed or "# 12 个子主题 · 搭建中" in changed:
        fail("terminal ignored a catalog page-count change")
    if "# 21 个子主题 · 待开始" not in changed or "# 21 个子主题 · 搭建中" in changed:
        fail("terminal ignored a catalog status change")
    changed_en = bes.render_home(mutated)
    if "# 21 subtopics · Not started" not in changed_en:
        fail("English terminal ignored a catalog status change")
    if "| 11 | In progress |" not in changed_en or "| 12 | In progress |" in changed_en:
        fail("English topic table ignored a catalog page-count change")

    css = (ROOT / "website/stylesheets/game.css").read_text(encoding="utf-8")
    if ".tn-g .mode-fab { position: fixed; right: 16px; bottom: 16px;" not in css:
        fail("desktop game button position changed")
    mobile = css.split("@media (max-width: 900px)", 1)
    if len(mobile) != 2:
        fail("mobile game button query missing")
    if "env(safe-area-inset-bottom" in mobile[0] or "padding-right: calc(16px + 48px + 8px + 4px)" in mobile[0]:
        fail("mobile game button rules leaked above the 900px query")
    needed = [
        "right: 16px;",
        "bottom: calc(16px + env(safe-area-inset-bottom, 0px));",
        "width: 48px;",
        "height: 48px;",
        "min-width: 44px;",
        "min-height: 44px;",
        "overflow: visible;",
        "outline: 3px dashed var(--hot);",
        "outline-offset: 3px;",
        "padding-right: calc(16px + 48px + 8px + 4px);",
        "padding-bottom: calc(16px + 48px + 8px + env(safe-area-inset-bottom, 0px));",
    ]
    for snippet in needed:
        if snippet not in mobile[1]:
            fail(f"mobile game button rule missing: {snippet}")

    if len(sys.argv) > 1:
        site = Path(sys.argv[1])
        zh_html = (site / "index.html").read_text(encoding="utf-8")
        en_html = (site / "en" / "index.html").read_text(encoding="utf-8")
        if "理论基础 · 14 章 · 网站" in zh_html or "理论基础 · 14 章 · 网站" in en_html:
            fail("built terminal still has the old theory line")
        for path in order:
            page = by_path[path]
            count = sc.subtopic_count(catalog, path)
            zh_comment = sc.status_comment(page, count, "zh")
            en_comment = sc.status_comment(page, count, "en")
            if zh_comment not in zh_html:
                fail(f"built Chinese home missing {zh_comment}")
            if en_comment not in en_html:
                fail(f"built English home missing {en_comment}")
            desc = re.search(rf'class="d">([^<]*{count} 个子主题[^<]*)', home)
            # Descriptions differ per row; check the row's own description.
            row = next(line for line in home.splitlines() if 'class="d"' in line and f"]({path})" in line)
            description = re.search(r'class="d">([^<]+)', row).group(1)
            if description not in zh_html:
                fail(f"built Chinese topic list missing {description}")
            if f"{count}" not in en_html or sc.LABELS[page["editorial"]]["en"] not in en_html:
                fail(f"built English topic list missing {page['title_zh']}")
        if desc is None:
            fail("no counted description")
    print("ok", len(order), "topics")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
