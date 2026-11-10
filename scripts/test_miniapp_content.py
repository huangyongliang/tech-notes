#!/usr/bin/env python3
"""Lock the miniapp skeleton: 35 docs, build-time nodes, no web-view.

Run: python3 scripts/test_miniapp_content.py
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import build_miniapp_content as b  # noqa: E402
import render_mermaid as rm  # noqa: E402

ROOT = HERE.parent
MINI = ROOT / "miniprogram"
TOKENS_SHA256 = "75ad9a8b19aecdf086fd6ee11a2b09de1b0f52b7cfc4077939d1a8670a2064ed"
PAGES = {
    "pages/topics/topics",
    "pages/recent/recent",
    "pages/category/category",
    "pages/search/search",
    "pages/about/about",
}
READER_PAGE = "pages/reader/reader"
TAB_PAGES = ["pages/topics/topics", "pages/recent/recent"]
BANNED_UI = ("永亮", "Yongliang", "小鼠", "优鼠", "微鼠", "huangyongliang")


def walk(blocks, kinds: dict) -> None:
    for block in blocks:
        kinds[block["t"]] = kinds.get(block["t"], 0) + 1
        if block["t"] == "callout":
            assert block["kind"] in {"note", "tip", "warning"}
            kinds[f"callout:{block['kind']}"] = kinds.get(f"callout:{block['kind']}", 0) + 1
        child = block.get("blocks")
        if isinstance(child, list):
            walk(child, kinds)
        if block["t"] in {"ul", "ol"}:
            for item in block.get("items") or []:
                nested = item.get("blocks")
                if isinstance(nested, list):
                    walk(nested, kinds)


def main() -> None:
    sample = """# 测

正文四百。

```js
代码汉字不应计入
```

> [!NOTE]
> 注

[链](https://example.com/abc)

<details><summary>参考答案</summary>
答案汉字
</details>
"""
    assert b.count_han(sample) == 7, b.count_han(sample)
    assert b.minutes_for(0) == 1
    assert b.minutes_for(1) == 1
    assert b.minutes_for(400) == 1
    assert b.minutes_for(401) == 2
    assert b.split_title("并发 Concurrency") == ("并发", "Concurrency")
    assert b.split_title("Java 技术栈 Java Stack") == ("Java 技术栈", "Java Stack")
    assert b.split_title("输入输出 IO & NIO") == ("输入输出", "IO & NIO")
    assert b.split_title("第一门语言 C 与环境 First Language: C") == (
        "第一门语言 C 与环境",
        "First Language: C",
    )
    assert b.split_title("Linux 与 Shell Linux & Shell") == ("Linux 与 Shell", "Linux & Shell")

    quiz = b.parse_blocks(
        "1. 【单选】关机后数据仍然保存的是：\n"
        "    - A. 内存（RAM）\n"
        "    - B. CPU 缓存\n"
        "    - C. SSD\n"
        "    - D. 寄存器\n"
        "2. 【简答】操作系统在硬件和应用程序之间做了哪些事？说出两点。\n"
    )
    assert len(quiz) == 1 and quiz[0]["t"] == "ol"
    assert [item["n"] for item in quiz[0]["items"]] == [1, 2]
    assert b.plain(quiz[0]["items"][0]["inlines"]).startswith("【单选】")
    options = quiz[0]["items"][0]["blocks"]
    assert [block["t"] for block in options] == ["ul"]
    assert [b.plain(item["inlines"])[:2] for item in options[0]["items"]] == [
        "A.",
        "B.",
        "C.",
        "D.",
    ]
    assert "blocks" not in quiz[0]["items"][1]
    flat = b.parse_blocks("1. 甲\n2. 乙\n")
    assert [item["n"] for item in flat[0]["items"]] == [1, 2]
    assert all("blocks" not in item for item in flat[0]["items"])
    spaced = b.parse_blocks("1. a\n\n2. b\n")
    assert len(spaced) == 1 and [item["n"] for item in spaced[0]["items"]] == [1, 2]
    tasks = b.parse_blocks("- [ ] 能够解释断电后内存里的数据丢失。\n")
    assert tasks[0]["t"] == "ul"
    assert b.plain(tasks[0]["items"][0]["inlines"]).startswith("☐ ")
    continued = b.parse_blocks("- hello\n  world\n")
    flow = "flowchart LR\n  A[输入设备 Input] --> B[CPU]"
    assert rm.diagram_alt(flow) == "输入设备 Input"
    titled = "---\ntitle: 总览\n---\nflowchart LR\n  A[第一步] --> B[第二步]\n"
    assert rm.diagram_title(titled) == "总览"
    assert rm.diagram_alt(titled) == "总览"
    prepared = rm.prepare_source(flow)
    assert prepared.index("flowchart") < prepared.index("classDef hot")
    assert "classDef mark" in prepared
    authored = "flowchart LR\n  A[a]\n  classDef hot fill:#000,color:#fff\n"
    authored_prepared = rm.prepare_source(authored)
    assert authored_prepared.count("classDef hot") == 1
    assert "classDef mark" in authored_prepared
    sequence = "sequenceDiagram\n  Alice->>Bob: hi\n"
    assert "classDef" not in rm.prepare_source(sequence)
    assert rm.diagram_hash(flow) == rm.diagram_hash(flow)
    assert rm.diagram_hash(flow) != rm.diagram_hash(flow + "\n")
    import tempfile

    def _boom(_source: str, _dest: Path) -> None:
        raise RuntimeError("parse error")

    with tempfile.TemporaryDirectory() as tmp_fail:
        failed = rm.materialize(
            flow,
            doc_id="unit",
            out_dir=Path(tmp_fail),
            index={},
            runner=_boom,
        )
    assert failed["t"] == "code" and failed["lang"] == "mermaid"
    assert failed["banner"] == "图表未生成 · 显示源码"
    assert failed["code"] == flow
    assert "parse error" in rm.warnings()[-1]
    assert "unit" in rm.warnings()[-1]
    rm.clear_warnings()

    def _boom(_source: str, _dest: Path) -> None:
        raise RuntimeError("parse error on line 2: unexpected token")

    one_doc = {
        "only": {
            "blocks": [{"t": "code", "lang": "mermaid", "code": "flowchart LR\n  A[唯一一张]"}],
        }
    }
    with tempfile.TemporaryDirectory() as tmp_one:
        one_stats = rm.attach_diagrams(
            one_doc,
            out_dir=Path(tmp_one) / "png",
            index_path=Path(tmp_one) / "index.json",
            runner=_boom,
        )
    assert one_stats["count"] == 0 and one_stats["failures"] == 1
    one_node = one_doc["only"]["blocks"][0]
    assert one_node["t"] == "code" and one_node["banner"] == "图表未生成 · 显示源码"
    assert one_node["code"].startswith("flowchart LR")
    assert any("only" in message and "parse error on line 2" in message for message in rm.warnings())
    rm.clear_warnings()

    all_docs = {
        "a": {"blocks": [{"t": "code", "lang": "mermaid", "code": "flowchart LR\n  A[甲]"}]},
        "b": {"blocks": [{"t": "code", "lang": "mermaid", "code": "flowchart TD\n  B[乙]"}]},
    }
    with tempfile.TemporaryDirectory() as tmp_all:
        all_stats = rm.attach_diagrams(
            all_docs,
            out_dir=Path(tmp_all) / "png",
            index_path=Path(tmp_all) / "index.json",
            runner=_boom,
        )
    assert all_stats["count"] == 0 and all_stats["failures"] == 2
    assert all(doc["blocks"][0]["t"] == "code" for doc in all_docs.values())
    assert all(doc["blocks"][0]["banner"] == "图表未生成 · 显示源码" for doc in all_docs.values())
    assert {message.split("(")[1].split(")")[0] for message in rm.warnings()} >= {"a", "b"}
    rm.clear_warnings()
    indexed = b.block_text(
        [
            {"t": "p", "inlines": [{"t": "text", "v": "正文"}]},
            {
                "t": "diagram",
                "src": "/pages/reader/diagrams/x.png",
                "w": 1,
                "h": 1,
                "alt": "a",
                "source": "DIAGRAM_TOKEN",
            },
            {
                "t": "code",
                "lang": "mermaid",
                "code": "FAILED_TOKEN",
                "banner": "图表未生成 · 显示源码",
            },
            {"t": "code", "lang": "c", "code": "int x;"},
        ]
    )
    assert "DIAGRAM_TOKEN" not in indexed
    assert "FAILED_TOKEN" not in indexed
    assert "int x;" in indexed
    assert "正文" in indexed

    assert b.plain(continued[0]["items"][0]["inlines"]) == "hello world"
    deep = b.parse_blocks("1. parent\n    - child\n        - grand\n")
    grand = deep[0]["items"][0]["blocks"][0]["items"][0]["blocks"][0]
    assert grand["t"] == "ul"
    assert b.plain(grand["items"][0]["inlines"]) == "grand"

    catalog = b.build_catalog()
    assert catalog["docCount"] == 35
    assert len(catalog["docs"]) == 35
    kind_counts: dict[str, int] = {}
    for item in catalog["docs"].values():
        kind_counts[item["kind"]] = kind_counts.get(item["kind"], 0) + 1
    assert kind_counts == {"chapter": 30, "topic": 4, "roadmap": 1}

    doc = catalog["docs"]["java/05-concurrency"]
    assert doc["han"] == 1745
    assert doc["minutes"] == 5
    assert doc["titleZh"] == "并发"
    assert doc["kind"] == "chapter"

    kinds: dict = {}
    for item in catalog["docs"].values():
        assert item["path"].startswith("topics/")
        assert not item["path"].startswith("topics/ai/")
        assert not item["path"].startswith("topics/microservices/")
        assert item["minutes"] >= 1
        walk(item["blocks"], kinds)
    assert kinds["callout:note"] >= 1
    assert kinds["callout:tip"] >= 1
    assert kinds["callout:warning"] >= 1
    assert kinds["code"] >= 1
    assert kinds["fold"] >= 1
    assert kinds["quote"] >= 1

    fold_markers = 0
    for item in catalog["docs"].values():
        text = (ROOT / item["path"]).read_text(encoding="utf-8")
        fold_markers += text.count("<summary>参考答案</summary>")
    assert kinds["fold"] == fold_markers

    fence_count = 0
    for item in catalog["docs"].values():
        text = (ROOT / item["path"]).read_text(encoding="utf-8")
        fence_count += len(re.findall(r"^```mermaid\s*$", text, re.M))
    assert fence_count >= 1
    diagram_bytes = 0
    seen_src: set[str] = set()
    success_count = 0
    fallback_count = 0
    for item in catalog["docs"].values():
        search_row = next(row for row in catalog["search"] if row["id"] == item["id"])

        def check_blocks(blocks: list) -> None:
            nonlocal diagram_bytes, success_count, fallback_count
            for block in blocks:
                if block.get("t") == "diagram":
                    success_count += 1
                    assert block["src"].startswith("/pages/reader/diagrams/")
                    assert block["src"].endswith(".png")
                    assert not block["src"].endswith(".dark.png")
                    assert ".preview." not in block["src"]
                    assert block["w"] > 0 and block["h"] > 0
                    assert block["pw"] == 2 * block["w"]
                    assert block["ph"] == 2 * block["h"]
                    assert block["alt"] and block["source"]
                    assert "classDef hot" not in block["source"]
                    png = MINI / block["src"].lstrip("/")
                    assert png.is_file(), png
                    assert rm._png_size(png) == (block["pw"], block["ph"])
                    diagram_bytes += png.stat().st_size
                    seen_src.add(block["src"])
                    assert block["source"].lower() not in search_row["bodyText"]
                if block.get("t") == "code" and block.get("lang") == "mermaid":
                    fallback_count += 1
                    assert block.get("banner") == "图表未生成 · 显示源码"
                    assert block.get("code")
                    assert block.get("code") not in search_row["bodyText"]
                child = block.get("blocks")
                if isinstance(child, list):
                    check_blocks(child)
                if block.get("t") in {"ul", "ol"}:
                    for entry in block.get("items") or []:
                        nested = entry.get("blocks")
                        if isinstance(nested, list):
                            check_blocks(nested)

        check_blocks(item["blocks"])
    assert success_count + fallback_count == fence_count
    assert success_count == kinds.get("diagram", 0)
    assert seen_src
    assert diagram_bytes < 1_800_000
    small = catalog["docs"]["programming-basics/06-small-projects"]
    small_search = next(row for row in catalog["search"] if row["id"] == small["id"])
    assert "stderr 报错" not in small_search["bodyText"]
    for png in (MINI / "pages" / "reader" / "diagrams").glob("*.png"):
        assert f"/pages/reader/diagrams/{png.name}" in seen_src
    for path in MINI.rglob("*.png"):
        if "node_modules" in path.parts:
            continue
        rel = path.relative_to(MINI).as_posix()
        assert rel.startswith("pages/reader/diagrams/") or rel.startswith("assets/"), rel

    option_re = re.compile(r"^[A-D]\.\s")
    nested_quizzes = 0
    knowledge_chapters = {
        "java/03-core-advanced",
        "java/04-io-nio",
        "java/05-concurrency",
        "java/06-jvm",
        "java/07-build-tools",
        "java/08-testing",
        "java/09-spring",
        "java/10-persistence",
    }
    for item in catalog["docs"].values():
        if item["kind"] != "chapter":
            continue
        if item["id"] in knowledge_chapters:
            continue
        quiz_ol = None
        seen_quiz = False
        for block in item["blocks"]:
            if block.get("t") == "h" and block.get("text") == "通关自测":
                seen_quiz = True
                continue
            if not seen_quiz:
                continue
            if block.get("t") == "ol":
                quiz_ol = block
                break
            if block.get("t") == "h":
                break
        assert quiz_ol is not None, item["id"]
        numbers = [entry["n"] for entry in quiz_ol["items"]]
        assert numbers == list(range(1, len(numbers) + 1)), item["id"]
        saw_options = False
        for entry in quiz_ol["items"]:
            stem = b.plain(entry["inlines"])
            assert not option_re.match(stem), (item["id"], stem)
            children = entry.get("blocks") or []
            assert all(child["t"] == "ul" for child in children), item["id"]
            for child in children:
                saw_options = True
                labels = [b.plain(opt["inlines"]).split(".", 1)[0] for opt in child["items"]]
                assert labels == [chr(ord("A") + i) for i in range(len(labels))], (
                    item["id"],
                    labels,
                )
                assert all("blocks" not in opt for opt in child["items"])
        assert saw_options, item["id"]
        nested_quizzes += 1
        folds = [block for block in item["blocks"] if block.get("t") == "fold"]
        assert len(folds) == 1, item["id"]
        answers = [block for block in folds[0]["blocks"] if block.get("t") == "ol"]
        assert len(answers) == 1, item["id"]
        answer_numbers = [entry["n"] for entry in answers[0]["items"]]
        assert answer_numbers == list(range(1, len(answer_numbers) + 1)), item["id"]
        assert all("blocks" not in entry for entry in answers[0]["items"]), item["id"]
    assert nested_quizzes == 22

    computer = catalog["docs"]["getting-started/01-what-is-a-computer"]
    practice = next(
        block
        for block in computer["blocks"]
        if block.get("t") == "ol"
        and b.plain(block["items"][0]["inlines"]).startswith("查看自己电脑的配置")
    )
    assert [entry["n"] for entry in practice["items"]] == [1, 2, 3, 4, 5]
    assert all("blocks" not in entry for entry in practice["items"])
    goals = next(block for block in computer["blocks"] if block.get("t") == "ul")
    assert b.plain(goals["items"][0]["inlines"]).startswith("☐ ")
    assert all("blocks" not in entry for entry in goals["items"])
    computer_search = next(row for row in catalog["search"] if row["id"] == computer["id"])
    assert "寄存器" in computer_search["bodyText"]

    counts = {
        topic["id"]: topic["count"]
        for group in catalog["groups"]
        for topic in group["topics"]
    }
    assert counts == {
        "getting-started": 5,
        "cs-basics": 7,
        "programming-basics": 6,
        "java": 12,
    }
    assert catalog["roadmap"]["id"] == "roadmap"

    search = catalog["search"]
    assert len(search) == 35
    assert {item["id"] for item in search} == set(catalog["docs"])
    for item in search:
        assert set(item) == {
            "id",
            "kind",
            "topicId",
            "title",
            "path",
            "titleText",
            "bodyText",
        }
        assert item["path"] == catalog["docs"][item["id"]]["path"]
        assert not item["path"].startswith("topics/ai/")
        assert not item["path"].startswith("topics/microservices/")
    concurrency = next(item for item in search if item["id"] == "java/05-concurrency")
    assert "并发" in concurrency["titleText"]
    assert "pinning" not in concurrency["titleText"]
    assert "pinning" in concurrency["bodyText"]
    for item in search:
        title = item["title"]
        assert "None" not in title, title
        assert not title.endswith(" ")
        lowered = item["titleText"]
        assert "\nnone" not in lowered and not lowered.endswith("none"), item["id"]

    rendered = b.render_ts(catalog)
    on_disk = (MINI / "data" / "catalog.ts").read_text(encoding="utf-8")
    assert on_disk == rendered, "run python3 scripts/build_miniapp_content.py"
    assert " None" not in on_disk

    tokens = (MINI / "styles" / "tokens.wxss").read_bytes()
    assert hashlib.sha256(tokens).hexdigest() == TOKENS_SHA256
    token_text = tokens.decode("utf-8")
    assert token_text.lstrip().startswith("/*")
    assert "page {" in token_text
    for name in ("--tn-bg", "--tn-ink", "--tn-accent", "--tn-note-bar", "--tn-shadow"):
        assert name in token_text

    app = json.loads((MINI / "app.json").read_text(encoding="utf-8"))
    assert app["pages"][0] == "pages/topics/topics"
    assert set(app["pages"]) == PAGES
    assert READER_PAGE not in app["pages"]
    reader_pkg = next(item for item in app["subPackages"] if item["root"] == "pages/reader")
    assert reader_pkg["pages"] == ["reader"]
    assert reader_pkg.get("name") == "reader"
    for rule in (
        app["preloadRule"]["pages/topics/topics"],
        app["preloadRule"]["pages/category/category"],
        app["preloadRule"]["pages/search/search"],
    ):
        assert "reader" in rule["packages"]
    tab_pages = [item["pagePath"] for item in app["tabBar"]["list"]]
    assert tab_pages == TAB_PAGES
    assert app["tabBar"]["custom"] is True
    assert READER_PAGE not in tab_pages
    assert [item["text"] for item in app["tabBar"]["list"]] == ["主题", "最近"]
    for hidden in (
        "pages/category/category",
        "pages/search/search",
        "pages/about/about",
    ):
        assert hidden not in tab_pages
        assert hidden in app["pages"]

    category_json = json.loads((MINI / "pages/category/category.json").read_text(encoding="utf-8"))
    reader_json = json.loads((MINI / "pages/reader/reader.json").read_text(encoding="utf-8"))
    search_json = json.loads((MINI / "pages/search/search.json").read_text(encoding="utf-8"))
    tab_host = json.loads((MINI / "custom-tab-bar/index.json").read_text(encoding="utf-8"))
    assert category_json["usingComponents"]["bottom-nav"] == "/components/bottom-nav/bottom-nav"
    assert "bottom-nav" not in reader_json.get("usingComponents", {})
    assert "bottom-nav" not in search_json.get("usingComponents", {})
    assert search_json.get("component") is not True
    assert tab_host["usingComponents"]["bottom-nav"] == "/components/bottom-nav/bottom-nav"

    category_wxml = (MINI / "pages/category/category.wxml").read_text(encoding="utf-8")
    reader_wxml = (MINI / "pages/reader/reader.wxml").read_text(encoding="utf-8")
    search_wxml = (MINI / "pages/search/search.wxml").read_text(encoding="utf-8")
    about_wxml = (MINI / "pages/about/about.wxml").read_text(encoding="utf-8")
    tab_wxml = (MINI / "custom-tab-bar/index.wxml").read_text(encoding="utf-8")
    assert "<bottom-nav" in category_wxml
    assert 'dock="page"' in category_wxml
    assert "<bottom-nav" not in reader_wxml
    assert "<bottom-nav" not in search_wxml
    assert "<bottom-nav" not in about_wxml
    assert "<bottom-nav" in tab_wxml
    assert 'dock="tab"' in tab_wxml

    for rel in (
        "components/callout/callout.wxml",
        "components/code-block/code-block.wxml",
        "components/answer-fold/answer-fold.wxml",
        "components/md-blocks/md-blocks.wxml",
        "components/diagram/diagram.wxml",
    ):
        assert (MINI / rel).is_file(), rel

    ui = []
    for path in MINI.rglob("*"):
        if "node_modules" in path.parts or "miniprogram_npm" in path.parts:
            continue
        if path.suffix not in {".wxml", ".json", ".ts", ".wxss", ".js"}:
            continue
        if path.name == "catalog.ts":
            continue
        text = path.read_text(encoding="utf-8")
        lowered = text.lower()
        assert "web-view" not in lowered, path
        assert "<webview" not in lowered, path
        if path.suffix == ".wxml":
            ui.append(text)
    ui_text = "\n".join(ui)
    for banned in BANNED_UI:
        assert banned not in ui_text, banned

    package = json.loads((MINI / "package.json").read_text(encoding="utf-8"))
    deps = {**package.get("dependencies", {}), **package.get("devDependencies", {})}
    for name in deps:
        assert "towxml" not in name and "wemark" not in name

    selection = json.loads((MINI / "content-selection.json").read_text(encoding="utf-8"))
    assert selection["documentCount"] == 35
    assert selection["appId"] == "wx9982c4527dbdc2e3"
    assert isinstance(selection["included"], list)
    assert len(selection["included"]) == 35
    assert len(set(selection["included"])) == 35
    assert set(selection["included"]) == {item["path"] for item in catalog["docs"].values()}
    assert set(selection["included"]) == {item["path"] for item in search}

    project = json.loads((MINI / "project.config.json").read_text(encoding="utf-8"))
    assert project["appid"] == "wx9982c4527dbdc2e3"
    assert project["projectname"] == "大蒜技术栈"
    assert project["appid"] != "touristappid"
    private = MINI / "project.private.config.json"
    if private.is_file():
        priv = json.loads(private.read_text(encoding="utf-8"))
        assert priv.get("appid") == "wx9982c4527dbdc2e3"

    assert "没找到，换个关键词试试" in search_wxml
    assert "清空" in search_wxml
    assert "tn-mark" in search_wxml
    assert "queryDocs" in (MINI / "pages/search/search.ts").read_text(encoding="utf-8")
    assert "snippetRuns" in search_wxml

    assert "复制站点链接" in about_wxml
    assert "复制仓库链接" in about_wxml
    assert "清除本机记录" in about_wxml
    assert "huangyongliang" not in about_wxml
    about_ts = (MINI / "pages/about/about.ts").read_text(encoding="utf-8")
    assert "https://huangyongliang.github.io/tech-notes/" in about_ts
    assert "https://github.com/huangyongliang/tech-notes" in about_ts
    assert "clearLocalRecords" in about_ts

    recent = (MINI / "utils/recent.ts").read_text(encoding="utf-8")
    assert "tn_recent_v1" in recent
    assert "tn_favorites_v1" in recent
    assert "removeStorageSync" in recent
    progress = (MINI / "utils/progress.ts").read_text(encoding="utf-8")
    assert 'PROGRESS_KEY = "tn_progress_v1"' in progress
    assert "applyToggle" in progress
    assert "loadProgress" in progress
    assert "toggleChapter" in progress
    assert "clearstorage" not in progress.lower()
    clear_fn = recent[recent.index("export function clearLocalRecords") : recent.index("export function formatWhen")]
    assert "RECENT_KEY" in clear_fn
    assert "FAVORITES_KEY" in clear_fn
    assert "PROGRESS_KEY" in clear_fn
    assert "removeStorageSync" in clear_fn
    assert "clearstorage" not in clear_fn.lower()

    reader_ts = (MINI / "pages/reader/reader.ts").read_text(encoding="utf-8")
    assert 'doc.kind === "chapter"' in reader_ts
    assert "chapterIdSet" in reader_ts
    assert "toggleChapter" in reader_ts
    assert 'wx:if="{{canClear}}"' in reader_wxml
    assert "已通关" in reader_wxml
    assert "通关" in reader_wxml
    assert "onToggleClear" in reader_wxml

    topics_ts = (MINI / "pages/topics/topics.ts").read_text(encoding="utf-8")
    topics_wxml = (MINI / "pages/topics/topics.wxml").read_text(encoding="utf-8")
    assert "loadProgress" in topics_ts
    assert "{{xpLabel}}" in topics_wxml
    assert "{{badgeLine}}" in topics_wxml
    assert "通关/XP 进度" in about_ts
    assert "attachExternal" not in topics_ts
    assert "data-external" not in topics_wxml
    assert "statusLabel" not in topics_ts
    assert "statusLabel" not in topics_wxml
    assert "搭建中" not in topics_wxml
    assert 'class="tn-badge">{{topic.countLabel}}</text>' in topics_wxml
    assert "topic.chapters.length" in topics_ts
    for hidden_id in (
        "microservices",
        "ai",
        "programming",
        "web",
        "systems",
        "devops",
        "product-research",
    ):
        assert hidden_id not in topics_ts, hidden_id

    nav_css = (MINI / "components/bottom-nav/bottom-nav.wxss").read_text(encoding="utf-8")
    assert "background: #f4efe4" in nav_css
    assert "border-top: 1px solid #14110f" in nav_css
    assert "height: 3px" in nav_css
    assert "#ff4f12" in nav_css
    assert "box-shadow" not in nav_css
    assert "safe-area-inset-bottom" in nav_css

    app_css = (MINI / "app.wxss").read_text(encoding="utf-8")
    assert "box-shadow: 4px 4px 0 var(--tn-accent)" in app_css
    assert "<bottom-nav" not in reader_wxml

    for path in MINI.rglob("*"):
        if "node_modules" in path.parts or "miniprogram_npm" in path.parts:
            continue
        if path.suffix not in {".ts", ".js", ".wxml", ".wxss", ".json", ".md"}:
            continue
        if path.name == "catalog.ts":
            continue
        text = path.read_text(encoding="utf-8")
        lowered = text.lower()
        assert "dasuan" not in lowered, path
        if path.suffix in {".ts", ".js"}:
            assert "wx.clearstorage" not in lowered, path

    print("miniapp content ok", catalog["docCount"], "docs", kinds["fold"], "folds")


if __name__ == "__main__":
    main()
