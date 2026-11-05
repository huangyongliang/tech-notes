#!/usr/bin/env python3
"""
Extract NPC teach/quiz/scroll dialogue from tech-notes Markdown.

Reads topics/**/README.md (never invents knowledge text).
Writes a static dialogs.js for the game-mode HUD (no runtime fetch).

Usage:
  python3 scripts/build_dialogs.py \
    --topics _site_src/topics \
    --out    _site_src/javascripts/dialogs.js \
    [--only-topic java] \
    [--only java/01-language-basics,java/02-collections]

Called from scripts/prepare_site_src.sh at build time (CI runs that script).
Standard library only. Test: python3 scripts/test_build_dialogs.py

Quest-goal section: the headings 「## 闯关任务」 and 「## 学习目标」 are treated
as the same section (checklist → tasks + teach pages), so drafts may use either.

「## 资料索引」 list items become a kind=links scroll on the lecturer's last page
(「📜 资料卷轴」); dialog text itself never embeds the URLs.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

SKIP_HEADINGS = {"相关主题", "延伸阅读"}  # 资料索引 → 资料卷轴（见 INDEX_HEADINGS）
# 本关目标（quest goals）：两种写法视为同一节
TASK_HEADINGS = {"闯关任务", "学习目标"}
QUIZ_HEADINGS = {"通关自测", "自测", "练习"}
RESOURCE_HEADINGS = {"建议先收的资料", "参考资料", "资料"}
# 「## 资料索引」：解析为 links 卷轴，挂在对话最后一页的「📜 资料卷轴」按钮上（不把链接写进对话框正文）
INDEX_HEADINGS = {"资料索引"}


def is_task_heading(title: str) -> bool:
    """「闯关任务」/「学习目标」（允许尾随说明，如「学习目标（30 分钟）」）。"""
    t = re.sub(r"\s+", "", title)
    return any(t == h or t.startswith(h + "（") or t.startswith(h + "(") for h in TASK_HEADINGS)


def strip_md_inline(s: str) -> str:
    """Strip MD chrome but KEEP `inline code` backticks for HUD code chips."""
    s = s.strip()
    s = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", s)
    s = re.sub(r"\*\*([^*]+)\*\*", r"\1", s)
    s = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"\1", s)
    s = re.sub(r"^>\s?", "", s)
    # intentionally keep `code` so explore.js can render dlg-code chips
    s = re.sub(r"\s+", " ", s).strip()
    return s


def first_sentence(text: str, max_len: int = 90) -> str:
    text = strip_md_inline(text)
    if not text:
        return ""
    parts = re.split(r"(?<=[。！？!?；;])\s*", text)
    s = parts[0] if parts else text
    if len(s) > max_len:
        cut = s[:max_len]
        for sep in ("，", "、", ",", " "):
            i = cut.rfind(sep)
            if i > 40:
                cut = cut[: i + 1]
                break
        else:
            cut = cut.rstrip("，、, ") + "…"
        return cut
    return s


def split_short_lines(text: str, max_len: int = 72) -> list[str]:
    text = strip_md_inline(text)
    if not text:
        return []
    if len(text) <= max_len:
        return [text]
    parts = [p for p in re.split(r"(?<=[。！？!?])\s*", text) if p]
    if len(parts) >= 2:
        out: list[str] = []
        buf = parts[0]
        for p in parts[1:]:
            if len(buf) + len(p) <= max_len + 10:
                buf += p
            else:
                out.append(buf)
                buf = p
                if len(out) >= 2:
                    break
        if buf and len(out) < 2:
            out.append(first_sentence(buf, max_len))
        return out[:2]
    return [first_sentence(text, max_len)]


def parse_sections(md: str) -> list[dict]:
    lines = md.splitlines()
    if lines and lines[0].strip() == "---":
        for i in range(1, len(lines)):
            if lines[i].strip() == "---":
                lines = lines[i + 1 :]
                break
    sections: list[dict] = []
    cur: dict = {"level": 1, "title": "", "body": []}
    for line in lines:
        hm = re.match(r"^(#{1,3})\s+(.+?)\s*$", line)
        if hm:
            if cur["title"] or cur["body"]:
                sections.append(cur)
            cur = {
                "level": len(hm.group(1)),
                "title": strip_md_inline(hm.group(2)),
                "body": [],
            }
        else:
            cur["body"].append(line)
    if cur["title"] or cur["body"]:
        sections.append(cur)
    return sections


def extract_code_blocks(body: str) -> list[dict]:
    blocks = []
    for m in re.finditer(r"```([\w+-]*)\n(.*?)```", body, re.S):
        lang = (m.group(1) or "").lower()
        code = m.group(2).rstrip("\n")
        if not code.strip() or lang == "mermaid":
            continue
        blocks.append({"lang": lang, "code": code})
    return blocks


def extract_bullets(body: str) -> list[str]:
    bullets = []
    for line in body.splitlines():
        m = re.match(r"^\s*[-*+]\s+(?:\[[ xX]\]\s+)?(.+)$", line)
        if m:
            t = strip_md_inline(m.group(1))
            if t and not t.startswith("<!--"):
                bullets.append(t)
    return bullets


def extract_resource_links(body: str) -> list[dict]:
    """Parse 「## 资料索引」 list items: [title](url) — note.

    Returns [{title, url, note}, ...]. Skips HTML comments and bullets without a link.
    Note keeps the trailing text after an em/en dash or hyphen separator; empty if none.
    """
    items: list[dict] = []
    for line in body.splitlines():
        if "<!--" in line:
            continue
        m = re.match(
            r"^\s*[-*+]\s+\[([^\]]+)\]\(([^)]+)\)\s*(?:[—–\-]\s*(.*))?\s*$",
            line,
        )
        if not m:
            continue
        title = m.group(1).strip()
        url = m.group(2).strip()
        note = (m.group(3) or "").strip()
        if not title or not url:
            continue
        items.append({"title": title, "url": url, "note": note})
    return items


def extract_quiz(body: str) -> list[dict]:
    details_m = re.search(
        r"<details[^>]*>\s*<summary[^>]*>(.*?)</summary>(.*?)</details>",
        body,
        re.S | re.I,
    )
    main = body
    answer_map: dict[int, str] = {}
    if details_m:
        main = body[: details_m.start()]
        ans_body = details_m.group(2)
        for am in re.finditer(
            r"(?m)^\s*(\d+)\.\s*(.+?)(?=(?:\n\s*\d+\.)|\Z)",
            ans_body,
            re.S,
        ):
            num = int(am.group(1))
            ans = strip_md_inline(am.group(2))
            if len(ans) > 160:
                ans = ans[:157].rstrip("，、, ") + "…"
            answer_map[num] = ans

    questions: list[dict] = []
    chunks = re.split(r"(?m)(?=^\s*\d+\.\s+)", main)
    for chunk in chunks:
        qm = re.match(r"^\s*(\d+)\.\s+(.+)$", chunk.lstrip(), re.S)
        if not qm:
            continue
        num = int(qm.group(1))
        rest = qm.group(2).strip()
        lines = rest.splitlines()
        prompt_lines: list[str] = []
        options: list[str] = []
        for i, ln in enumerate(lines):
            om = re.match(r"^\s*[-*]\s+([A-DＡ-Ｄ][\.、．)]\s*.+)$", ln)
            if om and i > 0:
                options.append(strip_md_inline(om.group(1)))
            elif i == 0 or not options:
                if not re.match(r"^\s*[-*]\s+", ln):
                    prompt_lines.append(ln.strip())
        prompt = strip_md_inline(" ".join(prompt_lines))
        if not prompt:
            continue
        questions.append(
            {
                "n": num,
                "ask": prompt,
                "options": options,
                "answer": answer_map.get(num, ""),
            }
        )
    return questions


def quest_id_from_path(rel: Path) -> str:
    parts = rel.parts
    topic = parts[0] if parts else "topic"
    folder = parts[-1] if parts else ""
    m = re.match(r"^(\d+)", folder)
    if m:
        return f"{topic}-{int(m.group(1)):02d}"
    return f"{topic}-{folder}"


def npc_for_quest(qid: str) -> dict:
    table = {
        "java-01": {"id": "teacher-java-01", "sprite": "mentor", "name": "语法导师"},
        "java-02": {"id": "teacher-java-02", "sprite": "lib", "name": "容器馆长"},
        "java-03": {"id": "teacher-java-03", "sprite": "smith", "name": "反射工匠"},
        "java-04": {"id": "teacher-java-04", "sprite": "mentor", "name": "管道导师"},
        "java-05": {"id": "teacher-java-05", "sprite": "guard", "name": "并发守卫"},
        "java-06": {"id": "teacher-java-06", "sprite": "lib", "name": "字节码员"},
        "java-07": {"id": "teacher-java-07", "sprite": "smith", "name": "构建工匠"},
        "java-08": {"id": "teacher-java-08", "sprite": "mentor", "name": "测试导师"},
        "java-09": {"id": "teacher-java-09", "sprite": "lib", "name": "春之向导"},
        "java-10": {"id": "teacher-java-10", "sprite": "smith", "name": "事务守卫"},
        "java-11": {"id": "teacher-java-11", "sprite": "guard", "name": "诊断猎人"},
        "java-12": {"id": "teacher-java-12", "sprite": "mentor", "name": "趋势瞭望"},
    }
    return table.get(qid, {"id": f"teacher-{qid}", "sprite": "mentor", "name": "笔记导师"})


def article_title(sections: list[dict], fallback: str) -> str:
    for s in sections:
        if s["level"] == 1 and s["title"]:
            t = s["title"]
            # Keep CJK title; drop trailing English subtitle if present
            m = re.match(r"^([\u4e00-\u9fff、，。\w]+)", t)
            if m:
                return m.group(1).strip()
            return t.split()[0]
    return fallback


def build_dialog(rel: Path, md: str) -> dict | None:
    sections = parse_sections(md)
    if not sections:
        return None
    qid = quest_id_from_path(rel)
    title = article_title(sections, rel.name)
    npc = npc_for_quest(qid)

    pages: list[dict] = []
    scrolls: dict[str, dict] = {}
    quizzes: list[dict] = []
    tasks: list[str] = []
    index_items: list[dict] = []
    scroll_i = 0

    def add_scroll(
        kind: str,
        title_: str,
        body: str = "",
        lang: str = "",
        items: list | None = None,
    ) -> str:
        nonlocal scroll_i
        scroll_i += 1
        sid = f"s{scroll_i}"
        entry: dict = {
            "id": sid,
            "kind": kind,
            "title": title_,
            "body": body,
            "lang": lang,
        }
        if items is not None:
            entry["items"] = items
        scrolls[sid] = entry
        return sid

    lead_sec = sections[0]
    lead_body = "\n".join(lead_sec["body"]).strip()
    lead_body = re.sub(r"<!--.*?-->", "", lead_body, flags=re.S)
    lead_paras = [
        p.strip()
        for p in re.split(r"\n\s*\n", lead_body)
        if p.strip() and not p.strip().startswith(">")
    ]
    pages.append(
        {
            "type": "teach",
            "expr": "happy",
            "lines": ["欢迎。这里是「" + title + "」。"],
        }
    )
    if lead_paras:
        for ln in split_short_lines(lead_paras[0], 78):
            pages.append({"type": "teach", "expr": "normal", "lines": [ln]})

    for sec in sections[1:]:
        h = sec["title"]
        if not h or h in SKIP_HEADINGS:
            continue
        body = "\n".join(sec["body"])
        body = re.sub(r"<!--.*?-->", "", body, flags=re.S)
        codes = extract_code_blocks(body)
        body_nofence = re.sub(r"```[\w+-]*\n.*?```", "", body, flags=re.S)

        if is_task_heading(h):
            bullets = extract_bullets(body_nofence)
            tasks.extend(bullets)
            pages.append(
                {
                    "type": "teach",
                    "expr": "happy",
                    "lines": ["先看本关闯关任务——做到这些就算通关。"],
                }
            )
            for b in bullets:
                for ln in split_short_lines(b, 78)[:1]:
                    pages.append({"type": "teach", "expr": "normal", "lines": [ln]})
            for line in body_nofence.splitlines():
                if "奖励" in line or "XP" in line:
                    pages.append(
                        {
                            "type": "teach",
                            "expr": "happy",
                            "lines": [strip_md_inline(re.sub(r"^[#\s]+", "", line).strip())],
                        }
                    )
                    break
            continue

        if h in QUIZ_HEADINGS:
            intro_cand = next(
                (
                    p.strip()
                    for p in re.split(r"\n\s*\n", body_nofence)
                    if p.strip()
                    and not re.match(r"^\s*\d+\.", p.strip())
                    and "<details" not in p
                ),
                "先独立作答，再核对参考答案。",
            )
            pages.append(
                {
                    "type": "teach",
                    "expr": "normal",
                    "lines": [first_sentence(intro_cand, 80)],
                }
            )
            for q in extract_quiz(body):
                quizzes.append(
                    {
                        "n": q["n"],
                        "ask": split_short_lines(q["ask"], 78),
                        "options": q["options"],
                        "answer": q["answer"],
                    }
                )
            continue

        if h in INDEX_HEADINGS:
            # Collect for the final-page 「📜 资料卷轴」; do not emit dialog lines or inline links.
            index_items = extract_resource_links(body_nofence)
            continue

        if h in RESOURCE_HEADINGS:
            bullets = extract_bullets(body_nofence)
            if bullets:
                sid = add_scroll(
                    "list", h, "\n".join("· " + b for b in bullets)
                )
                pages.append(
                    {
                        "type": "teach",
                        "expr": "normal",
                        "lines": ["这些资料值得先收进背包。"],
                        "scroll": sid,
                    }
                )
            continue

        pages.append(
            {"type": "teach", "expr": "happy", "lines": ["【" + h + "】"]}
        )
        bullets = extract_bullets(body_nofence)
        if bullets:
            for b in bullets[:6]:
                pages.append({"type": "teach", "expr": "normal", "lines": [b]})
        else:
            paras = [
                p.strip()
                for p in re.split(r"\n\s*\n", body_nofence)
                if p.strip() and not p.strip().startswith("|")
            ]
            if paras:
                for ln in split_short_lines(paras[0], 78):
                    pages.append({"type": "teach", "expr": "normal", "lines": [ln]})

        for code in codes:
            sid = add_scroll("code", h or "示例", code["code"], code["lang"])
            pages.append(
                {
                    "type": "teach",
                    "expr": "normal",
                    "lines": ["这段写法展开卷轴看更清楚。"],
                    "scroll": sid,
                }
            )

    for q in quizzes:
        pages.append(
            {
                "type": "quiz",
                "expr": "normal",
                "n": q["n"],
                "lines": q["ask"],
                "options": q["options"],
                "answer": q["answer"],
            }
        )

    pages.append(
        {
            "type": "choice",
            "expr": "happy",
            "lines": ["学完了？核对过自测就可以记一笔通关。"],
            "choices": [
                {"id": "finish", "label": "✓ 完成本关"},
                {"id": "article", "label": "📖 读原文"},
                {"id": "leave", "label": "先离开"},
            ],
        }
    )

    if index_items:
        plain = "\n".join(
            "· " + it["title"] + ((" — " + it["note"]) if it["note"] else "")
            for it in index_items
        )
        sid = add_scroll("links", "资料索引", body=plain, items=index_items)
        # 讲师最后一页（完关 choice）挂「📜 资料卷轴」；对话框正文不放链接
        pages[-1]["scroll"] = sid

    xp, badge = 100, ""
    m = re.search(r"\+(\d+)\s*XP", md)
    if m:
        xp = int(m.group(1))
    bm = re.search(r"徽章「([^」]+)」", md)
    if bm:
        badge = bm.group(1)

    return {
        "id": qid,
        "title": title,
        "path": "topics/" + str(rel).replace("\\", "/") + "/README.md",
        "article": "topics/" + str(rel).replace("\\", "/") + "/",
        "xp": xp,
        "badge": badge,
        "npc": npc,
        "tasks": tasks,
        "scrolls": scrolls,
        "pages": pages,
    }


def find_articles(
    topics: Path, only: list[str] | None, only_topics: list[str] | None = None
) -> list[Path]:
    if only_topics:
        out = []
        for t in only_topics:
            out.extend(sorted((topics / t).glob("*/README.md")))
        return out
    if only:
        out = []
        for o in only:
            p = topics / o / "README.md"
            if not p.is_file():
                print("WARN: missing", p, file=sys.stderr)
                continue
            out.append(p)
        return out
    return sorted(topics.glob("*/*/README.md")) + sorted(
        (p for p in topics.glob("*/README.md") if p.parent.name != "topics")
    )


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--topics", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument(
        "--only",
        default="",
        help="comma-separated relative dirs under topics/",
    )
    ap.add_argument(
        "--only-topic",
        default="",
        help="comma-separated topic dirs (e.g. java); all their numbered sub-articles",
    )
    args = ap.parse_args()
    only = [x.strip() for x in args.only.split(",") if x.strip()] or None
    only_topics = [x.strip() for x in args.only_topic.split(",") if x.strip()] or None
    articles = find_articles(args.topics, only, only_topics)
    if not articles:
        print("No articles found", file=sys.stderr)
        return 1

    dialogs: dict[str, dict] = {}
    for readme in articles:
        rel = readme.parent.relative_to(args.topics)
        md = readme.read_text(encoding="utf-8")
        d = build_dialog(rel, md)
        if d:
            dialogs[d["id"]] = d
            print(
                f"  {d['id']}: {len(d['pages'])} pages, "
                f"{sum(1 for p in d['pages'] if p['type']=='quiz')} quiz, "
                f"{len(d['scrolls'])} scrolls"
            )

    args.out.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "version": 1,
        "source": "topics/**/README.md",
        "note": "Generated by scripts/build_dialogs.py at build time — do not edit by hand.",
        "dialogs": dialogs,
    }
    body = (
        "/* generated by scripts/build_dialogs.py — static, no fetch */\n"
        "window.TN_DIALOGS = "
        + json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        + ";\n"
    )
    args.out.write_text(body, encoding="utf-8")
    print(f"Wrote {args.out} ({len(dialogs)} dialogs)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
