import assert from "node:assert/strict";
import {
  XP_PER_CHAPTER,
  applyToggle,
  badgeName,
  clearHint,
  parseCleared,
  progressView,
  toggleCleared,
} from "../miniprogram/utils/progress.ts";

const chapter = "java/05-concurrency";
const other = "java/04-io-nio";
const allowed = new Set([chapter, other]);

assert.equal(XP_PER_CHAPTER, 100);
assert.deepEqual(parseCleared(undefined), []);
assert.deepEqual(parseCleared(""), []);
assert.deepEqual(parseCleared([]), []);
assert.deepEqual(parseCleared([chapter]), []);
assert.deepEqual(parseCleared({ cleared: "nope" }), []);
assert.deepEqual(parseCleared({ cleared: [chapter, chapter, "", 1, other] }), [chapter, other]);

assert.deepEqual(toggleCleared([chapter], other), [chapter, other]);
assert.deepEqual(toggleCleared([chapter, other], chapter), [other]);
assert.deepEqual(toggleCleared([chapter], ""), [chapter]);

assert.deepEqual(applyToggle(undefined, "roadmap", allowed), { cleared: [] });
assert.deepEqual(applyToggle(undefined, "java", allowed), { cleared: [] });
assert.deepEqual(applyToggle({ cleared: ["roadmap", chapter] }, "java", allowed), {
  cleared: [chapter],
});

const marked = applyToggle(undefined, chapter, allowed);
assert.deepEqual(marked, { cleared: [chapter] });
const relaunch = JSON.parse(JSON.stringify(marked)) as unknown;
assert.deepEqual(parseCleared(relaunch), [chapter]);
const both = applyToggle(relaunch, other, allowed);
assert.deepEqual(both, { cleared: [chapter, other] });
const undone = applyToggle(JSON.parse(JSON.stringify(both)), chapter, allowed);
assert.deepEqual(undone, { cleared: [other] });

const none = progressView([], allowed, chapter);
assert.equal(none.count, 0);
assert.equal(none.xp, 0);
assert.equal(none.xpLabel, "0 XP");
assert.equal(none.badge, "未出发");
assert.equal(none.badgeLine, "未出发 · 还没有通关");
assert.equal(none.checked, false);

const one = progressView([chapter, "roadmap", "java"], allowed, chapter);
assert.equal(one.count, 1);
assert.equal(one.xp, 100);
assert.equal(one.xpLabel, "100 XP");
assert.equal(one.badge, "开了个头");
assert.equal(one.badgeLine, "开了个头 · 已通关 1 章");
assert.equal(one.checked, true);
assert.equal(progressView([chapter], allowed, "roadmap").checked, false);

assert.equal(clearHint(false), "+100 XP");
assert.equal(clearHint(true), "已记 100 XP");

const many = new Set(Array.from({ length: 30 }, (_, index) => `c${index}`));
const ids = [...many];
assert.equal(badgeName(9, 30), "开了个头");
assert.equal(badgeName(10, 30), "在路上");
assert.equal(badgeName(19, 30), "在路上");
assert.equal(badgeName(20, 30), "熟路");
assert.equal(progressView(ids.slice(0, 29), many).badge, "熟路");
assert.equal(progressView(ids.slice(0, 29), many).xp, 2900);

const all = progressView(ids, many, "c0");
assert.equal(all.count, 30);
assert.equal(all.xp, 3000);
assert.equal(all.xpLabel, "3000 XP");
assert.equal(all.badge, "路线通关");
assert.equal(all.badgeLine, "路线通关 · 已通关 30 章");
assert.equal(all.checked, true);
assert.equal(badgeName(12, 12), "路线通关");
assert.equal(badgeName(0, 0), "未出发");

console.log("progress ok");
