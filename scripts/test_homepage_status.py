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
        phrase = sc.subtopic_phrase(count, "en")
        title_en = page.get("title_en") or ""
        if not title_en:
            fail(f"topic has no English name: {path}")
        if (page["translation"] == "translated") != (path in sc.TRANSLATED):
            fail(f"topic translation does not follow the translated set: {path}")
        if title_en not in english:
            fail(f"English home missing {title_en}")
        if page["title_zh"] not in title_en and page["title_zh"] in english:
            fail(f"English home still shows the Chinese title: {page['title_zh']}")
        en_row = (
            f'<td data-label="Topic">{title_en}</td>'
            f'<td data-label="Subtopics">{phrase}</td>'
            f'<td data-label="Editorial">{en_label}</td>'
            f'<td data-label="Translation">{sc.TR_LABELS[sc.translation_rollup(page, catalog["pages"])]["en"]}</td>'
        )
        if en_row not in english:
            fail(f"English topic row drifted: {title_en}")

    for path in (home_path, readme_path, index_path):
        assert_converted(path, catalog)
    if "已有一章" in index:
        fail("topic index still spells the page count in prose")
    for line in english.splitlines():
        if re.search(r"\d+\s*章", line):
            fail(f"English home still has a hard-coded chapter count: {line}")
    topics = [page for page in catalog["pages"] if page["kind"] == "topic"]
    if len(topics) != 15 or any(not page.get("title_en") for page in topics):
        fail("expected 15 topics with English display names")
    if catalog["counts"]["translated"] != 7 or catalog["counts"]["untranslated"] != catalog["counts"]["pages"] - 7:
        fail("translation counts drifted")
    phrases = {
        sc.subtopic_phrase(sc.subtopic_count(catalog, page["path"]), "en")
        for page in topics
    }
    if "1 subtopic" not in phrases or "1 subtopics" in phrases:
        fail(f"English subtopic phrase is not singular for one page: {sorted(phrases)}")
    if "0 subtopics" not in phrases or "5 subtopics" not in phrases:
        fail("English plural subtopic phrase drifted")
    if re.search(r"(?<!\d)1 subtopics", english):
        fail("English home uses the plural for one subtopic")
    css_extra = (ROOT / "website/stylesheets/extra.css").read_text(encoding="utf-8")
    narrow = css_extra.split("@media (max-width: 900px)", 1)
    if len(narrow) != 2 or "white-space: pre-wrap;" not in narrow[1] or "overflow-wrap: anywhere;" not in narrow[1]:
        fail("narrow terminal does not wrap")
    if "padding-right: calc(1.1rem + 6px);" not in narrow[1]:
        fail("narrow terminal is missing right breathing room")
    if ".tn-en-topics td::before" not in narrow[1] or 'content: attr(data-label);' not in narrow[1]:
        fail("narrow English topic table does not show column labels")

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
    if "11 subtopics" not in changed_en or "12 subtopics" in changed_en:
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
        "outline: 3px solid var(--tn-ink);",
        "outline-offset: 3px;",
        "padding-right: calc(16px + 48px + 8px + 4px);",
        "padding-bottom: calc(16px + 48px + 8px + env(safe-area-inset-bottom, 0px));",
    ]
    for snippet in needed:
        if snippet not in mobile[1]:
            fail(f"mobile game button rule missing: {snippet}")
    if ".mode-fab:focus," in mobile[1] or ".mode-fab:focus {" in mobile[1]:
        fail("game button focus ring must be :focus-visible only")

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
            if page.get("title_en") and page["title_en"] not in en_html:
                fail(f"built English home missing {page['title_en']}")
            shown = en_html[en_html.find("tn2-term"):en_html.find("tn-en-topics")] + en_html[en_html.find("tn-en-topics"):en_html.find("</table>")]
            if page["title_zh"] not in (page.get("title_en") or "") and page["title_zh"] in shown:
                fail(f"built English home still shows {page['title_zh']}")
            if sc.subtopic_phrase(count, "en") not in en_html:
                fail(f"built English home missing {sc.subtopic_phrase(count, 'en')}")
        if 'aria-label="Next: Roadmap"' not in en_html or "从零到 AI 学习路线" in en_html:
            fail("English footer Next is still the Chinese topic title")
        if desc is None:
            fail("no counted description")
    print("ok", len(order), "topics")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
