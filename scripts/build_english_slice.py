#!/usr/bin/env python3
"""Build the English site from the catalog.

Translated pages are the English sources. Every other catalog page is the
same article under /en/, with the Chinese body and an explicit banner.
The banner is not a translation. English chrome comes from a second MkDocs
config (theme language en), not from rewriting interface strings in JavaScript.
"""
from __future__ import annotations

import shutil
import sys
from pathlib import Path

import yaml

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import site_catalog as sc  # noqa: E402

SECTION_EN = {
    "学习路线": "Roadmap",
    "基础": "Foundations",
    "理论基础": "Theory",
    "Java": "Java",
    "微服务": "Microservices",
    "AI": "AI",
    "全部主题": "All topics",
    "Web": "Web",
    "系统": "Systems",
    "资料": "Sources",
    "关于": "About",
}


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


def chinese_url(english_path: str) -> str:
    if english_path == "/en/":
        return "/"
    if english_path.startswith("/en/"):
        return english_path[3:]
    return english_path


def catalog_path(nav_path: str) -> str:
    if nav_path == "index.md":
        return "website/index.md"
    return nav_path


# Site chrome, not article titles. Untranslated chapters keep their Chinese titles.
INTERFACE_LABELS = {
    "index.md": "Home",
    "notes/README.md": "Notes",
    "resources/README.md": "Sources",
    "resources/links.md": "Links",
    "CONTRIBUTING.md": "Contributing",
    "STYLE.md": "Style guide",
    "topics/inbox/README.md": "Inbox",
}


def nav_label(nav_path: str, by_path: dict) -> str:
    if nav_path in INTERFACE_LABELS:
        return INTERFACE_LABELS[nav_path]
    page = by_path.get(catalog_path(nav_path))
    if page is None:
        raise SystemExit(f"nav path missing from catalog: {nav_path}")
    if page.get("kind") == "topic" and page.get("title_en"):
        return page["title_en"]
    if page["translation"] == "translated":
        return page["title_en"] or page["title_zh"]
    return page["title_zh"]


def english_nav(catalog: dict, chinese_nav: list) -> list:
    by_path = {page["path"]: page for page in catalog["pages"]}

    def walk(node):
        if isinstance(node, list):
            out = []
            for item in node:
                if isinstance(item, dict) and list(item.keys()) == ["English"]:
                    continue
                out.append(walk(item))
            return out
        if isinstance(node, dict):
            out = {}
            for key, value in node.items():
                if key == "English":
                    continue
                if isinstance(value, str):
                    label = nav_label(value, by_path)
                    if label in out:
                        label = f"{label} ({value})"
                    out[label] = value
                elif isinstance(value, list):
                    if key not in SECTION_EN:
                        raise SystemExit(f"no English section label for {key}")
                    out[SECTION_EN[key]] = walk(value)
                else:
                    raise SystemExit(f"unsupported nav node: {key}")
            return out
        if isinstance(node, str):
            label = nav_label(node, by_path)
            return {label: node}
        raise SystemExit(f"unsupported nav node: {node!r}")

    nav = walk(chinese_nav)
    nav.append({"Coverage": "not-translated.md"})
    return nav


def _set_title(front_matter: str, title: str) -> str:
    safe = title.replace('"', "'")
    line = f'title: "{safe}"'
    if not front_matter:
        return f"---\n{line}\n---\n"
    if "\ntitle:" in "\n" + front_matter:
        return __import__("re").sub(r"(?m)^title:.*$", line, front_matter, count=1)
    return front_matter.replace("---\n", f"---\n{line}\n", 1)


def english_page_location(path: str) -> str:
    url = site_url(path)
    if url == "/":
        return ""
    return url.strip("/") + "/"


def label_search_index(index: dict, catalog: dict) -> dict:
    """Prefix search hits from untranslated pages. Navigation titles stay plain."""
    untranslated = {
        english_page_location(page["path"])
        for page in catalog["pages"]
        if page["translation"] == "untranslated"
    }
    for doc in index.get("docs") or []:
        location = doc.get("location") or ""
        page = location.split("#", 1)[0]
        if page and not page.endswith("/"):
            page += "/"
        title = doc.get("title") or ""
        if page in untranslated and not title.startswith("Chinese original:"):
            doc["title"] = "Chinese original: " + title
    return index


def fallback_markdown(page: dict, text: str) -> str:
    front_matter, body = sc.split_front_matter(text)
    banner = (
        '<div class="tn-fallback" lang="en" role="status">'
        + sc.FALLBACK_BANNER
        + "</div>\n"
        '<script>var n=document.currentScript.closest(".md-content__inner");'
        'if(n)n.lang="zh";document.documentElement.lang="en";</script>\n\n'
    )
    return front_matter.rstrip() + "\n\n" + banner + body.lstrip("\n")


def translated_markdown(page: dict, text: str, lang: str) -> str:
    if sc.FALLBACK_BANNER in text:
        raise SystemExit(f"translated page contains the fallback banner: {page['path']}")
    front_matter, body = sc.split_front_matter(text)
    if 'class="tn-status"' in body:
        return text if text.endswith("\n") else text + "\n"
    paragraph = sc.status_paragraph(page, lang)
    if front_matter:
        return front_matter.rstrip() + "\n\n" + paragraph + body.lstrip("\n")
    return paragraph + text


def topic_table(catalog: dict, order: list[str]) -> str:
    """Labelled rows. Narrow screens stack each cell with its column name."""
    labels = catalog["labels"]
    by_path = {page["path"]: page for page in catalog["pages"]}
    rows = [
        "<div class=\"tn-en-topics\">",
        "<table>",
        "<thead><tr><th>Topic</th><th>Subtopics</th><th>Editorial</th><th>Translation</th><th>Page</th></tr></thead>",
        "<tbody>",
    ]
    for path in order:
        page = by_path[path]
        title = page.get("title_en") or page["title_zh"]
        count = sc.subtopic_count(catalog, path)
        phrase = sc.subtopic_phrase(count, "en")
        editorial = labels[page["editorial"]]["en"]
        translation = sc.TR_LABELS[sc.translation_rollup(page, catalog["pages"])]["en"]
        rel = english_url(path).removeprefix("/en/")
        rows.append(
            "<tr>"
            f'<td data-label="Topic">{title}</td>'
            f'<td data-label="Subtopics">{phrase}</td>'
            f'<td data-label="Editorial">{editorial}</td>'
            f'<td data-label="Translation">{translation}</td>'
            f'<td data-label="Page"><a href="{rel}">Open</a></td>'
            "</tr>"
        )
    rows += ["</tbody>", "</table>", "</div>"]
    return "\n".join(rows)


def render_home(catalog: dict) -> str:
    counts = catalog["counts"]
    by_path = {page["path"]: page for page in catalog["pages"]}
    home = by_path["website/index.md"]
    order = list(sc.homepage_statuses().keys())
    lines = [
        "# tech-notes",
        "",
        sc.status_paragraph(home, "en").rstrip(),
        "",
        "A public engineering notebook: short notes, links, and a record of what was actually understood.",
        "",
        f"English coverage: **{counts['translated']}** of **{counts['pages']}** catalog pages have an English body. "
        f"**{counts['untranslated']}** do not. Opening English stays on that article. "
        "The Chinese body shown there is not counted as translated.",
        "",
        "Search titles that start with “Chinese original” are those untranslated pages.",
        "",
        "## Translated now",
        "",
        "- [Tech English](topics/getting-started/05-tech-english/) — how to read errors and official manuals.",
        "",
        "## Topics",
        "",
        "Editorial status is the publishing state. Translation is separate. Neither one is on-device quest progress.",
        "",
        sc.terminal_html(catalog, "en", order),
        "",
        topic_table(catalog, order),
    ]
    lines += [
        "",
        "The quest map and experience points stay on the [Chinese home](../). "
        "Clearing on-device progress does not change editorial status, and this English page does not change the XP curve.",
        "",
        "Pages with no English body are also listed on [Coverage](not-translated.md). "
        "That list is an index. The language switch does not send you there.",
        "",
    ]
    return "\n".join(lines)


def render_not_translated(catalog: dict) -> str:
    labels = catalog["labels"]
    counts = catalog["counts"]
    lines = [
        "# Coverage",
        "",
        "[English home](./) · [Chinese home](../)",
        "",
        f"**{counts['translated']}** of **{counts['pages']}** catalog pages are translated. "
        f"**{counts['untranslated']}** are not. "
        "A Chinese body on the English URL is the original article, not a translation.",
        "",
        "Editorial status is the publishing state of the Chinese page. "
        f"None are marked {labels['complete']['en']}.",
        "",
        "PR 33 is merged. Web and Systems are in progress, and their two new chapters are Chinese originals, not translations.",
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
            title = page["title_zh"]
            rel = english_url(page["path"]).removeprefix("/en/")
            lines.append(
                f"- <span id=\"{anchor_for(page['path'])}\"></span>"
                f"**{title}** — Chinese title: {page['title_zh']}. "
                f"[Same article]({rel}) · [Chinese URL]({_chinese_href(page['path'])})"
            )
        lines.append("")
    return "\n".join(lines) + "\n"


def anchor_for(path: str) -> str:
    text = path
    if text.endswith("/README.md"):
        text = text[: -len("/README.md")]
    elif text.endswith(".md"):
        text = text[: -len(".md")]
    return text.replace("/", "-")


def _chinese_href(path: str) -> str:
    url = site_url(path)
    if url == "/":
        return "../"
    return ".." + url


def render_mkdocs_en(nav: list) -> str:
    nav_yaml = yaml.safe_dump(nav, allow_unicode=True, sort_keys=False).rstrip()
    return f"""# Generated by scripts/build_english_slice.py. Do not hand-edit.
site_name: tech-notes
site_url: https://huangyongliang.github.io/tech-notes/en/
repo_url: https://github.com/huangyongliang/tech-notes
repo_name: tech-notes
docs_dir: _site_en
theme:
  name: material
  language: en
  palette:
    - media: "(prefers-color-scheme: light)"
      scheme: default
      primary: custom
      accent: custom
      toggle: {{icon: material/weather-night, name: Switch to dark}}
    - media: "(prefers-color-scheme: dark)"
      scheme: slate
      primary: custom
      accent: custom
      toggle: {{icon: material/weather-sunny, name: Switch to light}}
  font: false
  icon: {{repo: fontawesome/brands/github, logo: material/notebook-outline}}
  features:
    - navigation.tabs
    - navigation.indexes
    - navigation.top
    - navigation.footer
    - search.suggest
    - search.highlight
    - content.code.copy
    - toc.follow
    - navigation.instant
    - navigation.tracking
extra_css:
  - stylesheets/extra.css
extra_javascript:
  - javascripts/lang.js
hooks:
  - scripts/english_page_hook.py
nav:
{indent(nav_yaml)}
plugins:
  - search:
      lang: [en, zh]
      separator: '[\\s\\u200b\\-_,:!=\\[\\]()"`/]+|\\.(?!\\d)|&[lg]t;|(?!\\b)(?=[A-Z][a-z])'
markdown_extensions:
  - admonition
  - github-callouts
  - attr_list
  - md_in_html
  - tables
  - pymdownx.tasklist: {{custom_checkbox: true, clickable_checkbox: true}}
  - toc: {{permalink: true}}
  - pymdownx.highlight: {{anchor_linenums: true}}
  - pymdownx.superfences:
      custom_fences:
        - name: mermaid
          class: mermaid
          format: !!python/name:pymdownx.superfences.fence_code_format
  - pymdownx.emoji:
      emoji_index: !!python/name:material.extensions.emoji.twemoji
      emoji_generator: !!python/name:material.extensions.emoji.to_svg
site_author: tech-notes contributors
copyright: "© tech-notes contributors · CC BY 4.0"
edit_uri: edit/main/
validation:
  omitted_files: warn
  absolute_links: info
  unrecognized_links: info
  anchors: warn
"""


def indent(text: str) -> str:
    return "\n".join("  " + line if line else line for line in text.splitlines())


def _output(english_dir: Path, rel: str) -> Path:
    if rel == "website/index.md":
        return english_dir / "index.md"
    return english_dir / rel


def _load_mkdocs_nav(root: Path) -> list:
    class Loader(yaml.SafeLoader):
        pass

    Loader.add_multi_constructor("tag:yaml.org,2002:python/name:", lambda loader, suffix, node: suffix)
    data = yaml.load((root / "mkdocs.yml").read_text(encoding="utf-8"), Loader=Loader)
    return data["nav"]


def build(
    english_dir: Path,
    root: Path | None = None,
    site_src: Path | None = None,
    write_config: bool = True,
) -> dict:
    root = root or sc.ROOT
    import json

    catalog = json.loads((root / "website" / "data" / "site-catalog.json").read_text(encoding="utf-8"))
    errors = sc.coverage_errors(root, catalog)
    if errors:
        raise SystemExit("catalog check failed:\n" + "\n".join(errors))
    by_path = {page["path"]: page for page in catalog["pages"]}
    if english_dir.exists():
        shutil.rmtree(english_dir)
    english_dir.mkdir(parents=True)
    for page in catalog["pages"]:
        dest = _output(english_dir, page["path"])
        dest.parent.mkdir(parents=True, exist_ok=True)
        if page["translation"] == "translated" and page["path"] == "website/index.md":
            dest.write_text(render_home(catalog), encoding="utf-8")
            continue
        if page["translation"] == "translated":
            source = sc.english_source(page["path"]).read_text(encoding="utf-8")
            dest.write_text(translated_markdown(page, source, "en"), encoding="utf-8")
            continue
        source = (root / page["path"]).read_text(encoding="utf-8")
        written = fallback_markdown(page, source)
        if page["translation"] != "untranslated":
            raise SystemExit(page["path"])
        if sc.FALLBACK_BANNER not in written:
            raise SystemExit(f"fallback missing banner: {page['path']}")
        dest.write_text(written, encoding="utf-8")
    (english_dir / "not-translated.md").write_text(render_not_translated(catalog), encoding="utf-8")
    styles = english_dir / "stylesheets"
    scripts = english_dir / "javascripts"
    styles.mkdir()
    scripts.mkdir()
    shutil.copy(root / "website" / "stylesheets" / "extra.css", styles / "extra.css")
    shutil.copy(root / "website" / "javascripts" / "lang.js", scripts / "lang.js")
    nav = english_nav(catalog, _load_mkdocs_nav(root))
    config = render_mkdocs_en(nav)
    if "language: en" not in config or "首页:" in config:
        raise SystemExit("English MkDocs config is not English")
    if write_config:
        (root / "mkdocs.en.yml").write_text(config, encoding="utf-8")
    if site_src is not None:
        index = site_src / "index.md"
        if index.is_file():
            index.write_text(
                sc.apply_homepage(index.read_text(encoding="utf-8"), catalog),
                encoding="utf-8",
            )
        chapter = site_src / "topics" / "getting-started" / "05-tech-english" / "README.md"
        if chapter.is_file():
            page = by_path["topics/getting-started/05-tech-english/README.md"]
            chapter.write_text(
                translated_markdown(page, chapter.read_text(encoding="utf-8"), "zh"),
                encoding="utf-8",
            )
        sc.write_status_tables(site_src, catalog)
        topic_index = site_src / "topics" / "README.md"
        if topic_index.is_file():
            topic_index.write_text(
                sc.apply_topic_index(topic_index.read_text(encoding="utf-8"), catalog),
                encoding="utf-8",
            )
        copied_en = site_src / "en"
        if copied_en.exists():
            shutil.rmtree(copied_en)
    return catalog["counts"]


def label_built_search(site_dir: Path, root: Path | None = None) -> int:
    import json

    root = root or sc.ROOT
    catalog = json.loads((root / "website" / "data" / "site-catalog.json").read_text(encoding="utf-8"))
    path = site_dir / "search" / "search_index.json"
    index = json.loads(path.read_text(encoding="utf-8"))
    label_search_index(index, catalog)
    path.write_text(json.dumps(index, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    labeled = sum(1 for doc in index["docs"] if str(doc.get("title", "")).startswith("Chinese original:"))
    print(f"labeled {labeled} search titles in {path}")
    return labeled


def main() -> int:
    if len(sys.argv) >= 3 and sys.argv[1] == "--label-search":
        label_built_search(Path(sys.argv[2]))
        return 0
    root = sc.ROOT
    site = root / "_site_src"
    if not site.is_dir():
        raise SystemExit("_site_src is missing; run scripts/prepare_site_src.sh first")
    print(build(root / "_site_en", root, site_src=site, write_config=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
