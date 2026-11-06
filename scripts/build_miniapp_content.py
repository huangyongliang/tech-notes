#!/usr/bin/env python3
"""Build the fixed 35-doc miniapp catalog from Markdown.

Reads only the manifest below (roadmap + 零基础 / 计算机基础 / 编程入门 / Java).
Writes miniprogram/data/catalog.ts: title metadata plus a block tree
(callout / code / fold / paragraphs). The miniapp renders that tree with
native components. No network, no web-view, no runtime Markdown parser.

Usage:
  python3 scripts/build_miniapp_content.py

Test: python3 scripts/test_miniapp_content.py
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "miniprogram" / "data" / "catalog.ts"

# Locked content set. Adding or removing a path must stay at 35 docs.
EXPECTED_DOC_COUNT = 35

TOPICS = [
    {
        "id": "getting-started",
        "group": "基础",
        "num": "01",
        "title_zh": "零基础入门",
        "title_en": "Getting Started",
        "blurb": "电脑、网络、自学方法",
        "status": "wip",
        "chapters": [
            "01-what-is-a-computer",
            "02-using-a-computer",
            "03-internet-basics",
            "04-learning-to-learn",
            "05-tech-english",
        ],
    },
    {
        "id": "cs-basics",
        "group": "基础",
        "num": "02",
        "title_zh": "计算机基础",
        "title_en": "CS Basics",
        "blurb": "组成 · OS · Linux · Git · 网络 · DSA",
        "status": "wip",
        "chapters": [
            "01-computer-organization",
            "02-operating-systems",
            "03-linux-shell",
            "04-git",
            "05-networking",
            "06-data-structures-algorithms",
            "07-databases",
        ],
    },
    {
        "id": "programming-basics",
        "group": "基础",
        "num": "03",
        "title_zh": "编程入门",
        "title_en": "Programming Basics",
        "blurb": "第一门语言 C · 核心概念 · 小项目",
        "status": "wip",
        "chapters": [
            "01-first-language-c",
            "02-core-concepts",
            "03-memory-and-data",
            "04-tools-debugging",
            "05-problem-solving",
            "06-small-projects",
        ],
    },
    {
        "id": "java",
        "group": "技术栈",
        "num": "04",
        "title_zh": "Java 技术栈",
        "title_en": "Java Stack",
        "blurb": "语言 · JVM · 并发 · Spring",
        "status": "wip",
        "chapters": [
            "01-language-basics",
            "02-collections",
            "03-core-advanced",
            "04-io-nio",
            "05-concurrency",
            "06-jvm",
            "07-build-tools",
            "08-testing",
            "09-spring",
            "10-persistence",
            "11-performance-diagnostics",
            "12-ecosystem-trends",
        ],
    },
]

ROADMAP_PATH = "topics/roadmap/README.md"
STATUS_LABEL = {"wip": "搭建中", "todo": "待开始"}
HAN_RE = re.compile(r"[\u4e00-\u9fff]")
FENCE_RE = re.compile(r"```[\s\S]*?```")
DETAILS_RE = re.compile(r"<details[\s\S]*?</details>", re.I)
LINK_RE = re.compile(r"\[([^\]]*)\]\([^)]*\)")
URL_RE = re.compile(r"https?://\S+")
H1_RE = re.compile(r"^#\s+(.*)$")
HEADING_RE = re.compile(r"^(#{2,6})\s+(.*?)\s*#*\s*$")
LIST_RE = re.compile(r"^(\s*)([-*]|\d+\.)\s+(.*)$")
TABLE_SEP_RE = re.compile(r"^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$")
ALERT_RE = re.compile(r"^\[!(NOTE|TIP|WARNING)\]\s*$", re.I)
SUMMARY_RE = re.compile(r"<summary>(.*?)</summary>", re.I | re.S)
LATIN_TOKEN_RE = re.compile(r"[A-Za-z0-9][A-Za-z0-9/&+.'’:-]*|&|/")


def count_han(markdown: str) -> int:
    """Chinese characters in body copy.

    Drops fenced code, full <details> answer blocks, and link URLs.
    Link text stays. 400 字/分钟, ceil, minimum 1 minute — see minutes_for().
    """
    text = FENCE_RE.sub("", markdown)
    text = DETAILS_RE.sub("", text)
    text = LINK_RE.sub(r"\1", text)
    text = URL_RE.sub("", text)
    return len(HAN_RE.findall(text))


def minutes_for(han: int) -> int:
    if han <= 0:
        return 1
    return max(1, (han + 399) // 400)


def split_title(title: str) -> tuple[str, str]:
    """Split 「中文名 English」. Trailing Latin tokens are the English name.

    If the Chinese name itself ends in a Latin word (「Linux 与 Shell Linux & Shell」),
    move that word back when the English phrase repeats the opening token.
    """
    parts = title.strip().split()
    en: list[str] = []
    while parts and LATIN_TOKEN_RE.fullmatch(parts[-1]):
        en.append(parts.pop())
    en.reverse()
    if (
        parts
        and len(en) >= 3
        and HAN_RE.search(parts[-1])
        and en[0] != parts[0]
        and parts[0] in en[1:]
    ):
        parts.append(en.pop(0))
    zh = " ".join(parts).strip()
    en_s = " ".join(en).strip()
    if not zh:
        return en_s, ""
    return zh, en_s


def plain(nodes) -> str:
    parts: list[str] = []
    for node in nodes:
        kind = node.get("t")
        if kind in {"text", "code", "link"}:
            parts.append(node.get("v") or "")
        elif kind in {"strong", "em"}:
            parts.append(plain(node.get("c") or []))
    return "".join(parts)


def parse_inlines(src: str) -> list[dict]:
    out: list[dict] = []
    i = 0
    n = len(src)

    def push_text(chunk: str) -> None:
        if not chunk:
            return
        if out and out[-1]["t"] == "text":
            out[-1]["v"] += chunk
        else:
            out.append({"t": "text", "v": chunk})

    while i < n:
        if src.startswith("**", i):
            j = src.find("**", i + 2)
            if j != -1:
                out.append({"t": "strong", "c": parse_inlines(src[i + 2 : j])})
                i = j + 2
                continue
        if src[i] == "`":
            j = src.find("`", i + 1)
            if j != -1:
                out.append({"t": "code", "v": src[i + 1 : j]})
                i = j + 1
                continue
        if src[i] == "[":
            m = re.match(r"\[([^\]]*)\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)", src[i:])
            if m:
                out.append({"t": "link", "v": m.group(1), "href": m.group(2)})
                i += m.end()
                continue
        if src.startswith("![", i):
            m = re.match(r"!\[([^\]]*)\]\([^)]*\)", src[i:])
            if m:
                push_text(m.group(1))
                i += m.end()
                continue
        j = i + 1
        while j < n and src[j] not in "`[*":
            j += 1
        push_text(src[i:j])
        i = j
    return out


def join_lines(lines: list[str]) -> str:
    text = ""
    for raw in lines:
        nxt = raw.strip()
        if not nxt:
            continue
        if not text:
            text = nxt
            continue
        if HAN_RE.match(text[-1]) and HAN_RE.match(nxt[0]):
            text += nxt
        else:
            text += " " + nxt
    return text


def is_block_start(line: str) -> bool:
    s = line.lstrip()
    if not line.strip():
        return False
    if line.startswith(("```", ">", "<details", "<!--", "|", "#")):
        return True
    if line.strip() in {"---", "***"}:
        return True
    if LIST_RE.match(line):
        return True
    return s.startswith("<details")


def parse_details(text: str) -> list[dict]:
    m = SUMMARY_RE.search(text)
    summary = ""
    if m:
        summary = re.sub(r"<[^>]+>", "", m.group(1)).strip()
    body = SUMMARY_RE.sub("", text, count=1)
    body = re.sub(r"</?details[^>]*>", "", body, flags=re.I)
    blocks = parse_blocks(body.strip("\n"))
    if summary == "参考答案":
        return [{"t": "fold", "blocks": blocks}]
    return blocks


def parse_quote(raw_lines: list[str]) -> list[dict]:
    unwrapped: list[str] = []
    for line in raw_lines:
        if line.startswith("> "):
            unwrapped.append(line[2:])
        elif line.startswith(">"):
            unwrapped.append(line[1:])
        else:
            unwrapped.append(line)
    while unwrapped and not unwrapped[0].strip():
        unwrapped.pop(0)
    if unwrapped and ALERT_RE.match(unwrapped[0].strip()):
        kind = unwrapped[0].strip()[2:-1].lower()
        inner = "\n".join(unwrapped[1:]).strip("\n")
        return [{"t": "callout", "kind": kind, "blocks": parse_blocks(inner)}]
    return [{"t": "quote", "blocks": parse_blocks("\n".join(unwrapped).strip("\n"))}]


def split_table_row(row: str) -> list[list[dict]]:
    cells = [c.strip() for c in row.strip().strip("|").split("|")]
    return [parse_inlines(c) for c in cells]


def checkbox_text(rest: str) -> str:
    if rest.startswith("[ ] "):
        return "☐ " + rest[4:]
    if rest.startswith("[x] ") or rest.startswith("[X] "):
        return "☑ " + rest[4:]
    return rest


def parse_blocks(text: str) -> list[dict]:
    lines = text.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    i = 0
    n = len(lines)
    blocks: list[dict] = []
    while i < n:
        line = lines[i]
        if not line.strip():
            i += 1
            continue
        if line.startswith("<!--"):
            if "-->" not in line:
                i += 1
                while i < n and "-->" not in lines[i]:
                    i += 1
            i += 1
            continue
        if line.startswith("```"):
            info = line[3:].strip()
            lang = info.split()[0] if info else "text"
            i += 1
            buf: list[str] = []
            while i < n and not lines[i].startswith("```"):
                buf.append(lines[i])
                i += 1
            if i < n:
                i += 1
            blocks.append({"t": "code", "lang": lang, "code": "\n".join(buf)})
            continue
        if line.lower().startswith("<details"):
            buf = [line]
            if "</details>" not in line.lower():
                i += 1
                while i < n and "</details>" not in lines[i].lower():
                    buf.append(lines[i])
                    i += 1
                if i < n:
                    buf.append(lines[i])
            i += 1
            blocks.extend(parse_details("\n".join(buf)))
            continue
        if line.startswith(">"):
            buf = []
            while i < n and lines[i].startswith(">"):
                buf.append(lines[i])
                i += 1
            blocks.extend(parse_quote(buf))
            continue
        hm = HEADING_RE.match(line)
        if hm:
            level = 2 if len(hm.group(1)) == 2 else 3
            inlines = parse_inlines(hm.group(2).strip())
            blocks.append({"t": "h", "level": level, "text": plain(inlines)})
            i += 1
            continue
        if line.strip() in {"---", "***"}:
            i += 1
            continue
        if line.startswith("|"):
            rows: list[str] = []
            while i < n and lines[i].startswith("|"):
                rows.append(lines[i])
                i += 1
            parsed = [split_table_row(r) for r in rows if not TABLE_SEP_RE.match(r)]
            if parsed:
                blocks.append({"t": "table", "header": parsed[0], "rows": parsed[1:]})
            continue
        if LIST_RE.match(line):
            items: list[dict] = []
            kind = None
            while i < n:
                cur = lines[i]
                if not cur.strip():
                    nxt = lines[i + 1] if i + 1 < n else ""
                    if LIST_RE.match(nxt):
                        i += 1
                        continue
                    break
                lm = LIST_RE.match(cur)
                if lm:
                    marker, rest = lm.group(2), checkbox_text(lm.group(3).strip())
                    if kind is None:
                        kind = "ol" if marker[:1].isdigit() else "ul"
                    num = int(marker[:-1]) if marker[:1].isdigit() else 0
                    items.append({"n": num, "src": rest})
                    i += 1
                    continue
                if (cur.startswith("  ") or cur.startswith("\t")) and items and not is_block_start(cur.strip()):
                    items[-1]["src"] = join_lines([items[-1]["src"], cur.strip()])
                    i += 1
                    continue
                break
            norm_items = []
            for idx, item in enumerate(items, start=1):
                entry = {"inlines": parse_inlines(item["src"])}
                if kind == "ol":
                    entry["n"] = item["n"] or idx
                norm_items.append(entry)
            blocks.append({"t": kind or "ul", "items": norm_items})
            continue
        buf = [line]
        i += 1
        while i < n and lines[i].strip() and not is_block_start(lines[i]):
            buf.append(lines[i])
            i += 1
        blocks.append({"t": "p", "inlines": parse_inlines(join_lines(buf))})
    return blocks


def assign_ids(blocks: list[dict], toc: list[dict], counter: list[int]) -> None:
    for block in blocks:
        if block.get("t") == "h":
            counter[0] += 1
            hid = f"h-{counter[0]}"
            block["id"] = hid
            toc.append({"id": hid, "level": block["level"], "text": block["text"]})
        child = block.get("blocks")
        if isinstance(child, list):
            assign_ids(child, toc, counter)


def block_text(blocks: list[dict]) -> str:
    """Visible text for the build-time search index. Skips link URLs."""
    parts: list[str] = []
    for block in blocks:
        kind = block.get("t")
        if kind == "h":
            parts.append(block.get("text") or "")
        elif kind == "p":
            parts.append(plain(block.get("inlines") or []))
        elif kind in {"ul", "ol"}:
            for item in block.get("items") or []:
                parts.append(plain(item.get("inlines") or []))
        elif kind == "code":
            parts.append(block.get("code") or "")
        elif kind == "table":
            for row in [block.get("header") or [], *(block.get("rows") or [])]:
                for cell in row:
                    parts.append(plain(cell))
        elif kind in {"quote", "callout", "fold"}:
            parts.append(block_text(block.get("blocks") or []))
    return "\n".join(part for part in parts if part)


def search_entry(doc: dict) -> dict:
    title = f"{doc['titleZh']} {doc['titleEn']}".strip()
    return {
        "id": doc["id"],
        "kind": doc["kind"],
        "topicId": doc["topicId"],
        "title": title,
        "path": doc["path"],
        "titleText": f"{doc['titleZh']}\n{doc['titleEn']}".lower(),
        "bodyText": block_text(doc["blocks"]).lower(),
    }


def first_summary(blocks: list[dict]) -> str:
    for block in blocks:
        if block.get("t") == "p":
            return plain(block.get("inlines") or []).strip()
    return ""


def parse_markdown(markdown: str) -> tuple[str, list[dict], list[dict]]:
    lines = markdown.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    title = ""
    body: list[str] = []
    seen_h1 = False
    for line in lines:
        if not seen_h1 and H1_RE.match(line) and not line.startswith("##"):
            title = H1_RE.match(line).group(1).strip()  # type: ignore[union-attr]
            seen_h1 = True
            continue
        body.append(line)
    blocks = parse_blocks("\n".join(body))
    toc: list[dict] = []
    assign_ids(blocks, toc, [0])
    return title, blocks, toc


def rel_posix(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def load_doc(path: Path, *, doc_id: str, kind: str, topic_id: str, num: str) -> dict:
    markdown = path.read_text(encoding="utf-8")
    title, blocks, toc = parse_markdown(markdown)
    title_zh, title_en = split_title(title)
    if not title_zh:
        raise SystemExit(f"missing H1: {path}")
    han = count_han(markdown)
    return {
        "id": doc_id,
        "kind": kind,
        "topicId": topic_id,
        "num": num,
        "titleZh": title_zh,
        "titleEn": title_en,
        "summary": first_summary(blocks),
        "minutes": minutes_for(han),
        "han": han,
        "path": rel_posix(path),
        "blocks": blocks,
        "toc": toc,
    }


def chapter_dirs_on_disk(topic_id: str) -> list[str]:
    root = ROOT / "topics" / topic_id
    names = []
    for child in sorted(root.iterdir()):
        if child.is_dir() and (child / "README.md").is_file():
            names.append(child.name)
    return names


def build_catalog() -> dict:
    for topic in TOPICS:
        disk = chapter_dirs_on_disk(topic["id"])
        if disk != topic["chapters"]:
            raise SystemExit(
                f"{topic['id']} chapters drifted from the fixed manifest.\n"
                f"  manifest: {topic['chapters']}\n"
                f"  disk:     {disk}"
            )

    docs: dict[str, dict] = {}
    roadmap = load_doc(
        ROOT / ROADMAP_PATH,
        doc_id="roadmap",
        kind="roadmap",
        topic_id="roadmap",
        num="",
    )
    docs[roadmap["id"]] = roadmap

    groups: dict[str, dict] = {}
    for topic in TOPICS:
        readme = ROOT / "topics" / topic["id"] / "README.md"
        topic_doc = load_doc(
            readme,
            doc_id=topic["id"],
            kind="topic",
            topic_id=topic["id"],
            num=topic["num"],
        )
        docs[topic_doc["id"]] = topic_doc
        chapters = []
        for slug in topic["chapters"]:
            path = ROOT / "topics" / topic["id"] / slug / "README.md"
            num = slug.split("-", 1)[0]
            chapter = load_doc(
                path,
                doc_id=f"{topic['id']}/{slug}",
                kind="chapter",
                topic_id=topic["id"],
                num=num,
            )
            docs[chapter["id"]] = chapter
            chapters.append(
                {
                    "id": chapter["id"],
                    "num": chapter["num"],
                    "titleZh": chapter["titleZh"],
                    "titleEn": chapter["titleEn"],
                    "summary": chapter["summary"],
                    "minutes": chapter["minutes"],
                    "path": chapter["path"],
                }
            )
        card = {
            "id": topic["id"],
            "num": topic["num"],
            "titleZh": topic["title_zh"],
            "titleEn": topic["title_en"],
            "blurb": topic["blurb"],
            "status": topic["status"],
            "statusLabel": STATUS_LABEL[topic["status"]],
            "summary": topic_doc["summary"],
            "count": len(chapters),
            "chapters": chapters,
        }
        group = groups.setdefault(
            topic["group"],
            {"id": topic["group"], "label": f"// {topic['group']}", "topics": []},
        )
        group["topics"].append(card)

    if len(docs) != EXPECTED_DOC_COUNT:
        raise SystemExit(f"manifest count {len(docs)} != {EXPECTED_DOC_COUNT}")

    return {
        "version": "2026.11",
        "docCount": len(docs),
        "groups": list(groups.values()),
        "roadmap": {
            "id": roadmap["id"],
            "num": "",
            "titleZh": roadmap["titleZh"],
            "titleEn": roadmap["titleEn"],
            "summary": roadmap["summary"],
            "minutes": roadmap["minutes"],
            "path": roadmap["path"],
        },
        "docs": docs,
        "search": [search_entry(doc) for doc in docs.values()],
    }


def render_ts(catalog: dict) -> str:
    # JSON.parse keeps the generated module typed as `any` so `tsc` does not
    # infer a giant literal. Content is still static data, not a remote fetch.
    payload = json.dumps(catalog, ensure_ascii=False, separators=(",", ":"))
    payload = (
        payload.replace("\u2028", "\\u2028")
        .replace("\u2029", "\\u2029")
        .replace("<", "\\u003c")
    )
    literal = json.dumps(payload, ensure_ascii=False)
    return (
        "/* Generated by scripts/build_miniapp_content.py. Do not edit. */\n"
        "export const CATALOG = JSON.parse("
        + literal
        + ");\n"
    )


def main() -> None:
    catalog = build_catalog()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(render_ts(catalog), encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)} ({catalog['docCount']} docs)")


if __name__ == "__main__":
    sys.exit(main())
