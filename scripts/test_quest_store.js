#!/usr/bin/env node
/* Offline test for tn-quest-v2 load()/migration in website/javascripts/quest.js.
 * Usage: node scripts/test_quest_store.js   (no deps, no network) */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
var root = path.join(__dirname, "..", "website", "javascripts");
var dataSrc = fs.readFileSync(path.join(root, "quest-data.js"), "utf8");
var questSrc = fs.readFileSync(path.join(root, "quest.js"), "utf8");

function makeEnv(initial) {
  var store = Object.assign({}, initial || {});
  var ls = {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; }
  };
  var win = {
    localStorage: ls,
    location: { pathname: "/", search: "", origin: "http://x" },
    document: { addEventListener: function () {}, querySelector: function () { return null; }, querySelectorAll: function () { return []; } },
    CustomEvent: function () {}, dispatchEvent: function () {}, URL: URL
  };
  win.window = win;
  var ctx = vm.createContext(win);
  vm.runInContext(dataSrc, ctx);
  vm.runInContext(questSrc, ctx);
  return { api: win.TN_QUEST_MIGRATE_, store: store };
}
function makeEnvWithThrowingStorage() {
  var boom = function () { throw new Error("SecurityError"); };
  var win = { localStorage: { getItem: boom, setItem: boom, removeItem: boom },
    location: { pathname: "/", search: "", origin: "http://x" },
    document: { addEventListener: function () {}, querySelector: function () { return null; }, querySelectorAll: function () { return []; } },
    CustomEvent: function () {}, dispatchEvent: function () {}, URL: URL };
  win.window = win;
  var ctx = vm.createContext(win);
  vm.runInContext(dataSrc, ctx); vm.runInContext(questSrc, ctx);
  return win.TN_QUEST_MIGRATE_;
}
function plain(o) { return JSON.parse(JSON.stringify(o)); }

var V1 = JSON.stringify({ done: { "01": true, "02": true, b1: true, bogus: true }, tasks: { "01-0": true, "b1-2": true } });
var V1_EXPECT = { version: 2, done: { "java-01": true, "java-02": true, "java-b1": true }, tasks: { "java-01-0": true, "java-b1-2": true } };
var EMPTY = { version: 2, done: {}, tasks: {} };
var VALID_V2 = JSON.stringify({ version: 2, done: { "java-05": true }, tasks: { "java-05-1": true } });

var cases = [
  ["no data", {}, EMPTY, function (st) { assert.ok(!("tn-quest-v2" in st)); }],
  ["v1 only", { "tn-quest-v1": V1 }, V1_EXPECT, function (st) {
    assert.deepStrictEqual(JSON.parse(st["tn-quest-v2"]), V1_EXPECT); assert.strictEqual(st["tn-quest-v1"], V1); }],
  ["valid v2 (v1 ignored)", { "tn-quest-v2": VALID_V2, "tn-quest-v1": V1 }, JSON.parse(VALID_V2), function (st) {
    assert.strictEqual(st["tn-quest-v2"], VALID_V2); }],
  ["corrupt v2 + valid v1", { "tn-quest-v2": "{not json", "tn-quest-v1": V1 }, V1_EXPECT, function (st) {
    assert.deepStrictEqual(JSON.parse(st["tn-quest-v2"]), V1_EXPECT); }],
  ["non-object v2 + valid v1", { "tn-quest-v2": "[1,2]", "tn-quest-v1": V1 }, V1_EXPECT, null],
  ["corrupt v2 + no v1", { "tn-quest-v2": "{not json" }, EMPTY, function (st) { assert.strictEqual(st["tn-quest-v2"], "{not json"); }],
  ["corrupt v2 + corrupt v1", { "tn-quest-v2": "%%", "tn-quest-v1": "%%" }, EMPTY, null]
];

var fails = 0;
cases.forEach(function (c) {
  try {
    var env = makeEnv(c[1]);
    var first = plain(env.api.load());
    assert.deepStrictEqual(first, c[2]);
    if (c[3]) c[3](env.store);
    var snap = JSON.stringify(env.store);
    for (var i = 0; i < 3; i++) assert.deepStrictEqual(plain(env.api.load()), first, "repeat run " + i);
    assert.strictEqual(JSON.stringify(env.store), snap, "storage unchanged on repeat runs");
    /* a fresh page load over the resulting storage gives the same answer (idempotent) */
    assert.deepStrictEqual(plain(makeEnv(env.store).api.load()), first, "fresh reload");
    console.log("ok   - " + c[0]);
  } catch (e) { fails++; console.log("FAIL - " + c[0] + ": " + e.message); }
});
/* localStorage throwing (privacy mode / quota) must never throw out of load() */
try {
  var win2 = makeEnvWithThrowingStorage();
  assert.deepStrictEqual(plain(win2.load()), EMPTY);
  console.log("ok   - load() never throws when localStorage throws");
} catch (e) { fails++; console.log("FAIL - load() threw: " + e.message); }
console.log(fails ? fails + " failed" : "all " + (cases.length + 1) + " passed");
process.exit(fails ? 1 : 0);
