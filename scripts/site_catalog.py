#!/usr/bin/env python3
"""Editorial status and translation coverage for the public site.

`website/data/site-catalog.json` is what the homepage generator and the
English site read. `derive_catalog()` is the drift lock: it rebuilds the
same document from the generated homepage badges, the handwritten chapter
tables, and META below. The build does not treat those tables as the
source, and it does not rewrite them.

Three statuses stay separate:

- editorial: 待开始 / 搭建中 / 已完成
- translation: 已译 / 部分 / 未译 (部分 is a topic rollup, not a page)
- on-device quest progress, which never enters this file

Existing prose does not imply editorial "complete". A page is translated
only when this catalog says so and website/en has a matching Markdown
file. Showing the Chinese body on an English URL is not translated.

PR 33 is merged. Web and Systems are building. The two new chapters
are untranslated. Topic status tables and the homepage rows are written
from this catalog.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = ROOT / "website" / "data" / "site-catalog.json"
EN_ROOT = ROOT / "website" / "en"

LABELS = {
    "planned": {"zh": "待开始", "en": "Not started"},
    "building": {"zh": "搭建中", "en": "In progress"},
    "complete": {"zh": "已完成", "en": "Complete"},
}
TR_LABELS = {
    "translated": {"zh": "已译", "en": "Translated"},
    "partial": {"zh": "部分", "en": "Partial"},
    "untranslated": {"zh": "未译", "en": "Not translated"},
}
FALLBACK_BANNER = "English translation unavailable. Showing the Chinese original."
# Surfaces this generator rewrites. Topic README emoji tables are not in it.
GENERATED_SURFACES = (
    "website/index.md topic rows",
    "homepage terminal tree",
    "topic README status tables",
    "english nav and english home",
    "slice chapter status line",
    "fallback banner and search title",
)
EMOJI_FOR = {"planned": "⚪", "building": "🟡", "complete": "🟢"}
HOMEPAGE_STATUS = {"搭建中": "building", "待开始": "planned", "已完成": "complete"}
EMOJI_STATUS = {"🟡": "building", "⚪": "planned", "🟢": "complete"}

# Pages that are not a homepage topic row and not a chapter table row.
META_EDITORIAL = {
    "website/index.md": "building",
    "topics/README.md": "building",
    "topics/inbox/README.md": "building",
    "notes/README.md": "building",
    "resources/README.md": "building",
    "resources/links.md": "building",
    "CONTRIBUTING.md": "building",
    "STYLE.md": "building",
}

# English display names for chrome (nav, H1, title, search). Not translations:
# a page stays untranslated until TRANSLATED says otherwise.
PAGE_TITLE_EN = {
    "topics/README.md": "Topic index",
    "topics/inbox/README.md": "Inbox",
    "notes/README.md": "Notes",
    "resources/README.md": "Sources",
    "resources/links.md": "Links",
    "CONTRIBUTING.md": "Contributing",
    "STYLE.md": "Style guide",
    "topics/roadmap/README.md": "Roadmap",
    "topics/cs-basics/README.md": "Computer Basics",
    "topics/cs-basics/01-computer-organization/README.md": "Computer organization",
    "topics/cs-basics/02-operating-systems/README.md": "Operating systems",
    "topics/cs-basics/03-linux-shell/README.md": "Linux and Shell",
    "topics/cs-basics/04-git/README.md": "Git",
    "topics/cs-basics/05-networking/README.md": "Computer networking",
    "topics/cs-basics/06-data-structures-algorithms/README.md": "Data structures and algorithms",
    "topics/cs-basics/07-databases/README.md": "Databases",
    "topics/cs-theory/README.md": "Theory",
    "topics/cs-theory/01-logic/README.md": "Propositions and predicates",
    "topics/cs-theory/02-sets-relations-functions/README.md": "Sets, relations, and functions",
    "topics/cs-theory/03-proofs-induction/README.md": "Proofs and induction",
    "topics/cs-theory/04-counting-recurrences/README.md": "Counting and recurrences",
    "topics/cs-theory/05-graphs-degrees/README.md": "Graphs and degrees",
    "topics/cs-theory/06-walks-connectivity-euler/README.md": "Paths, connectivity, and traversals",
    "topics/cs-theory/07-trees-spanning/README.md": "Trees and spanning trees",
    "topics/cs-theory/08-bipartite-matching/README.md": "Bipartite graphs and matching",
    "topics/cs-theory/09-coloring-planarity/README.md": "Coloring and planarity",
    "topics/cs-theory/10-digraphs-dag/README.md": "Digraphs and dependency order",
    "topics/cs-theory/11-shortest-path-proofs/README.md": "Shortest paths and proofs",
    "topics/cs-theory/12-automata-languages/README.md": "Automata and formal languages",
    "topics/cs-theory/13-computability/README.md": "Computability and the halting problem",
    "topics/cs-theory/14-complexity-reductions/README.md": "Complexity and reductions",
    "topics/programming-basics/README.md": "Programming Basics",
    "topics/programming-basics/01-first-language-c/README.md": "C and the environment",
    "topics/programming-basics/02-core-concepts/README.md": "Core concepts",
    "topics/programming-basics/03-memory-and-data/README.md": "Memory and data",
    "topics/programming-basics/04-tools-debugging/README.md": "Tools, debugging, and testing",
    "topics/programming-basics/05-problem-solving/README.md": "Problem solving",
    "topics/programming-basics/06-small-projects/README.md": "Small C projects",
    "topics/java/README.md": "Java",
    "topics/java/01-language-basics/README.md": "Language basics and new features",
    "topics/java/02-collections/README.md": "Collections",
    "topics/java/03-core-advanced/README.md": "Exceptions, generics, reflection, and annotations",
    "topics/java/04-io-nio/README.md": "IO and NIO",
    "topics/java/05-concurrency/README.md": "Concurrency",
    "topics/java/06-jvm/README.md": "JVM",
    "topics/java/07-build-tools/README.md": "Build tools",
    "topics/java/08-testing/README.md": "Testing",
    "topics/java/09-spring/README.md": "Spring",
    "topics/java/10-persistence/README.md": "Persistence",
    "topics/java/11-performance-diagnostics/README.md": "Performance and diagnostics",
    "topics/java/12-ecosystem-trends/README.md": "Ecosystem and trends",
    "topics/microservices/README.md": "Microservices",
    "topics/microservices/01-architecture/README.md": "Architecture and decomposition",
    "topics/microservices/02-api-gateway/README.md": "API gateways",
    "topics/microservices/03-discovery-config/README.md": "Discovery and configuration",
    "topics/microservices/04-communication/README.md": "Service communication",
    "topics/microservices/05-resilience/README.md": "Resilience and traffic",
    "topics/microservices/06-messaging/README.md": "Messaging and events",
    "topics/microservices/07-distributed-transactions/README.md": "Distributed transactions",
    "topics/microservices/08-caching/README.md": "Caching",
    "topics/microservices/09-database-sharding/README.md": "Databases and sharding",
    "topics/microservices/10-observability/README.md": "Observability",
    "topics/microservices/11-security/README.md": "Security",
    "topics/microservices/12-containers-k8s/README.md": "Containers and Kubernetes",
    "topics/microservices/13-service-mesh/README.md": "Service mesh",
    "topics/microservices/14-cicd-gitops/README.md": "Continuous delivery and GitOps",
    "topics/microservices/15-testing/README.md": "Testing",
    "topics/microservices/16-cloud-native-java/README.md": "Cloud-native Java and performance",
    "topics/ai/README.md": "AI",
    "topics/ai/00-python-bridge/README.md": "Python bridge",
    "topics/ai/01-foundations/README.md": "Math and machine learning",
    "topics/ai/02-dl-frameworks/README.md": "Deep learning frameworks",
    "topics/ai/03-transformer-llm/README.md": "Transformers and LLMs",
    "topics/ai/04-model-landscape/README.md": "Model landscape",
    "topics/ai/05-prompt-context/README.md": "Prompts and context",
    "topics/ai/06-llm-api-programming/README.md": "LLM API programming",
    "topics/ai/07-app-frameworks/README.md": "App frameworks",
    "topics/ai/08-rag/README.md": "Retrieval-augmented generation",
    "topics/ai/09-agents/README.md": "Agents",
    "topics/ai/10-mcp/README.md": "MCP",
    "topics/ai/11-ai-coding-tools/README.md": "AI coding tools and IDEs",
    "topics/ai/12-coding-agents/README.md": "Coding-agent workflows",
    "topics/ai/13-code-models-evals/README.md": "Code models and evals",
    "topics/ai/14-fine-tuning/README.md": "Fine-tuning and alignment",
    "topics/ai/15-inference-serving/README.md": "Inference and serving",
    "topics/ai/16-multimodal/README.md": "Multimodal models",
    "topics/ai/17-evals-observability/README.md": "Evals and observability",
    "topics/ai/18-llmops-infra/README.md": "LLMOps and GPU infrastructure",
    "topics/ai/19-security-governance/README.md": "Security and governance",
    "topics/ai/20-trends/README.md": "Frontiers and trends",
    "topics/programming/README.md": "Programming",
    "topics/programming/01-syntax/README.md": "Syntax",
    "topics/programming/02-semantics/README.md": "Semantics",
    "topics/programming/03-types/README.md": "Type Systems",
    "topics/programming/04-evaluation-memory/README.md": "Evaluation and Memory Models",
    "topics/web/README.md": "Web",
    "topics/web/origin/README.md": "Origins in the browser",
    "topics/web/02-rendering/README.md": "UI and Rendering Models",
    "topics/web/03-request-handling/README.md": "Request Handling and Middleware",
    "topics/web/04-crossing-boundary/README.md": "Crossing the Origin Boundary",
    "topics/systems/README.md": "Systems",
    "topics/systems/distributed/README.md": "Distributed systems model",
    "topics/devops/README.md": "DevOps",
    "topics/devops/01-repeatability/README.md": "Repeatability",
    "topics/devops/02-provenance/README.md": "Provenance",
    "topics/devops/03-promotion-gating/README.md": "Promotion and Gating",
    "topics/devops/04-rollback-audit/README.md": "Rollback and Audit",
    "topics/product-research/README.md": "Product Research",
}

# Reviewed English sources. Anything else is untranslated, including
# pages that merely contain English words inside Chinese prose.
# The English home is generated from this catalog so its topic table
# cannot drift. The chapter file is hand-written.
TRANSLATED = {
    "website/index.md",
    "topics/getting-started/README.md",
    "topics/getting-started/01-what-is-a-computer/README.md",
    "topics/getting-started/02-using-a-computer/README.md",
    "topics/getting-started/03-internet-basics/README.md",
    "topics/getting-started/04-learning-to-learn/README.md",
    "topics/getting-started/05-tech-english/README.md",
}
GENERATED_EN = {"website/index.md"}

PENDING_INTEGRATIONS = [
    {
        "pr": 33,
        "url": "https://github.com/huangyongliang/tech-notes/pull/33",
        "head": "3b56fcd5dcf65274afbc4d95fd186517ddac8b4b",
        "base": "b95578b67fcc79e5bed0056b713a4cd846e7b109",
        "merged": True,
        "summary": (
            "Merged on main. Web and Systems are building. The two new "
            "Chinese chapters are in the catalog as untranslated, and they "
            "are not part of the frozen miniapp 35."
        ),
        "when_merged": [
            {
                "path": "topics/web/README.md",
                "editorial": "building",
                "translation": "untranslated",
            },
            {
                "path": "topics/systems/README.md",
                "editorial": "building",
                "translation": "untranslated",
            },
            {
                "path": "topics/web/origin/README.md",
                "editorial": "building",
                "translation": "untranslated",
                "new_file": True,
            },
            {
                "path": "topics/systems/distributed/README.md",
                "editorial": "building",
                "translation": "untranslated",
                "new_file": True,
            },
        ],
    }
]

H1_RE = re.compile(r"^#\s+(.+)$", re.M)
HAN_RE = re.compile(r"[\u4e00-\u9fff]")
INDEX_ROW_RE = re.compile(
    r'\[<span class="n">(?P<num>\d+)</span>'
    r'<span class="t">(?P<title>.*?)</span>'
    r'<span class="d">(?P<desc>[^<]*)</span>'
    r'(?P<status>.*?)\]\((?P<href>[^)]+)\)'
    r'(?:\{ \.tn2-todo \})?'
)
STATUS_RE = re.compile(r'<span class="s(?: s--wip)?">([^<]+)</span>')
TABLE_ROW_RE = re.compile(
    r"^\|\s*\d+\s*\|\s*\[([^\]]+)\]\(([^)]+)\)\s*\|.*\|\s*([🟢🟡⚪])\s*\|",
    re.M,
)


def content_paths(root: Path | None = None) -> list[str]:
    root = root or ROOT
    paths = []
    for path in sorted((root / "topics").rglob("*.md")):
        paths.append(path.relative_to(root).as_posix())
    for rel in (
        "website/index.md",
        "notes/README.md",
        "resources/README.md",
        "resources/links.md",
        "CONTRIBUTING.md",
        "STYLE.md",
    ):
        if (root / rel).is_file():
            paths.append(rel)
    return paths


def split_title(title: str) -> tuple[str, str | None]:
    """Split a trailing English gloss off a Chinese H1.

    The gloss is the last capitalized Latin phrase. A Latin token inside
    the Chinese title, such as AI or Java, stays with the Chinese title.
    """
    title = re.sub(r"\s+", " ", title).strip()
    if not HAN_RE.search(title):
        return title, title
    match = re.match(
        r"^(.*[\u4e00-\u9fff][^A-Za-z]*?)\s+([A-Z][A-Za-z0-9][A-Za-z0-9 ,/&+\-:.]*)$",
        title,
    )
    if match:
        return match.group(1).strip(), match.group(2).strip()
    return title, None


def read_h1(path: Path) -> str:
    fence = False
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith("```") or line.startswith("~~~"):
            fence = not fence
            continue
        if fence:
            continue
        found = re.match(r"^#\s+(.+)$", line)
        if found:
            title = re.sub(r"\s*\{#[^}]+\}\s*$", "", found.group(1)).strip()
            return title
    raise ValueError(f"missing H1: {path}")


_TOKEN_RE = re.compile(r"[A-Za-z0-9][A-Za-z0-9+#./-]*")
_PROPER_NAMES = {
    "AI", "API", "C", "CD", "CI", "CSS", "DSA", "DevOps", "Docker", "Git",
    "GitOps", "Go", "GPU", "HTML", "HTTP", "HTTPS", "IDE", "IO", "JSON",
    "JVM", "K8s", "Kubernetes", "Linux", "LLM", "MCP", "NIO", "Python",
    "RAG", "SQL", "Shell", "Spring", "TCP", "TLS", "XML", "YAML", "Java",
}


def _proper_token(token: str) -> bool:
    if token in _PROPER_NAMES:
        return True
    if re.fullmatch(r"[A-Z][A-Z0-9]{1,7}(?:/[A-Z0-9]+)?", token):
        return True
    return bool(re.match(r"[A-Z]", token) and re.search(r"[A-Z]", token[1:]))


def strip_gloss(title: str) -> str:
    """Drop a trailing English gloss. Proper names inside the Chinese title stay.

    A repeated proper name, or an ordinary English word, starts the gloss.
    A proper name that is only in the tail, such as JVM or IDE, stays.
    """
    raw = re.sub(r"\s*\{#[^}]+\}\s*$", "", title).strip()
    raw = re.sub(r"\s*\([A-Za-z][^)]*\)\s*$", "", raw).strip()
    if not HAN_RE.search(raw):
        return raw
    last = max(i for i, char in enumerate(raw) if HAN_RE.match(char))
    head, tail = raw[: last + 1], raw[last + 1 :]
    tokens = list(_TOKEN_RE.finditer(tail))
    if not tokens:
        return raw
    seen = set(_TOKEN_RE.findall(head))
    cut = None
    for index, match in enumerate(tokens):
        token = match.group(0)
        repeated = token in seen
        if not _proper_token(token) or (repeated and index == 0) or (repeated and index > 0):
            cut = match.start()
            break
        seen.add(token)
    if cut is None:
        return raw
    kept = (head + tail[:cut]).strip()
    kept = re.sub(r"[\s&/+:,.-]+$", "", kept).strip()
    return re.sub(r"\s+", " ", kept).strip()


def homepage_statuses(root: Path | None = None) -> dict[str, str]:
    root = root or ROOT
    text = (root / "website" / "index.md").read_text(encoding="utf-8")
    found = {}
    for match in INDEX_ROW_RE.finditer(text):
        label_match = STATUS_RE.search(match.group("status"))
        if not label_match:
            raise ValueError(f"homepage row has no editorial badge: {match.group('href')}")
        label = label_match.group(1)
        href = match.group("href")
        if label not in HOMEPAGE_STATUS:
            raise ValueError(f"unknown homepage status {label} for {href}")
        found[href] = HOMEPAGE_STATUS[label]
    if len(found) != 13:
        raise ValueError(f"expected 13 homepage topic rows, found {len(found)}")
    return found


def translation_rollup(page: dict, pages: list[dict]) -> str:
    """Topic rows roll up child chapters. Pages themselves are never partial."""
    if page["kind"] != "topic":
        return page["translation"]
    prefix = page["path"][: -len("README.md")]
    flags = {page["translation"]}
    for other in pages:
        if other["path"] != page["path"] and other["path"].startswith(prefix):
            flags.add(other["translation"])
    if flags == {"translated"}:
        return "translated"
    if "translated" in flags:
        return "partial"
    return "untranslated"


def mixed_h1_paths(root: Path | None = None) -> list[str]:
    """H1s that still append an English gloss. Proper names inside the Chinese title are not glosses."""
    root = root or ROOT
    found = []
    for rel in content_paths(root):
        if rel == "website/index.md":
            continue
        h1 = read_h1(root / rel)
        if strip_gloss(h1) != h1:
            found.append(rel)
    return found


def split_front_matter(text: str) -> tuple[str, str]:
    if text.startswith("---\n"):
        end = text.find("\n---\n", 4)
        if end != -1:
            return text[: end + 5], text[end + 5 :]
    return "", text


def status_paragraph(page: dict, lang: str) -> str:
    editorial = LABELS[page["editorial"]][lang]
    translation = TR_LABELS[page["translation"]][lang]
    if lang == "zh":
        return (
            f'<p class="tn-status">编辑状态：{editorial}。翻译：{translation}。'
            "这不是本机已学进度。</p>\n\n"
        )
    return (
        f'<p class="tn-status" lang="en">Editorial status: {editorial}. '
        f"Translation: {translation}. This is not on-device progress.</p>\n\n"
    )


def topic_slug(path: str) -> str:
    parts = path.split("/")
    if len(parts) < 3 or parts[0] != "topics":
        raise ValueError(f"not a topic path: {path}")
    return parts[1]


def subtopic_count(catalog: dict, topic_path: str) -> int:
    """Catalog pages under a topic, not counting the topic page itself."""
    prefix = topic_path[: -len("README.md")]
    return sum(
        1
        for page in catalog["pages"]
        if page["path"].startswith(prefix) and page["path"] != topic_path
    )


def subtopic_phrase(count: int, lang: str) -> str:
    if lang == "zh":
        return f"{count} 个子主题"
    if count == 1:
        return "1 subtopic"
    return f"{count} subtopics"


def status_comment(page: dict, count: int, lang: str) -> str:
    label = LABELS[page["editorial"]][lang]
    return f"# {subtopic_phrase(count, lang)} · {label}"


def topic_order_from(text: str) -> list[str]:
    order = [match.group("href") for match in INDEX_ROW_RE.finditer(text)]
    if len(order) != 13:
        raise ValueError(f"expected 13 homepage topic rows, found {len(order)}")
    return order


def render_terminal_body(catalog: dict, lang: str, order: list[str]) -> str:
    by_path = {page["path"]: page for page in catalog["pages"]}
    lines = ["<b>$</b> tree -L 1 topics/", "topics/"]
    for index, path in enumerate(order):
        page = by_path[path]
        slug = topic_slug(path)
        branch = "└──" if index == len(order) - 1 else "├──"
        comment = status_comment(page, subtopic_count(catalog, path), lang)
        lines.append(f"{branch} <em>{slug}/</em> <s>{comment}</s>")
    java = by_path["topics/java/README.md"]
    shown = java["title_zh"] if lang == "zh" else (java.get("title_en") or java["title_zh"])
    lines += [
        "",
        "<b>$</b> cat java/README.md | head -1",
        f"# {shown}",
        '<b>$</b> <span class="tn2-caret"></span>',
    ]
    return "\n".join(lines)


def terminal_html(catalog: dict, lang: str, order: list[str]) -> str:
    body = render_terminal_body(catalog, lang, order)
    return (
        '<div class="tn2-term">\n'
        '<div class="tn2-term__bar"><i></i><i></i><i></i><span>~/tech-notes</span></div>\n'
        f"<pre><code>{body}</code></pre>\n"
        "</div>"
    )


def apply_terminal(text: str, catalog: dict, lang: str = "zh") -> str:
    """Replace the homepage tree. Every topic line uses the catalog count and status."""
    body = render_terminal_body(catalog, lang, topic_order_from(text))
    pattern = re.compile(
        r'(<div class="tn2-term">.*?<pre><code>)(.*?)(</code></pre>)',
        re.S,
    )
    updated, count = pattern.subn(lambda match: match.group(1) + body + match.group(3), text, count=1)
    if count != 1:
        raise ValueError("homepage terminal missing")
    return updated


def with_subtopic_count(text: str, count: int) -> str:
    """Put the catalog page count into a phrase, once."""
    phrase = f"{count} 个子主题"
    if re.search(r"\d+\s*(?:个子主题|章)", text):
        return re.sub(r"\d+\s*(?:个子主题|章)", phrase, text, count=1)
    return text.rstrip() + f" · {phrase}"


def apply_homepage_counts(text: str, catalog: dict) -> str:
    """Replace homepage sentences that state a topic's page count."""
    java = subtopic_count(catalog, "topics/java/README.md")
    micro = subtopic_count(catalog, "topics/microservices/README.md")
    text = re.sub(
        r"Java \d+ 个子主题、微服务 \d+ 个子主题",
        f"Java {java} 个子主题、微服务 {micro} 个子主题",
        text,
    )
    text = re.sub(
        r"\d+ 个子主题，从架构拆分",
        f"{micro} 个子主题，从架构拆分",
        text,
    )
    text = re.sub(
        r"看全部 \d+ 个子主题",
        f"看全部 {micro} 个子主题",
        text,
    )
    return text


def apply_homepage(text: str, catalog: dict) -> str:
    """Rewrite topic-row badges, counts, and the terminal from the catalog."""
    by_path = {page["path"]: page for page in catalog["pages"]}
    pages = catalog["pages"]

    def repl(match: re.Match) -> str:
        href = match.group("href")
        page = by_path[href]
        editorial = page["editorial"]
        if editorial not in LABELS:
            raise ValueError(f"bad editorial for {href}")
        title = re.sub(r"<small>.*?</small>", "", match.group("title")).strip()
        desc = with_subtopic_count(match.group("desc"), subtopic_count(catalog, href))
        wip = " s--wip" if editorial == "building" else ""
        todo = "{ .tn2-todo }" if editorial == "planned" else ""
        roll = translation_rollup(page, pages)
        return (
            f'[<span class="n">{match.group("num")}</span>'
            f'<span class="t">{title}</span>'
            f'<span class="d">{desc}</span>'
            f'<span class="s-pair"><span class="s{wip}">{LABELS[editorial]["zh"]}</span>'
            f'<span class="s s--tr">{TR_LABELS[roll]["zh"]}</span></span>]({href}){todo}'
        )

    rewritten, count = INDEX_ROW_RE.subn(repl, text)
    if count != 13:
        raise ValueError(f"expected 13 homepage rows, rewrote {count}")
    rewritten = re.sub(r"(### [^<\n]+?)\s*<small>.*?</small>", r"\1", rewritten)
    marker = '<p class="tn2-lede">整个笔记本的目录。高亮的正在搭建，灰色的还没开始。</p>'
    note = (
        '<p class="tn-status">编辑状态是待开始、搭建中、已完成。'
        "翻译是已译、部分、未译。"
        "本机已学进度只在这台浏览器里，清掉记录不会改变编辑状态。</p>"
    )
    if "清掉记录不会改变编辑状态" not in rewritten:
        if marker not in rewritten:
            raise ValueError("homepage lede missing")
        rewritten = rewritten.replace(marker, marker + "\n\n" + note, 1)
    rewritten = apply_terminal(rewritten, catalog)
    return apply_homepage_counts(rewritten, catalog)


def chapter_statuses(root: Path | None = None) -> dict[str, str]:
    root = root or ROOT
    found = {}
    for readme in sorted((root / "topics").rglob("README.md")):
        text = readme.read_text(encoding="utf-8")
        for _label, href, emoji in TABLE_ROW_RE.findall(text):
            if emoji not in EMOJI_STATUS:
                continue
            target = (readme.parent / href).resolve()
            try:
                rel = target.relative_to((root / "topics").resolve())
            except ValueError:
                continue
            path = ("topics" / rel).as_posix()
            if path.endswith("/"):
                path += "README.md"
            elif not path.endswith(".md"):
                path = path.rstrip("/") + "/README.md"
            found[path] = EMOJI_STATUS[emoji]
    return found


def derive_catalog(root: Path | None = None) -> dict:
    root = root or ROOT
    home = homepage_statuses(root)
    chapters = chapter_statuses(root)
    pages = []
    for rel in content_paths(root):
        h1 = read_h1(root / rel)
        title_zh, title_en = strip_gloss(h1), None
        if rel in home:
            editorial = home[rel]
            kind = "topic"
        elif rel in chapters:
            editorial = chapters[rel]
            kind = "chapter"
        elif rel in META_EDITORIAL:
            editorial = META_EDITORIAL[rel]
            kind = "meta" if rel != "website/index.md" else "home"
        else:
            raise ValueError(f"no editorial status for {rel}")
        if rel == "website/index.md":
            title_zh, title_en = "技术笔记", "tech-notes"
            kind = "home"
        elif rel in TRANSLATED:
            title_en = read_h1(english_source(rel))
            title_zh = strip_gloss(h1)
        if rel in PAGE_TITLE_EN:
            if rel in TRANSLATED:
                raise ValueError(f"a translated page is also only a display name: {rel}")
            title_en = PAGE_TITLE_EN[rel]
        pages.append(
            {
                "path": rel,
                "title_zh": title_zh,
                "title_en": title_en,
                "editorial": editorial,
                "translation": "translated" if rel in TRANSLATED else "untranslated",
                "kind": kind,
            }
        )
    translated = [p["path"] for p in pages if p["translation"] == "translated"]
    return {
        "version": 2,
        "labels": LABELS,
        "translation_labels": TR_LABELS,
        "generated_surfaces": list(GENERATED_SURFACES),
        "note": (
            "editorial is the publishing state of the Chinese page. "
            "translation is separate. partial is computed for topic rows and is not stored per page. "
            "complete is never inferred from prose. "
            "On-device quest progress is not in this file. "
            "Topic README status tables are generated from this catalog. "
            "PR 33 is merged; its chapters are untranslated. "
            "mixed_h1_remaining lists H1s that still append an English gloss."
        ),
        "mixed_h1_remaining": mixed_h1_paths(root),
        "pages": pages,
        "counts": {
            "pages": len(pages),
            "translated": len(translated),
            "untranslated": len(pages) - len(translated),
            "editorial": {
                key: sum(1 for p in pages if p["editorial"] == key)
                for key in LABELS
            },
        },
        "pending_integrations": PENDING_INTEGRATIONS,
    }


def english_source(rel: str) -> Path:
    return EN_ROOT / rel


def coverage_errors(root: Path | None = None, catalog: dict | None = None) -> list[str]:
    root = root or ROOT
    catalog = catalog or json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    errors = []
    derived = derive_catalog(root)
    if catalog["pages"] != derived["pages"]:
        errors.append("site-catalog.json pages differ from homepage, status tables, and META")
    if catalog["counts"] != derived["counts"]:
        errors.append("site-catalog.json counts are stale")
    if catalog.get("pending_integrations") != derived["pending_integrations"]:
        errors.append("pending_integrations drifted from PR 33 note")
    if catalog.get("labels") != derived["labels"]:
        errors.append("status labels drifted")
    if catalog.get("translation_labels") != derived["translation_labels"]:
        errors.append("translation labels drifted")
    if catalog.get("mixed_h1_remaining") != derived["mixed_h1_remaining"]:
        errors.append("mixed H1 list is stale")
    if catalog.get("generated_surfaces") != derived["generated_surfaces"]:
        errors.append("generated surface list drifted")
    for page in catalog["pages"]:
        if "xp" in page or "learned" in page or "progress" in page:
            errors.append(f"personal progress stored in catalog: {page['path']}")
    paths = [p["path"] for p in catalog["pages"]]
    if len(paths) != len(set(paths)):
        errors.append("duplicate catalog paths")
    for page in catalog["pages"]:
        if page["editorial"] not in LABELS:
            errors.append(f"bad editorial: {page['path']}")
        if page["translation"] not in ("translated", "untranslated"):
            errors.append(f"bad translation: {page['path']}")
        if page["editorial"] == "complete":
            errors.append(f"prose must not be marked complete: {page['path']}")
        src = english_source(page["path"])
        if (
            page["translation"] == "translated"
            and page["path"] not in GENERATED_EN
            and not src.is_file()
        ):
            errors.append(f"translated page has no English source: {page['path']}")
        if page["translation"] == "untranslated" and src.is_file():
            errors.append(f"English file exists but page is untranslated: {page['path']}")
    for rel in TRANSLATED:
        if rel not in paths:
            errors.append(f"TRANSLATED path missing from catalog: {rel}")
    by_path = {p["path"]: p for p in catalog["pages"]}
    for item in catalog["pending_integrations"]:
        if item.get("pr") == 33 and not item.get("merged"):
            errors.append("PR 33 is on main but the catalog still says it is open")
        for change in item.get("when_merged") or []:
            page = by_path.get(change["path"])
            if page is None:
                errors.append(f"merged page missing from catalog: {change['path']}")
                continue
            if page["editorial"] != change["editorial"]:
                errors.append(f"{change['path']} editorial is {page['editorial']}")
            if page["translation"] != change["translation"]:
                errors.append(f"{change['path']} translation is {page['translation']}")
            if change.get("new_file") and not (root / change["path"]).is_file():
                errors.append(f"merged chapter missing on disk: {change['path']}")
    return errors


def chapter_path(readme: Path, href: str, root: Path) -> str | None:
    target = (readme.parent / href).resolve()
    try:
        rel = target.relative_to(root.resolve())
    except ValueError:
        return None
    path = rel.as_posix()
    if path.endswith("/"):
        path += "README.md"
    elif not path.endswith(".md"):
        path = path.rstrip("/") + "/README.md"
    return path


STATUS_ROW_RE = re.compile(
    r"^(\|\s*\d+\s*\|\s*\[)([^\]]+)(\]\()([^)]+)(\)\s*\|.*\|\s*)([🟢🟡⚪])(\s*\|)\s*$",
    re.M,
)


def apply_status_tables(text: str, catalog: dict, readme_rel: str, root: Path | None = None) -> str:
    """Rewrite the status emoji in a topic table from the catalog. Link text is left alone."""
    root = root or ROOT
    by_path = {page["path"]: page for page in catalog["pages"]}
    readme = root / readme_rel

    def repl(match: re.Match) -> str:
        path = chapter_path(readme, match.group(4), root)
        page = by_path.get(path or "")
        if page is None:
            return match.group(0)
        emoji = EMOJI_FOR[page["editorial"]]
        return (
            match.group(1)
            + match.group(2)
            + match.group(3)
            + match.group(4)
            + match.group(5)
            + emoji
            + match.group(7)
        )

    return STATUS_ROW_RE.sub(repl, text)


def write_status_tables(root: Path | None = None, catalog: dict | None = None) -> int:
    root = root or ROOT
    catalog = catalog or json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    changed = 0
    for readme in sorted((root / "topics").rglob("README.md")):
        rel = readme.relative_to(root).as_posix()
        text = readme.read_text(encoding="utf-8")
        updated = apply_status_tables(text, catalog, rel, root)
        if updated != text:
            readme.write_text(updated, encoding="utf-8")
            changed += 1
    return changed


def apply_chinese_titles(root: Path | None = None, snapshot: dict | None = None) -> list[dict]:
    """Remove appended English glosses from H1s and link labels. Pin the old H1 id."""
    root = root or ROOT
    snapshot = snapshot or json.loads((root / "website/data/h1-anchors.json").read_text(encoding="utf-8"))
    by_path = {page["path"]: page for page in snapshot["pages"]}
    link_re = re.compile(r"(?<!!)\[([^\]]+)\]\(([^)]+)\)")
    changes = []
    files = [root / rel for rel in content_paths(root)]
    for path in files:
        rel = path.relative_to(root).as_posix()
        original = path.read_text(encoding="utf-8")
        anchor = (by_path.get(rel) or {}).get("h1_id")
        updated, detail = _rewrite_chinese_text(original, anchor, link_re)
        if rel == "website/index.md":
            sample = updated.replace("# Java 技术栈 Java Stack", "# Java 技术栈")
            if sample != updated:
                detail = detail or {"path": rel, "kind": "sample"}
                updated = sample
        if updated != original:
            path.write_text(updated, encoding="utf-8")
            if detail:
                detail["path"] = rel
                changes.append(detail)
            else:
                changes.append({"path": rel, "kind": "links"})
    return changes


def _rewrite_chinese_text(text: str, anchor: str | None, link_re: re.Pattern) -> tuple[str, dict | None]:
    lines = text.splitlines(keepends=True)
    fence = False
    pre = 0
    titled = False
    detail = None
    out = []
    for line in lines:
        opener = line.lstrip()
        if opener.startswith("```") or opener.startswith("~~~"):
            fence = not fence
            out.append(line)
            continue
        if not fence and "<pre" in line:
            pre += line.count("<pre")
        if not fence and pre == 0 and not titled and re.match(r"^#\s+\S", line):
            newline, detail = _rewrite_h1(line, anchor)
            out.append(newline)
            titled = True
        elif not fence and pre == 0:
            out.append(_rewrite_link_line(line, link_re))
        else:
            out.append(line)
        if not fence and "</pre>" in line:
            pre = max(0, pre - line.count("</pre>"))
    return "".join(out), detail


def _rewrite_h1(line: str, anchor: str | None) -> tuple[str, dict | None]:
    ending = "\n" if line.endswith("\n") else ""
    match = re.match(r"^#\s+(.+?)\s*$", line.rstrip("\n"))
    if not match:
        return line, None
    body = match.group(1)
    existing = re.search(r"\{#([^}]+)\}\s*$", body)
    visible = re.sub(r"\s*\{#[^}]+\}\s*$", "", body).strip()
    if "<" in visible or ">" in visible:
        return line, None
    chinese = strip_gloss(visible)
    if chinese == visible:
        return line, None
    pinned = existing.group(1) if existing else anchor
    if not pinned:
        raise ValueError(f"no previous anchor for heading: {visible}")
    rewritten = f"# {chinese} {{#{pinned}}}{ending}"
    return rewritten, {"old": visible, "new": chinese, "id": pinned}


def _rewrite_link_line(line: str, link_re: re.Pattern) -> str:
    def repl(match: re.Match) -> str:
        label, href = match.group(1), match.group(2)
        if "<" in label:
            return match.group(0)
        chinese = strip_gloss(label)
        if chinese == label:
            return match.group(0)
        return f"[{chinese}]({href})"

    return link_re.sub(repl, line)


README_ROW_RE = re.compile(
    r"^(\|.*?\]\(topics/([A-Za-z0-9-]+)/\)\s*\|)[ \t]*([^|]*)\|[ \t]*[🟢🟡⚪][^|]*\|[ \t]*$",
    re.M,
)


def apply_readme(text: str, catalog: dict) -> str:
    """Rewrite the root README status column and any topic page count from the catalog."""
    by_slug = {
        topic_slug(page["path"]): page
        for page in catalog["pages"]
        if page["kind"] == "topic"
    }

    def repl(match: re.Match) -> str:
        page = by_slug[match.group(2)]
        count = subtopic_count(catalog, page["path"])
        desc = with_subtopic_count(match.group(3).strip(), count)
        label = f"{EMOJI_FOR[page['editorial']]} {LABELS[page['editorial']]['zh']}"
        return f"{match.group(1)} {desc} | {label} |"

    updated, count = README_ROW_RE.subn(repl, text)
    if count != 13:
        raise ValueError(f"expected 13 README topic rows, rewrote {count}")
    theory = subtopic_count(catalog, "topics/cs-theory/README.md")
    updated, tip = re.subn(
        r"这 (?:\d+ 章|\d+ 个子主题)",
        f"这 {theory} 个子主题",
        updated,
        count=1,
    )
    if tip != 1:
        raise ValueError("README theory count sentence missing")
    return updated


def apply_topic_index(text: str, catalog: dict) -> str:
    """Rewrite the systems page-count sentence.

    The web row is a fixed blurb. The old 「浏览器里的源已有 N 个子主题」
    sentence is not put back.
    """
    systems = subtopic_count(catalog, "topics/systems/README.md")
    updated, systems_n = re.subn(
        r"分布式系统模型已有\s*(?:一章|\d+\s*个子主题)",
        f"分布式系统模型已有 {systems} 个子主题",
        text,
        count=1,
    )
    if systems_n != 1:
        raise ValueError("topic index systems count sentence missing")
    return updated


def main() -> int:
    catalog = derive_catalog()
    text = json.dumps(catalog, ensure_ascii=False, indent=2) + "\n"
    if "--write" in sys.argv:
        CATALOG_PATH.parent.mkdir(parents=True, exist_ok=True)
        CATALOG_PATH.write_text(text, encoding="utf-8")
        print(f"wrote {CATALOG_PATH} {catalog['counts']}")
        return 0
    if "--write-tables" in sys.argv:
        catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
        print(f"updated status tables in {write_status_tables(ROOT, catalog)} files")
        return 0
    if "--write-titles" in sys.argv:
        changes = apply_chinese_titles()
        print(f"retitled {len(changes)} files")
        return 0
    if "--write-homepage" in sys.argv:
        catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
        path = ROOT / "website" / "index.md"
        path.write_text(apply_homepage(path.read_text(encoding="utf-8"), catalog), encoding="utf-8")
        readme = ROOT / "README.md"
        readme.write_text(apply_readme(readme.read_text(encoding="utf-8"), catalog), encoding="utf-8")
        index = ROOT / "topics" / "README.md"
        index.write_text(apply_topic_index(index.read_text(encoding="utf-8"), catalog), encoding="utf-8")
        print(f"wrote {path}")
        return 0
    if "--check" in sys.argv:
        errors = coverage_errors(catalog=json.loads(CATALOG_PATH.read_text(encoding="utf-8")))
        if errors:
            print("\n".join(errors))
            return 1
        print("ok", catalog["counts"])
        return 0
    print(text)
    return 0


if __name__ == "__main__":
    sys.dont_write_bytecode = True
    raise SystemExit(main())
