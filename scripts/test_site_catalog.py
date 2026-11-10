#!/usr/bin/env python3
"""Catalog, translation coverage, fallback routing, and English-nav checks."""
from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import build_english_slice as bes  # noqa: E402
import site_catalog as sc  # noqa: E402

ROOT = sc.ROOT
BANNER = "English translation unavailable. Showing the Chinese original."


def fail(msg: str) -> None:
    raise SystemExit(msg)


def main() -> int:
    if sc.FALLBACK_BANNER != BANNER:
        fail("fallback banner text drifted")
    catalog = json.loads(sc.CATALOG_PATH.read_text(encoding="utf-8"))
    errors = sc.coverage_errors(ROOT, catalog)
    if errors:
        fail("\n".join(errors))

    counts = catalog["counts"]
    if counts["translated"] != 2 or counts["untranslated"] != counts["pages"] - 2:
        fail(f"unexpected coverage {counts}")
    if counts["editorial"]["complete"] != 0:
        fail("a page is marked complete")
    if counts["pages"] < 90:
        fail("catalog dropped pages")
    if "xp" in json.dumps(catalog["counts"]) or any("xp" in page for page in catalog["pages"]):
        fail("catalog stores personal progress")

    translated = [p["path"] for p in catalog["pages"] if p["translation"] == "translated"]
    if translated != [
        "topics/getting-started/05-tech-english/README.md",
        "website/index.md",
    ]:
        fail(f"translated set changed: {translated}")
    if catalog["mixed_h1_remaining"]:
        fail("an H1 still appends an English gloss: " + ", ".join(catalog["mixed_h1_remaining"][:8]))

    pending = catalog["pending_integrations"][0]
    if pending["pr"] != 33 or not pending["merged"] or pending["head"] != "3b56fcd5dcf65274afbc4d95fd186517ddac8b4b":
        fail("PR 33 merged record changed")
    new_paths = [row["path"] for row in pending["when_merged"] if row.get("new_file")]
    if new_paths != [
        "topics/web/origin/README.md",
        "topics/systems/distributed/README.md",
    ]:
        fail(f"pending new pages changed: {new_paths}")

    selection = json.loads((ROOT / "miniprogram" / "content-selection.json").read_text(encoding="utf-8"))
    if selection["documentCount"] != 35 or len(selection["included"]) != 35:
        fail("frozen miniapp 35 selection changed")
    by_path = {p["path"]: p for p in catalog["pages"]}
    for rel in selection["included"]:
        if rel not in by_path:
            fail(f"miniapp doc missing from catalog: {rel}")
        if by_path[rel]["editorial"] == "complete":
            fail(f"miniapp doc marked complete: {rel}")

    home_text = (ROOT / "website" / "index.md").read_text(encoding="utf-8")
    if sc.apply_homepage(home_text, catalog) != home_text:
        fail("homepage is not the catalog generator output")
    if "<small>" in home_text.split("## 全部主题", 1)[-1]:
        fail("Chinese topic index still shows an English gloss")
    if "清掉记录不会改变编辑状态" not in home_text:
        fail("homepage does not separate personal progress from editorial status")
    gs = [line for line in home_text.splitlines() if "topics/getting-started/README.md" in line][0]
    if "部分" not in gs or "已译" in gs:
        fail(f"getting-started rollup should be partial: {gs}")
    web = [line for line in home_text.splitlines() if "](topics/web/README.md)" in line][0]
    systems = [line for line in home_text.splitlines() if "](topics/systems/README.md)" in line][0]
    if "搭建中" not in web or "未译" not in web or "待开始" in web:
        fail(f"web must be in progress and untranslated: {web}")
    if "搭建中" not in systems or "未译" not in systems:
        fail(f"systems must be in progress and untranslated: {systems}")
    for rel in ("topics/web/origin/README.md", "topics/systems/distributed/README.md"):
        page = by_path[rel]
        if page["editorial"] != "building" or page["translation"] != "untranslated":
            fail(f"new chapter has the wrong status: {page}")
    web_table = (ROOT / "topics/web/README.md").read_text(encoding="utf-8")
    if sc.apply_status_tables(web_table, catalog, "topics/web/README.md") != web_table:
        fail("web status table drifted from the catalog")
    moved = json.loads(json.dumps(catalog))
    for page in moved["pages"]:
        if page["path"] == "topics/web/origin/README.md":
            page["editorial"] = "planned"
    rewritten = sc.apply_status_tables(web_table, moved, "topics/web/README.md")
    if "⚪" not in rewritten or rewritten == web_table:
        fail("status table generator ignored the catalog")

    mutated = json.loads(json.dumps(catalog))
    for page in mutated["pages"]:
        if page["path"] == "topics/roadmap/README.md":
            page["editorial"] = "planned"
    mutated_home = sc.apply_homepage(home_text, mutated)
    roadmap = [line for line in mutated_home.splitlines() if 'class="n">00' in line][0]
    if "待开始" not in roadmap or "搭建中" in roadmap:
        fail("homepage generator ignored the catalog editorial value")
    if mutated_home == home_text:
        fail("negative catalog edit did not change the homepage")

    java = by_path["topics/java/01-language-basics/README.md"]
    if java["translation"] != "untranslated":
        fail("fallback chapter counted as translated")
    java_src = (ROOT / java["path"]).read_text(encoding="utf-8")
    java_out = bes.fallback_markdown(java, java_src)
    if java_out.count(BANNER) != 1:
        fail("fallback page missing the exact banner")
    if 'title: "Chinese original:' in java_out:
        fail("the Chinese-original label belongs in search, not the page title")
    if bes.english_url(java["path"]) != "/en/topics/java/01-language-basics/":
        fail("untranslated chapter was redirected")
    if bes.chinese_url("/en/topics/java/01-language-basics/") != "/topics/java/01-language-basics/":
        fail("English article lost its Chinese counterpart")
    if bes.english_url(java["path"]) in ("/", "/en/", "/en/not-translated/"):
        fail("language switch left the article")

    chapter = by_path["topics/getting-started/05-tech-english/README.md"]
    chapter_src = sc.english_source(chapter["path"]).read_text(encoding="utf-8")
    chapter_out = bes.translated_markdown(chapter, chapter_src, "en")
    if BANNER in chapter_out or "Editorial status:" not in chapter_out or "Translated" not in chapter_out:
        fail("translated chapter was treated as a fallback")
    if "只在网站上阅读" in chapter_src:
        fail("english chapter still contains the Chinese body")

    lang_js = (ROOT / "website/javascripts/lang.js").read_text(encoding="utf-8")
    if "English translation unavailable" in lang_js:
        fail("language switch injects the banner instead of leaving it in the page")
    if 'return "/en/not-translated' in lang_js or "return '/en/not-translated" in lang_js:
        fail("an article without English is sent to the coverage list")
    if '"/en/not-translated/": "/"' not in lang_js:
        fail("the coverage page itself has no Chinese destination")
    boot = (ROOT / "website/javascripts/mode-boot.js").read_text(encoding="utf-8")
    if 'return stored() || "game"' not in boot:
        fail("default mode is no longer game")
    quest = (ROOT / "website/javascripts/quest.js").read_text(encoding="utf-8")
    if "editorial" in quest or "site-catalog" in quest:
        fail("quest progress writes editorial state")
    if "topics/java/README.md" in sc.GENERATED_SURFACES:
        fail("topic tables were claimed as generated")

    nav = bes.english_nav(catalog, bes._load_mkdocs_nav(ROOT))
    flat = json.dumps(nav, ensure_ascii=False)
    if "首页" in flat or "en/index.md" in flat or "Tech English" not in flat:
        fail("English nav is not English")
    if "not-translated.md" not in flat:
        fail("coverage inventory was removed")

    with tempfile.TemporaryDirectory() as tmp:
        counts = bes.build(Path(tmp) / "en", ROOT, write_config=False)
        built = Path(tmp) / "en"
        home = (built / "index.md").read_text(encoding="utf-8")
        missing = (built / "not-translated.md").read_text(encoding="utf-8")
        built_chapter = (built / "topics/getting-started/05-tech-english/README.md").read_text(encoding="utf-8")
        built_java = (built / "topics/java/01-language-basics/README.md").read_text(encoding="utf-8")
        if counts["translated"] != 2:
            fail("builder coverage mismatch")
        if "Not started" not in home or "In progress" not in home or "Partial" not in home:
            fail("english home missing editorial or translation labels")
        if "topics/web/origin" not in missing or "topics/systems/distributed" not in missing:
            fail("merged Chinese chapters are missing from the untranslated list")
        if 'title: "Chinese original:' in built_java:
            fail("fallback markdown title is prefixed")
        h1 = next(line for line in built_java.splitlines() if line.startswith("# "))
        if not h1.startswith("# Language basics and new features"):
            fail(f"fallback H1 is not the English display name: {h1}")
        if "{#language-basics}" not in h1:
            fail(f"fallback H1 dropped the old anchor: {h1}")
        if "语言基础与新特性" not in built_java:
            fail("fallback body lost the Chinese article")
        if BANNER in built_chapter or BANNER not in built_java:
            fail("builder swapped translated and fallback pages")
        labeled = bes.label_search_index(
            {"docs": [
                {"location": "topics/java/01-language-basics/", "title": "语言基础与新特性"},
                {"location": "topics/java/01-language-basics/#x", "title": "闯关任务"},
                {"location": "topics/getting-started/05-tech-english/", "title": "Tech English"},
            ]},
            catalog,
        )
        titles = [doc["title"] for doc in labeled["docs"]]
        if titles != [
            "Chinese original: Language basics and new features",
            "Chinese original: Language basics and new features",
            "Tech English",
        ]:
            fail(f"search labels drifted: {titles}")
        if (built / "javascripts" / "lang-map.js").exists():
            fail("English site still depends on a search-limit map")
        if "locale" in built_chapter and "TREEIFY" in built_chapter:
            fail("english slice picked up unrelated chapters")
    if "Chinese original:" in flat:
        fail("English navigation still prefixes untranslated titles")
    if "语言基础与新特性" in flat:
        fail("English nav still uses a Chinese chapter title")
    if "Language basics and new features" not in flat:
        fail("English nav is missing the English chapter title")

    print(
        f"ok pages={counts['pages']} translated={counts['translated']} "
        f"untranslated={counts['untranslated']} mixed_h1={len(catalog['mixed_h1_remaining'])}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
