#!/usr/bin/env python3
"""Offline test for scripts/build_dialogs.py (stdlib only, no network).

Checks that 「## 闯关任务」 and 「## 学习目标」 are parsed as the same quest-goal
section, that 「## 资料索引」 becomes a links scroll on the last page, and that
the CLI writes a loadable window.TN_DIALOGS file.

Also asserts lecture teach pages ≤ LECTURE_CAP (quizzes do not count) and that
content subsections become heading + first sentence only.

Run: python3 scripts/test_build_dialogs.py
"""
from __future__ import annotations

import json
import subprocess
import sys

sys.dont_write_bytecode = True  # 不在仓库里留下 scripts/__pycache__
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import build_dialogs as bd  # noqa: E402

ARTICLE = """# 示例关卡 Sample

> QUEST 01 · 示例

一段导语。用来生成开场白。

## {goal}

- [ ] 说清 `HashMap` 的结构
- [ ] 会写一个 record 类型
- 奖励：+120 XP · 徽章「示例徽章」

## 通关自测

先独立作答，再核对参考答案。

1. 哪个集合按插入顺序遍历？
   - A. HashMap
   - B. LinkedHashMap

<details><summary>参考答案</summary>

1. B，LinkedHashMap 维护插入顺序。

</details>

## 建议先收的资料

- [官方文档](https://example.invalid/docs)
"""

EXPECTED_TASKS = ["说清 `HashMap` 的结构", "会写一个 record 类型", "奖励：+120 XP · 徽章「示例徽章」"]


def build(goal: str) -> dict:
    d = bd.build_dialog(Path("java/01-sample"), ARTICLE.format(goal=goal))
    assert d is not None
    return d


def main() -> int:
    fails = 0

    def check(name: str, cond: bool) -> None:
        nonlocal fails
        print(("PASS " if cond else "FAIL ") + name)
        if not cond:
            fails += 1

    a, b = build("闯关任务"), build("学习目标")
    c = build("学习目标（30 分钟）")
    check("闯关任务 → tasks parsed", a["tasks"] == EXPECTED_TASKS)
    check("学习目标 → tasks parsed", b["tasks"] == EXPECTED_TASKS)
    check("学习目标（…）suffix → tasks parsed", c["tasks"] == EXPECTED_TASKS)
    check("both headings → identical dialog", a == b == c)
    check("goal section not rendered as a plain 【heading】 page",
          not any("【学习目标" in ln or "【闯关任务" in ln for p in b["pages"] for ln in p["lines"]))
    check("quiz + answer parsed", any(p["type"] == "quiz" and p["answer"].startswith("B") for p in b["pages"]))
    check("xp / badge parsed", b["xp"] == 120 and b["badge"] == "示例徽章")
    check("resource list → scroll", any(s["kind"] == "list" for s in b["scrolls"].values()))
    check("last page is the finish choice", b["pages"][-1]["type"] == "choice")
    check("other headings are not task sections",
          not bd.is_task_heading("学习路径") and not bd.is_task_heading("目标"))

    # 「## 资料索引」 → kind=links scroll on the lecturer's last page (no links in dialog text)
    INDEX_MD = """# 索引关 Sample Index

> QUEST 99 · 索引

导语一句。

## 闯关任务

- [ ] 会打开资料卷轴

## 资料索引

- [LearnFree: Computer Basics](https://www.learnfree.org/series/computer-basics) — GCFGlobal 免费电脑入门系列（英文）
- [CS50x Week 0](https://cs50.harvard.edu/x/weeks/0/) — 哈佛 CS50 第 0 周（英文，免费）
- [无注链接](https://example.invalid/bare)

## 通关自测

1. 测试题？
   - A. 是
   - B. 否

<details><summary>参考答案</summary>

1. A。

</details>
"""
    idx = bd.build_dialog(Path("java/99-index"), INDEX_MD)
    assert idx is not None
    link_scrolls = [s for s in idx["scrolls"].values() if s.get("kind") == "links"]
    check("资料索引 → links scroll", len(link_scrolls) == 1)
    items = link_scrolls[0]["items"] if link_scrolls else []
    check("资料索引 links parsed (title+url)", len(items) == 3 and items[0]["url"].endswith("/computer-basics") and items[0]["title"].startswith("LearnFree"))
    check("资料索引 note kept", items and "GCFGlobal" in items[0]["note"] and items[1]["note"].startswith("哈佛") and items[2]["note"] == "")
    check("资料索引 scroll on last page only",
          idx["pages"][-1].get("scroll") == link_scrolls[0]["id"]
          and not any(p.get("scroll") == link_scrolls[0]["id"] for p in idx["pages"][:-1]))
    check("资料索引 not inlined into dialog text",
          not any("learnfree.org" in ln or "cs50.harvard" in ln or "example.invalid" in ln
                  for p in idx["pages"] for ln in p.get("lines", [])))

    EMPTY_MD = """# 空索引 Empty

导语。

## 闯关任务

- [ ] 一项

## 资料索引

<!-- - [占位](https://example.invalid/x) — 注释掉的条目 -->

## 通关自测

1. 问？
   - A. 是

<details><summary>参考答案</summary>

1. A。

</details>
"""
    empty = bd.build_dialog(Path("java/98-empty-index"), EMPTY_MD)
    assert empty is not None
    check("资料索引 empty section ok (no links scroll / no button)",
          not any(s.get("kind") == "links" for s in empty["scrolls"].values())
          and "scroll" not in empty["pages"][-1])

    # ---- lecture cap: teach ≤ LECTURE_CAP; quizzes kept ----
    many = "\n\n".join(
        f"## 小节{i}\n\n这是第{i}节的第一句话。后面还有一整段不该进对话框。\n\n第二段也不该进。"
        for i in range(1, 25)
    )
    CAP_MD = f"""# 超长关 Cap Quest

> QUEST 01 · 超长

开场导语第一句。开场第二句应被丢掉。

## 闯关任务

- [ ] 任务甲要做完
- [ ] 任务乙也要做完

{many}

## 通关自测

先独立作答，再核对参考答案。

1. 哪一项正确？
   - A. 甲
   - B. 乙

<details><summary>参考答案</summary>

1. A。

</details>
"""
    capped = bd.build_dialog(Path("getting-started/01-cap"), CAP_MD)
    assert capped is not None
    teach_n = sum(1 for p in capped["pages"] if p["type"] == "teach")
    quiz_n = sum(1 for p in capped["pages"] if p["type"] == "quiz")
    check(f"lecture teach pages ≤ {bd.LECTURE_CAP} (got {teach_n})", teach_n <= bd.LECTURE_CAP)
    check("quizzes kept outside lecture cap", quiz_n >= 1)
    check("finish choice still last after cap", capped["pages"][-1]["type"] == "choice")
    # subsection pages: heading + first sentence only
    sub_pages = [p for p in capped["pages"] if p["type"] == "teach"
                 and any(ln.startswith("【小节") for ln in p.get("lines", []))]
    check("subsection → heading+first-sentence page exists", len(sub_pages) >= 1)
    check("subsection page has heading + first sentence lines",
          all(len(p["lines"]) == 2 and p["lines"][0].startswith("【") and "第一句话" in p["lines"][1]
              for p in sub_pages))
    check("subsection drops later paragraphs",
          not any("第二段" in ln or "不该进对话框" in ln
                  for p in capped["pages"] for ln in p.get("lines", [])))
    # first_prose_sentence unit
    check("first_prose_sentence picks first para sentence",
          bd.first_prose_sentence("标题下。\n\n第一句完。第二句。\n\n下一段。") == "第一句完。"
          or bd.first_prose_sentence("第一句完。第二句。\n\n下一段。") == "第一句完。")

    # End-to-end CLI run on a temp topics tree: one draft per heading.
    with tempfile.TemporaryDirectory() as tmp:
        t = Path(tmp) / "topics"
        for folder, goal in (("01-quest-heading", "闯关任务"), ("02-goal-heading", "学习目标")):
            (t / "java" / folder).mkdir(parents=True)
            (t / "java" / folder / "README.md").write_text(ARTICLE.format(goal=goal), encoding="utf-8")
        out = Path(tmp) / "javascripts" / "dialogs.js"
        r = subprocess.run(
            [sys.executable, str(HERE / "build_dialogs.py"), "--topics", str(t), "--out", str(out), "--only-topic", "java"],
            capture_output=True, text=True,
        )
        check("CLI exit 0", r.returncode == 0)
        txt = out.read_text(encoding="utf-8") if out.exists() else ""
        prefix = "window.TN_DIALOGS = "
        body = txt.split(prefix, 1)[1].rstrip().rstrip(";") if prefix in txt else "{}"
        dialogs = json.loads(body).get("dialogs", {})
        print("  sample run:", {k: v["tasks"][:2] for k, v in dialogs.items()})
        check("CLI: java-01 (闯关任务) tasks", dialogs.get("java-01", {}).get("tasks") == EXPECTED_TASKS)
        check("CLI: java-02 (学习目标) tasks", dialogs.get("java-02", {}).get("tasks") == EXPECTED_TASKS)

    print(("OK" if not fails else f"{fails} FAILED"))
    return 1 if fails else 0


if __name__ == "__main__":
    raise SystemExit(main())
