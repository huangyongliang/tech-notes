#!/usr/bin/env python3
"""Build the miniapp catalog from the merged-topic manifest.

Reads only the manifest below, which must match miniprogram/content-selection.json
(111 paths: roadmap, the original four topics, and the other merged topics).
Writes miniprogram/data/catalog.ts with topic cards and the full search index.
Chapter block trees go to per-topic subpackages under miniprogram/packages/.
```mermaid fences are rendered to PNGs in the reader subpackage by
scripts/render_mermaid.py (mmdc). The miniapp shows those images with native
components. No network, no web-view, no runtime Markdown parser.

Usage:
  python3 scripts/build_miniapp_content.py

Test: python3 scripts/test_miniapp_content.py
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import render_mermaid
import site_catalog

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "miniprogram" / "data" / "catalog.ts"
SELECTION = ROOT / "miniprogram" / "content-selection.json"

# Merged knowledge topics on this main. Inbox and site chrome stay out.
EXPECTED_DOC_COUNT = 111

# Site table numbers for directories that are not NN-prefixed.
DISPLAY_NUM = {
    ("web", "origin"): "01",
    ("systems", "distributed"): "01",
}

# Subpackage ids. Chapter ASTs for the listed topics share that package.
PACKAGE_ORDER = ("basics", "theory", "java", "microservices", "ai", "rest")

TOPICS = [
    {
        "id": "getting-started",
        "group": "基础",
        "num": "01",
        "title_zh": "零基础入门",
        "title_en": "Getting Started",
        "blurb": "电脑、网络、自学方法",
        "status": "wip",
        "package": "basics",
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
        "package": "basics",
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
        "id": "cs-theory",
        "group": "基础",
        "num": "03",
        "title_zh": "理论基础",
        "title_en": "Theory",
        "blurb": "数理逻辑 · 图论 · 计算理论",
        "status": "wip",
        "package": "theory",
        "chapters": [
            "01-logic",
            "02-sets-relations-functions",
            "03-proofs-induction",
            "04-counting-recurrences",
            "05-graphs-degrees",
            "06-walks-connectivity-euler",
            "07-trees-spanning",
            "08-bipartite-matching",
            "09-coloring-planarity",
            "10-digraphs-dag",
            "11-shortest-path-proofs",
            "12-automata-languages",
            "13-computability",
            "14-complexity-reductions",
        ],
    },
    {
        "id": "programming-basics",
        "group": "基础",
        "num": "04",
        "title_zh": "编程入门",
        "title_en": "Programming Basics",
        "blurb": "第一门语言 C · 核心概念 · 小项目",
        "status": "wip",
        "package": "basics",
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
        "num": "05",
        "title_zh": "Java 技术栈",
        "title_en": "Java Stack",
        "blurb": "语言 · JVM · 并发 · Spring",
        "status": "wip",
        "package": "java",
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
    {
        "id": "microservices",
        "group": "技术栈",
        "num": "06",
        "title_zh": "微服务",
        "title_en": "Microservices",
        "blurb": "架构拆分 · 服务治理 · 可观测性",
        "status": "wip",
        "package": "microservices",
        "chapters": [
            "01-architecture",
            "02-api-gateway",
            "03-discovery-config",
            "04-communication",
            "05-resilience",
            "06-messaging",
            "07-distributed-transactions",
            "08-caching",
            "09-database-sharding",
            "10-observability",
            "11-security",
            "12-containers-k8s",
            "13-service-mesh",
            "14-cicd-gitops",
            "15-testing",
            "16-cloud-native-java",
        ],
    },
    {
        "id": "ai",
        "group": "技术栈",
        "num": "07",
        "title_zh": "AI 技术栈",
        "title_en": "AI Stack",
        "blurb": "大模型 · RAG · Agent · MCP",
        "status": "wip",
        "package": "ai",
        "chapters": [
            "00-python-bridge",
            "01-foundations",
            "02-dl-frameworks",
            "03-transformer-llm",
            "04-model-landscape",
            "05-prompt-context",
            "06-llm-api-programming",
            "07-app-frameworks",
            "08-rag",
            "09-agents",
            "10-mcp",
            "11-ai-coding-tools",
            "12-coding-agents",
            "13-code-models-evals",
            "14-fine-tuning",
            "15-inference-serving",
            "16-multimodal",
            "17-evals-observability",
            "18-llmops-infra",
            "19-security-governance",
            "20-trends",
        ],
    },
    {
        "id": "programming",
        "group": "专题",
        "num": "08",
        "title_zh": "编程",
        "title_en": "Programming",
        "blurb": "语法 · 语义 · 类型 · 求值与内存",
        "status": "wip",
        "package": "rest",
        "chapters": [
            "01-syntax",
            "02-semantics",
            "03-types",
            "04-evaluation-memory",
        ],
    },
    {
        "id": "web",
        "group": "专题",
        "num": "09",
        "title_zh": "Web 开发",
        "title_en": "Web",
        "blurb": "源 · 渲染 · 请求处理 · 跨越边界",
        "status": "wip",
        "package": "rest",
        "chapters": [
            "origin",
            "02-rendering",
            "03-request-handling",
            "04-crossing-boundary",
        ],
    },
    {
        "id": "systems",
        "group": "专题",
        "num": "10",
        "title_zh": "系统",
        "title_en": "Systems",
        "blurb": "分布式模型",
        "status": "wip",
        "package": "rest",
        "chapters": [
            "distributed",
        ],
    },
    {
        "id": "devops",
        "group": "专题",
        "num": "11",
        "title_zh": "DevOps",
        "title_en": "DevOps",
        "blurb": "可重复 · 来源 · 晋级 · 回滚",
        "status": "wip",
        "package": "rest",
        "chapters": [
            "01-repeatability",
            "02-provenance",
            "03-promotion-gating",
            "04-rollback-audit",
        ],
    },
    {
        "id": "product-research",
        "group": "专题",
        "num": "12",
        "title_zh": "产品调研",
        "title_en": "Product Research",
        "blurb": "问题约束 · 对照 · 选型 · 失效",
        "status": "wip",
        "package": "rest",
        "chapters": [
            "01-problem-constraints",
            "02-comparison",
            "03-selection-records",
            "04-invalidation",
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


def list_kind(marker: str) -> str:
    return "ol" if marker[:1].isdigit() else "ul"


def parse_list(lines: list[str], i: int) -> tuple[dict, int]:
    """Parse one list, including items nested by indent.

    A deeper marker starts a child list on the previous item (通关自测:
    numbered stem, then indented ``- A.`` options). Same-indent markers of
    the other kind end this list. A single blank line does not.
    """
    n = len(lines)
    first = LIST_RE.match(lines[i])
    if not first:
        raise RuntimeError("parse_list called on a non-list line")
    base = len(first.group(1).expandtabs(4))
    kind = list_kind(first.group(2))
    items: list[dict] = []
    while i < n:
        cur = lines[i]
        if not cur.strip():
            nxt = lines[i + 1] if i + 1 < n else ""
            nxt_m = LIST_RE.match(nxt)
            if nxt_m:
                indent = len(nxt_m.group(1).expandtabs(4))
                nxt_kind = list_kind(nxt_m.group(2))
                if indent > base or (indent == base and nxt_kind == kind):
                    i += 1
                    continue
            break
        lm = LIST_RE.match(cur)
        if lm:
            indent = len(lm.group(1).expandtabs(4))
            if indent > base:
                if not items:
                    break
                child, i = parse_list(lines, i)
                items[-1].setdefault("blocks", []).append(child)
                continue
            if indent < base:
                break
            marker = lm.group(2)
            if list_kind(marker) != kind:
                break
            rest = checkbox_text(lm.group(3).strip())
            num = int(marker[:-1]) if kind == "ol" else 0
            items.append({"n": num, "src": rest})
            i += 1
            continue
        if (
            items
            and (cur.startswith("  ") or cur.startswith("\t"))
            and not is_block_start(cur.strip())
        ):
            items[-1]["src"] = join_lines([items[-1]["src"], cur.strip()])
            i += 1
            continue
        break
    norm_items = []
    for idx, item in enumerate(items, start=1):
        entry: dict = {"inlines": parse_inlines(item["src"])}
        if kind == "ol":
            entry["n"] = item["n"] or idx
        if item.get("blocks"):
            entry["blocks"] = item["blocks"]
        norm_items.append(entry)
    return {"t": kind, "items": norm_items}, i


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
            block, i = parse_list(lines, i)
            blocks.append(block)
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
                nested = item.get("blocks")
                if isinstance(nested, list):
                    parts.append(block_text(nested))
        elif kind == "diagram":
            continue
        elif kind == "code":
            if block.get("lang") == "mermaid":
                continue
            parts.append(block.get("code") or "")
        elif kind == "table":
            for row in [block.get("header") or [], *(block.get("rows") or [])]:
                for cell in row:
                    parts.append(plain(cell))
        elif kind in {"quote", "callout", "fold"}:
            parts.append(block_text(block.get("blocks") or []))
    return "\n".join(part for part in parts if part)


def title_parts(*values) -> list[str]:
    parts = []
    for value in values:
        if value is None:
            continue
        text = str(value).strip()
        if not text or text.lower() == "none":
            continue
        parts.append(text)
    return parts


def prose_from_blocks(blocks: list[dict]) -> str:
    """Snippet prose. Drops fenced code, diagrams, and 参考答案 folds."""
    parts: list[str] = []

    def walk(items: list[dict]) -> None:
        for block in items:
            kind = block.get("t")
            if kind in {"code", "fold", "diagram"}:
                continue
            if kind == "h":
                parts.append(block.get("text") or "")
            elif kind == "p":
                parts.append(plain(block.get("inlines") or []))
            elif kind in {"ul", "ol"}:
                for item in block.get("items") or []:
                    parts.append(plain(item.get("inlines") or []))
                    nested = item.get("blocks")
                    if isinstance(nested, list):
                        walk(nested)
            elif kind == "table":
                for cell in block.get("header") or []:
                    parts.append(plain(cell))
                for row in block.get("rows") or []:
                    for cell in row:
                        parts.append(plain(cell))
            elif kind in {"quote", "callout"}:
                walk(block.get("blocks") or [])

    walk(blocks)
    return "\n".join(part for part in parts if part.strip())


def search_entry(doc: dict) -> dict:
    title = " ".join(title_parts(doc.get("titleZh"), doc.get("titleEn")))
    return {
        "id": doc["id"],
        "kind": doc["kind"],
        "topicId": doc["topicId"],
        "title": title,
        "path": doc["path"],
        "titleText": "\n".join(title_parts(doc.get("titleZh"), doc.get("titleEn"))).lower(),
        "bodyText": block_text(doc["blocks"]).lower(),
        "prose": prose_from_blocks(doc["blocks"]),
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
            title = re.sub(r"\s*\{#[^}]+\}\s*$", "", title).strip()
            seen_h1 = True
            continue
        body.append(line)
    blocks = parse_blocks("\n".join(body))
    toc: list[dict] = []
    assign_ids(blocks, toc, [0])
    return title, blocks, toc


def rel_posix(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def whitelist_paths() -> set[str]:
    data = json.loads(SELECTION.read_text(encoding="utf-8"))
    included = data.get("included")
    if data.get("documentCount") != EXPECTED_DOC_COUNT or not isinstance(included, list):
        raise SystemExit(f"{SELECTION.name} must list {EXPECTED_DOC_COUNT} docs")
    if len(included) != EXPECTED_DOC_COUNT or len(set(included)) != EXPECTED_DOC_COUNT:
        raise SystemExit(f"{SELECTION.name} is not an exact {EXPECTED_DOC_COUNT}-path set")
    return set(included)


def assert_whitelist(docs: dict[str, dict]) -> None:
    got = {doc["path"] for doc in docs.values()}
    want = whitelist_paths()
    if got != want:
        missing = sorted(want - got)
        extra = sorted(got - want)
        raise SystemExit(
            "catalog drifted from content-selection.json\n"
            f"missing {missing}\nextra {extra}"
        )


def load_doc(path: Path, *, doc_id: str, kind: str, topic_id: str, num: str) -> dict:
    markdown = path.read_text(encoding="utf-8")
    title, blocks, toc = parse_markdown(markdown)
    title_zh = site_catalog.strip_gloss(title)
    title_en = None
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


def chapter_num(topic_id: str, slug: str) -> str:
    """Site-table number. Unprefixed dirs keep the number the site already shows."""
    forced = DISPLAY_NUM.get((topic_id, slug))
    if forced:
        return forced
    head = slug.split("-", 1)[0]
    if not head.isdigit():
        raise SystemExit(f"{topic_id}/{slug} has no display number")
    return head


def package_topics() -> dict[str, list[str]]:
    grouped = {package_id: [] for package_id in PACKAGE_ORDER}
    for topic in TOPICS:
        package_id = topic["package"]
        if package_id not in grouped:
            raise SystemExit(f"unknown package {package_id}")
        grouped[package_id].append(topic["id"])
    return grouped


def build_catalog() -> dict:
    packages = package_topics()
    if list(packages) != list(PACKAGE_ORDER):
        raise SystemExit("package order drifted")
    for topic in TOPICS:
        disk = chapter_dirs_on_disk(topic["id"])
        wanted = list(topic["chapters"])
        if len(wanted) != len(set(wanted)) or sorted(wanted) != disk:
            raise SystemExit(
                f"{topic['id']} chapters drifted from the fixed manifest.\n"
                f"  manifest: {wanted}\n"
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
            num = chapter_num(topic["id"], slug)
            chapter = load_doc(
                path,
                doc_id=f"{topic['id']}/{slug}",
                kind="chapter",
                topic_id=topic["id"],
                num=num,
            )
            chapter["packageId"] = topic["package"]
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
            "packageId": topic["package"],
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

    assert_whitelist(docs)
    diagram_stats = render_mermaid.attach_diagrams(docs)

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
        "_diagrams": diagram_stats,
    }


def json_module(export_name: str, payload: dict) -> str:
    # JSON.parse keeps the generated module typed as `any` so `tsc` does not
    # infer a giant literal. Content is still static data, not a remote fetch.
    encoded = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    encoded = (
        encoded.replace("\u2028", "\\u2028")
        .replace("\u2029", "\\u2029")
        .replace("<", "\\u003c")
    )
    literal = json.dumps(encoded, ensure_ascii=False)
    return (
        "/* Generated by scripts/build_miniapp_content.py. Do not edit. */\n"
        f"export const {export_name} = JSON.parse("
        + literal
        + ");\n"
    )


def slim_doc(doc: dict) -> dict:
    """Main-package copy. Chapter and topic bodies live elsewhere or in search."""
    if doc["kind"] == "roadmap":
        return doc
    kept = {key: value for key, value in doc.items() if key not in {"blocks", "toc"}}
    kept["blocks"] = []
    kept["toc"] = []
    return kept


def main_payload(catalog: dict) -> dict:
    return {
        "version": catalog["version"],
        "docCount": catalog["docCount"],
        "groups": catalog["groups"],
        "roadmap": catalog["roadmap"],
        "docs": {doc_id: slim_doc(doc) for doc_id, doc in catalog["docs"].items()},
        "search": catalog["search"],
    }


def package_payload(catalog: dict, package_id: str) -> dict:
    topic_ids = set(package_topics()[package_id])
    docs = {}
    for doc in catalog["docs"].values():
        if doc["kind"] != "chapter" or doc["topicId"] not in topic_ids:
            continue
        docs[doc["id"]] = {
            "blocks": doc["blocks"],
            "toc": doc["toc"],
        }
    return {"id": package_id, "docs": docs}


def render_ts(catalog: dict) -> str:
    return json_module("CATALOG", main_payload(catalog))


def render_package(catalog: dict, package_id: str) -> str:
    return json_module("CONTENT", package_payload(catalog, package_id))


def package_path(package_id: str) -> Path:
    return ROOT / "miniprogram" / "packages" / package_id / "content.ts"


def main() -> None:
    catalog = build_catalog()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(render_ts(catalog), encoding="utf-8")
    for package_id in PACKAGE_ORDER:
        dest = package_path(package_id)
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(render_package(catalog, package_id), encoding="utf-8")
    stats = catalog.get("_diagrams") or {}
    print(
        f"wrote {OUT.relative_to(ROOT)} ({catalog['docCount']} docs, "
        f"{len(PACKAGE_ORDER)} chapter packages, "
        f"{stats.get('count', 0)} diagrams, {stats.get('bytes', 0)} png bytes, "
        f"{stats.get('failures', 0)} render failures)"
    )


if __name__ == "__main__":
    sys.exit(main())
