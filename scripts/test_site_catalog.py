#!/usr/bin/env python3
"""Catalog, translation coverage, and English-switch checks. No network."""
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


def fail(msg: str) -> None:
    raise SystemExit(msg)


def main() -> int:
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

    translated = [p["path"] for p in catalog["pages"] if p["translation"] == "translated"]
    if translated != [
        "topics/getting-started/05-tech-english/README.md",
        "website/index.md",
    ]:
        fail(f"translated set changed: {translated}")

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

    with tempfile.TemporaryDirectory() as tmp:
        site = Path(tmp)
        (site / "javascripts").mkdir()
        counts = bes.build(site, ROOT)
        if counts["translated"] != 2:
            fail("builder coverage mismatch")
        home = (site / "en" / "index.md").read_text(encoding="utf-8")
        missing = (site / "en" / "not-translated.md").read_text(encoding="utf-8")
        chapter = (site / "en" / "topics" / "getting-started" / "05-tech-english" / "README.md").read_text(encoding="utf-8")
        if "Locale" in chapter and "TREEIFY" in chapter:
            fail("english slice picked up unrelated chapters")
        if "Not started" not in home or "In progress" not in home:
            fail("english home missing editorial labels")
        if "topics/systems/distributed" in home or "topics/web/origin" in missing:
            fail("PR 33 pages were counted before merge")
        if f"**{counts['untranslated']}**" not in missing and str(counts["untranslated"]) not in missing:
            fail("not-translated page missing the count")
        if "只在网站上阅读" in chapter:
            fail("english chapter still contains the Chinese body")
        lang = (site / "javascripts" / "lang-map.js").read_text(encoding="utf-8")
        if "window.TN_LANG" not in lang:
            fail("lang map missing")
        data = json.loads(lang.split("=", 1)[1].strip().rstrip(";"))
        if data["translated"].get("/topics/getting-started/05-tech-english/") != "/en/topics/getting-started/05-tech-english/":
            fail("tech english switch target wrong")
        if "/topics/web/" in data["translated"]:
            fail("web topic routed to English")
        if data["anchors"].get("/topics/web/") != "topics-web":
            fail("web topic missing untranslated anchor")
        if "/topics/systems/distributed/" in data["anchors"] or "/topics/web/origin/" in data["anchors"]:
            fail("PR 33 paths entered the switch map")
        # Chinese page without English must not be given a translated URL.
        if "/topics/java/01-language-basics/" in data["translated"]:
            fail("untranslated chapter exposed as English")
        if any(key.startswith("/en/") for key in data["translated"]):
            fail("English URLs must not be keys; the map is Chinese to English")

    print(f"ok pages={counts['pages']} translated={counts['translated']} untranslated={counts['untranslated']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
