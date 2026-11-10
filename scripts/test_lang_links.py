#!/usr/bin/env python3
"""Language-switch links must resolve to a built page, including /en/."""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LANG_JS = ROOT / "website" / "javascripts" / "lang.js"
SRC_RE = re.compile(r'<script src="([^"]*lang\.js[^"]*)"')


def fail(msg: str) -> None:
    raise SystemExit(msg)


def links_for(pages: list[dict]) -> list[dict]:
    raw = subprocess.check_output(
        [
            "node",
            "-e",
            "const fs=require('fs');"
            "const lang=require(process.argv[1]);"
            "const pages=JSON.parse(fs.readFileSync(0,'utf8'));"
            "process.stdout.write(JSON.stringify(pages.map(p=>Object.assign({url:p.url},lang.linksFor(p.url,p.src)))));",
            str(LANG_JS),
        ],
        input=json.dumps(pages),
        text=True,
    )
    return json.loads(raw)


def resolve(page: str, href: str) -> str:
    href = href.split("#", 1)[0].split("?", 1)[0]
    if href in ("", "./"):
        return page
    if "://" in href or href.startswith("//") or href.startswith("/"):
        return "ABS:" + href
    parts: list[str] = []
    for part in (page + href).split("/"):
        if part in ("", "."):
            continue
        if part == "..":
            if not parts:
                return "ABOVE"
            parts.pop()
            continue
        parts.append(part)
    if not parts:
        return "/"
    return "/" + "/".join(parts) + "/"


def page_url(site: Path, html: Path) -> str:
    rel = html.relative_to(site).as_posix()
    if rel == "en/index.html":
        return "/en/"
    if rel.startswith("en/"):
        rest = rel[len("en/") :]
        return "/en/" if rest == "index.html" else "/en/" + rest[: -len("index.html")]
    return "/" if rel == "index.html" else "/" + rel[: -len("index.html")]


def collect(site: Path) -> list[dict]:
    pages = []
    for html in sorted(site.rglob("index.html")):
        text = html.read_text(encoding="utf-8", errors="replace")
        found = SRC_RE.search(text)
        if not found:
            fail(f"no lang.js on {html.relative_to(site)}")
        pages.append({"url": page_url(site, html), "src": found.group(1)})
    return pages


def check(rows: list[dict], chinese: set[str] | None, english: set[str] | None) -> None:
    broken = []
    for row in rows:
        page = row["url"]
        zh = resolve(page, row["zh"])
        en = resolve(page, row["en"])
        on_en = page == "/en/" or page.startswith("/en/")
        same, other = (en, zh) if on_en else (zh, en)
        same_set = english if on_en else chinese
        other_set = chinese if on_en else english
        if same != page:
            broken.append(f"{page} current -> {same} ({row['zh' if not on_en else 'en']})")
        if "/en/en/" in en or en.startswith("/en/en"):
            broken.append(f"{page} english doubled -> {en}")
        if chinese is None:
            continue
        if same not in same_set or other not in other_set:
            broken.append(f"{page} zh={zh} en={en}")
    if broken:
        fail("language switch 404:\n" + "\n".join(broken[:20]))


def main() -> int:
    fixtures = [
        {"url": "/", "src": "javascripts/lang.js"},
        {"url": "/topics/java/", "src": "../../javascripts/lang.js"},
        {"url": "/topics/java/01-language-basics/", "src": "../../../javascripts/lang.js"},
        {"url": "/en/", "src": "javascripts/lang.js"},
        {"url": "/en/topics/java/", "src": "../../javascripts/lang.js"},
        {"url": "/en/topics/java/01-language-basics/", "src": "../../../javascripts/lang.js"},
        {"url": "/en/not-translated/", "src": "../javascripts/lang.js"},
    ]
    rows = links_for(fixtures)
    home = next(row for row in rows if row["url"] == "/en/")
    if home["en"] in ("en/", "en/en/", "/en/en/"):
        fail(f"English home still links to a nested /en/: {home['en']}")
    check(rows, None, None)
    expect = {
        "/": ("/", "/en/"),
        "/topics/java/": ("/topics/java/", "/en/topics/java/"),
        "/topics/java/01-language-basics/": (
            "/topics/java/01-language-basics/",
            "/en/topics/java/01-language-basics/",
        ),
        "/en/": ("/", "/en/"),
        "/en/topics/java/": ("/topics/java/", "/en/topics/java/"),
        "/en/topics/java/01-language-basics/": (
            "/topics/java/01-language-basics/",
            "/en/topics/java/01-language-basics/",
        ),
        "/en/not-translated/": ("/", "/en/not-translated/"),
    }
    for row in rows:
        zh, en = resolve(row["url"], row["zh"]), resolve(row["url"], row["en"])
        if (zh, en) != expect[row["url"]]:
            fail(f"{row['url']} -> zh {zh} en {en}, hrefs {row['zh']} {row['en']}")
    if len(sys.argv) < 2:
        print("ok lang links source")
        return 0
    site = Path(sys.argv[1])
    pages = collect(site)
    urls = {page["url"] for page in pages}
    chinese = {url for url in urls if not (url == "/en/" or url.startswith("/en/"))}
    english = urls - chinese
    if "/en/" not in english or "/" not in chinese or "/en/not-translated/" not in english:
        fail("built site is missing home or coverage")
    built = links_for(pages)
    check(built, chinese, english)
    print(f"ok lang links pages={len(pages)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
