import assert from "node:assert/strict";
import type { Block } from "../miniprogram/data/types.ts";
import { proseFromBlocks, queryDocs, snippetRuns } from "../miniprogram/utils/search.ts";

const prose = proseFromBlocks([
  { t: "p", inlines: [{ t: "text", v: "正文里的虚拟线程" }] },
  { t: "code", lang: "java", code: "秘密代码标记 CODETOKEN" },
  {
    t: "fold",
    blocks: [{ t: "p", inlines: [{ t: "text", v: "参考答案标记 ANSWERTOKEN" }] }],
  },
  {
    t: "callout",
    kind: "note",
    blocks: [{ t: "p", inlines: [{ t: "text", v: "注里的 pinning" }] }],
  },
] as Block[]);

assert.equal(prose.includes("虚拟线程"), true);
assert.equal(prose.includes("CODETOKEN"), false);
assert.equal(prose.includes("ANSWERTOKEN"), false);
assert.equal(prose.includes("pinning"), true);

const quizProse = proseFromBlocks([
  {
    t: "ol",
    items: [
      {
        n: 1,
        inlines: [{ t: "text", v: "题干" }],
        blocks: [{ t: "ul", items: [{ inlines: [{ t: "text", v: "A. 寄存器" }] }] }],
      },
    ],
  },
] as Block[]);
assert.equal(quizProse.includes("题干"), true);
assert.equal(quizProse.includes("寄存器"), true);

const hits = queryDocs(
  [
    {
      id: "body",
      kind: "chapter",
      topicId: "java",
      title: "集合 Collections",
      titleText: "集合\ncollections",
      bodyText: "虚拟线程在正文",
      where: "Java 技术栈 / 02",
      prose: "这里提到虚拟线程的用法说明，后面还有很多字用来撑开摘要窗口。",
    },
    {
      id: "title",
      kind: "chapter",
      topicId: "java",
      title: "虚拟线程 Virtual Threads",
      titleText: "虚拟线程\nvirtual threads",
      bodyText: "别的内容",
      where: "Java 技术栈 / 12",
      prose: "开篇介绍",
    },
  ],
  "虚拟线程",
);
assert.deepEqual(
  hits.map((hit) => hit.id),
  ["title", "body"],
);
assert.equal(
  hits[0].titleRuns.some((run) => run.mark && run.text === "虚拟线程"),
  true,
);
assert.equal(
  hits[1].snippetRuns.some((run) => run.mark && run.text === "虚拟线程"),
  true,
);

const codeOnly = queryDocs(
  [
    {
      id: "c",
      kind: "chapter",
      topicId: "java",
      title: "输入输出 IO",
      titleText: "输入输出\nio",
      bodyText: "codetoken in fence",
      where: "Java 技术栈 / 04",
      prose: "只有普通说明没有那个词",
    },
  ],
  "codetoken",
);
assert.equal(codeOnly.length, 1);
assert.equal(
  codeOnly[0].snippetRuns.some((run) => run.mark),
  false,
);
assert.equal(codeOnly[0].snippetRuns.map((run) => run.text).join("").includes("codetoken"), false);

const window = snippetRuns(`前${"啊".repeat(30)}关键词后${"呀".repeat(30)}`, "关键词");
const flat = window.map((run) => run.text).join("");
assert.equal(flat.startsWith("…"), true);
assert.equal(flat.endsWith("…"), true);
assert.equal(flat.includes("关键词"), true);
const mark = window.find((run) => run.mark);
assert.equal(mark && mark.text, "关键词");
const before = flat.slice(1, flat.indexOf("关键词"));
const after = flat.slice(flat.indexOf("关键词") + "关键词".length, -1);
assert.equal(before.length, 20);
assert.equal(after.length, 20);

assert.equal(queryDocs([], "  ").length, 0);

console.log("search ok");
