#!/usr/bin/env python3
"""Lock the miniapp skeleton: 35 docs, build-time nodes, no web-view.

Run: python3 scripts/test_miniapp_content.py
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import build_miniapp_content as b  # noqa: E402

ROOT = HERE.parent
MINI = ROOT / "miniprogram"
TOKENS_SHA256 = "75ad9a8b19aecdf086fd6ee11a2b09de1b0f52b7cfc4077939d1a8670a2064ed"
PAGES = {
    "pages/topics/topics",
    "pages/recent/recent",
    "pages/category/category",
    "pages/reader/reader",
    "pages/search/search",
    "pages/about/about",
}
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

    catalog = b.build_catalog()
    assert catalog["docCount"] == 35
    assert len(catalog["docs"]) == 35

    doc = catalog["docs"]["java/05-concurrency"]
    assert doc["han"] == 412
    assert doc["minutes"] == 2
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

    rendered = b.render_ts(catalog)
    on_disk = (MINI / "data" / "catalog.ts").read_text(encoding="utf-8")
    assert on_disk == rendered, "run python3 scripts/build_miniapp_content.py"

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
    tab_pages = [item["pagePath"] for item in app["tabBar"]["list"]]
    assert tab_pages == TAB_PAGES
    assert app["tabBar"]["custom"] is True
    assert "pages/reader/reader" not in tab_pages
    assert [item["text"] for item in app["tabBar"]["list"]] == ["主题", "最近"]
    for hidden in (
        "pages/category/category",
        "pages/reader/reader",
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

    print("miniapp content ok", catalog["docCount"], "docs", kinds["fold"], "folds")


if __name__ == "__main__":
    main()
