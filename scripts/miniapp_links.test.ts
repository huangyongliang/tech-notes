import assert from "node:assert/strict";
import { resolveDocId } from "../miniprogram/utils/links.ts";

assert.equal(
  resolveDocId("java/05-concurrency", "../04-io-nio/"),
  "java/04-io-nio",
);
assert.equal(
  resolveDocId("java/05-concurrency", "../"),
  "java",
);
assert.equal(
  resolveDocId(
    "programming-basics/01-first-language-c",
    "../../cs-basics/01-computer-organization/",
  ),
  "cs-basics/01-computer-organization",
);
assert.equal(resolveDocId("getting-started", "../roadmap/"), "roadmap");
assert.equal(resolveDocId("java/05-concurrency", "https://example.com/a"), null);
assert.equal(resolveDocId("java/05-concurrency", "#h-1"), null);
assert.equal(resolveDocId("programming-basics", "../ai/00-python-bridge/"), "ai/00-python-bridge");

console.log("links ok");
