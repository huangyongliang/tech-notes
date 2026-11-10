#!/usr/bin/env python3
"""English-only pages must switch to a Chinese page that exists."""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LANG_JS = ROOT / "website" / "javascripts" / "lang.js"
# English pages with no Chinese counterpart. Anything else under /en/ keeps its path.
EN_ONLY = {"/en/not-translated/": "/"}


def fail(msg: str) -> None:
    raise SystemExit(msg)


def chinese_target(url: str) -> str:
    if url == "/en/":
        return "/"
    if url in EN_ONLY:
        return EN_ONLY[url]
    if url.startswith("/en/"):
        rest = url[3:]
        return rest or "/"
    return url


def collect(site: Path) -> tuple[set[str], set[str]]:
    chinese, english = set(), set()
    for html in site.rglob("index.html"):
        rel = html.relative_to(site).as_posix()
        if rel == "en/index.html" or rel.startswith("en/"):
            rest = rel[len("en/") :]
            url = "/en/" if rest == "index.html" else "/en/" + rest[: -len("index.html")]
            english.add(url)
            continue
        url = "/" if rel == "index.html" else "/" + rel[: -len("index.html")]
        chinese.add(url)
    return chinese, english


def main() -> int:
    js = LANG_JS.read_text(encoding="utf-8")
    if '"/en/not-translated/": "/"' not in js:
        fail("language switch does not send /en/not-translated/ to the Chinese home")
    if len(sys.argv) < 2:
        print("ok locale routes source")
        return 0
    chinese, english = collect(Path(sys.argv[1]))
    if "/en/" not in english or "/en/not-translated/" not in english:
        fail("english build is missing home or coverage")
    broken = []
    for url in sorted(english):
        target = chinese_target(url)
        if target not in chinese:
            broken.append(f"{url} -> {target}")
    if broken:
        fail("Chinese switch would 404:\n" + "\n".join(broken[:12]))
    fallback = Path(sys.argv[1]) / "en/topics/java/01-language-basics/index.html"
    text = fallback.read_text(encoding="utf-8")
    if 'lang="en"' not in text[:800]:
        fail("English page is missing the interface language")
    if '<div lang="zh"' not in text:
        fail("fallback article body has no lang=zh in the HTML")
    if 'class="tn-fallback" lang="en"' not in text:
        fail("fallback banner is missing")
    english_chapter = Path(sys.argv[1]) / "en/topics/getting-started/05-tech-english/index.html"
    chapter = english_chapter.read_text(encoding="utf-8")
    if 'id="tech-english"' not in chapter:
        fail("Tech English lost id tech-english")
    if '<div lang="zh"' in chapter:
        fail("translated English chapter was marked lang=zh")
    print(f"ok locale routes en={len(english)} zh={len(chinese)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
