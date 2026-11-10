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
    if "topics/getting-started/05-tech-english/README.md" in catalog["mixed_h1_remaining"]:
        fail("slice chapter is still counted as a mixed title")
    if len(catalog["mixed_h1_remaining"]) < 40:
        fail("mixed H1 remainder was bulk-cleared")

    pending = catalog["pending_integrations"][0]
    if pending["pr"] != 33 or pending["merged"] or pending["head"] != "ea769011e3af96324ba5deeeb22da3b98f2e035a":
        fail("PR 33 pending record changed")
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
    if "待开始" not in web or "未译" not in web or "s--wip" in web:
        fail(f"web must stay planned and untranslated until PR 33: {web}")

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
    if java_out.count(BANNER) != 1 or not java_out.split("title:", 1)[1].startswith(' "Chinese original:'):
        fail("fallback page missing the exact banner or search label")
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
    if "not-translated" in lang_js or "English translation unavailable" in lang_js:
        fail("language switch is still a list redirect or a string translator")
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
        if "topics/systems/distributed" in home or "topics/web/origin" in missing:
            fail("PR 33 pages were counted before merge")
        if BANNER in built_chapter or BANNER not in built_java:
            fail("builder swapped translated and fallback pages")
        if "Chinese original:" not in built_java.split("\n", 3)[1]:
            fail("built fallback is missing its search title")
        if (built / "javascripts" / "lang-map.js").exists():
            fail("English site still depends on a search-limit map")
        if "locale" in built_chapter and "TREEIFY" in built_chapter:
            fail("english slice picked up unrelated chapters")

    print(
        f"ok pages={counts['pages']} translated={counts['translated']} "
        f"untranslated={counts['untranslated']} mixed_h1={len(catalog['mixed_h1_remaining'])}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
