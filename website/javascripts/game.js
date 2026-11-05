/* tech-notes · 游戏模式「知识世界」（移植自 tn-ui/hud 原型 explore.js）
 *
 * - 首页（.tn2-hero 存在）+ 游戏模式：开始画面 → 知识世界地图（盖在 Material 首页之上）
 * - 其它页 + 游戏模式：顶部瘦 HUD（头像 / Lv / 冒险者 / ← 回知识世界）
 * - 阅读模式：右下角 🎮 浮动按钮切回游戏模式
 * - 关卡、章节、XP、徽章只来自 quest-data.js；进度只经 window.TN_QUEST（tn-quest-v2）读写
 * - NPC 对话来自构建期生成的 dialogs.js（scripts/build_dialogs.py）
 * - 挂载：document$.subscribe（Material 即时导航），无 document$ 时退回 DOMContentLoaded；
 *   幂等（重复调用只刷新），切页 / 切模式时 teardown（移除节点、AbortController 解绑、取消 rAF）
 * - 不发任何网络请求；不覆盖主题模板
 */
(function () {
  "use strict";

  var W = 2800, H = 1600;
  var LAYOUT = {
    "java-01": { x: 180, y: 320 }, "java-02": { x: 380, y: 270 }, "java-03": { x: 580, y: 340 }, "java-04": { x: 780, y: 270 },
    "java-b1": { x: 980, y: 340 },
    "java-05": { x: 1480, y: 320 }, "java-06": { x: 1680, y: 270 }, "java-07": { x: 1880, y: 340 }, "java-08": { x: 2080, y: 270 },
    "java-b2": { x: 2280, y: 340 },
    "java-09": { x: 220, y: 920 }, "java-10": { x: 480, y: 980 }, "java-11": { x: 740, y: 920 }, "java-12": { x: 1000, y: 980 },
    "java-b3": { x: 1280, y: 920 }
  };
  var PATH_SEGMENTS = [
    ["java-01", "java-02"], ["java-02", "java-03"], ["java-03", "java-04"], ["java-04", "java-b1"],
    ["java-b1", { x: 1120, y: 320 }, { x: 1230, y: 320 }, "java-05"],
    ["java-05", "java-06"], ["java-06", "java-07"], ["java-07", "java-08"], ["java-08", "java-b2"],
    ["java-b2", { x: 2280, y: 520 }, { x: 2280, y: 700 }, { x: 1280, y: 700 }, { x: 220, y: 700 }, "java-09"],
    ["java-09", "java-10"], ["java-10", "java-11"], ["java-11", "java-12"], ["java-12", "java-b3"]
  ];
  /* 「基础」大陆：节点占位（无关卡数据，只显示「建设中」） */
  var BASICS_SLOTS = [{ x: 370, y: 540 }, { x: 440, y: 575 }, { x: 510, y: 540 }];
  var ROMAN = ["I", "II", "III", "IV", "V"];
  var CN = "一二三四五";
  var SESSION_KEY = "tn-game-started";

  var inst = null;     /* 世界实例（只在首页） */
  var slim = null;     /* 文章页瘦 HUD */
  var fab = null;      /* 阅读模式 🎮 */

  function api() { return window.TN_QUEST || null; }
  function mode() {
    var m = document.documentElement.getAttribute("data-tn-mode");
    return m === "read" ? "read" : m === "game" ? "game" : (window.TN_MODE ? TN_MODE.get() : "game");
  }
  function setMode(m) { if (window.TN_MODE) TN_MODE.set(m); else sync(); }
  function isHome() { return !!document.querySelector(".md-content__inner .tn2-hero"); }
  function reduceMotion() { return !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function siteRoot() {
    var a = document.querySelector(".md-header__button.md-logo");
    return a ? a.href : new URL("./", location.href).href;
  }
  function portrait(sprite, expr) {
    var C = window.TN_CHIBI, S = window.TN_CHIBI_SVG || {};
    if (C && C.portrait) return C.portrait(sprite || "mentor", expr || "normal");
    return S[sprite] || S.mentor || "";
  }
  function sprite(key) { var S = window.TN_CHIBI_SVG || {}; return S[key] || S.mentor || ""; }
  function bossSprite(ch) {
    var C = window.TN_CHIBI;
    if (C && typeof C["boss" + ch] === "function") return C["boss" + ch]();
    return sprite("boss" + ch) || sprite("boss");
  }
  function hudLevel() {
    var A = api(); if (!A) return { lv: 1, pct: 0, title: "" };
    var t = A.stats(A.load()), L = A.levels;
    var lo = L[t.lv - 1] || 0, hi = t.next != null ? t.next : t.max;
    var pct = t.next == null ? 100 : Math.max(0, Math.min(100, (t.xp - lo) / Math.max(1, hi - lo) * 100));
    return { lv: t.lv, pct: pct, title: t.xp + " / " + (t.next != null ? t.next : t.max) + " XP" };
  }
  function hudInner() {
    var h = hudLevel();
    return '<div class="hud__face" aria-hidden="true">' + portrait("player", "normal") + '</div>' +
      '<div class="hud__meta"><div class="hud__row"><span class="hud__lv">Lv.' + h.lv + '</span>' +
      '<span class="hud__n">冒险者</span></div>' +
      '<div class="hud__xp" title="' + esc(h.title) + '"><div class="hud__bar"><i style="width:' + h.pct.toFixed(1) + '%"></i></div></div></div>';
  }

  /* ================= 世界（首页） ================= */
  function mountWorld() {
    var A = api(), QD = window.TN_QUEST_DATA;
    if (!A || !QD) return null;
    var TOPIC = A.topic, Q = TOPIC.quests, BOSS = TOPIC.bosses, CH = TOPIC.chapters;
    var DIALOGS = (window.TN_DIALOGS && window.TN_DIALOGS.dialogs) || {};
    var ac = new AbortController(), sig = { signal: ac.signal };
    var timers = [], raf = 0;
    var reduce = reduceMotion();

    /* ---- 关卡（名称 / XP / 徽章只来自 quest-data） ---- */
    var LEVELS = [], byId = {};
    Q.forEach(function (q, i) {
      var p = LAYOUT[q.id]; if (!p) return;
      LEVELS.push({ id: q.id, i: i, num: A.shortId(q.id), name: q.name, chapter: q.chapter, xp: q.xp, badge: q.badge, path: q.path, goal: q.goal, boss: false, x: p.x, y: p.y });
    });
    BOSS.forEach(function (b) {
      var p = LAYOUT[b.id]; if (!p) return;
      LEVELS.push({ id: b.id, b: b, num: "B" + b.chapter, name: b.name, chapter: b.chapter, xp: b.xp, badge: b.badge, boss: true, x: p.x, y: p.y,
        goal: "综合检验第" + CN[b.chapter - 1] + "章「" + CH[b.chapter - 1] + "」。题目建设中；本章关卡全通后可在此标记通过。" });
    });
    LEVELS.forEach(function (l) { byId[l.id] = l; });
    var EDGES = [];
    PATH_SEGMENTS.forEach(function (seg) { if (typeof seg[0] === "string" && typeof seg[seg.length - 1] === "string") EDGES.push([seg[0], seg[seg.length - 1]]); });

    /* ---- NPC：每关一位守护导师（来自 dialogs.js），外加门卫与流浪猫 ---- */
    var NPCS = [];
    Q.forEach(function (q) {
      var d = DIALOGS[q.id], p = LAYOUT[q.id];
      if (!d || !p) return;
      NPCS.push({ id: d.npc.id, questId: q.id, region: q.chapter, x: p.x + 72, y: p.y - 48, sprite: d.npc.sprite, name: d.npc.name, teach: true });
    });
    var b1 = BOSS[0], b2 = BOSS[1];
    NPCS.push({ id: "guard", region: 1, x: 1120, y: 360, sprite: "guard", name: "门卫", lines: [
      "站住。河那边是第二章「" + CH[1] + "」。",
      "通关第一章全部关卡并在「CH.1 BOSS · " + (b1 ? b1.name : "") + "」标记通过后，迷雾才会散。"
    ] });
    NPCS.push({ id: "cat", region: 1, x: 280, y: 430, sprite: "cat", name: "流浪猫", lines: [
      "喵。进度存在本浏览器的 " + A.KEY_V2 + "，阅读模式和游戏模式共用。",
      "想看完整文章？菜单里有「📖 阅读模式」。"
    ] });

    /* ---- DOM ---- */
    var root = document.createElement("div");
    root.className = "tn-g tn-game-root";
    root.setAttribute("data-tn-game", "world");
    var signs = CH.slice(0, 3).map(function (c, i) {
      return '<div class="signpost signpost--' + (i + 1) + '" data-ch="' + (i + 1) + '">' +
        '<div class="signpost__board"><span class="signpost__ico" aria-hidden="true">⚑</span><span class="signpost__num">' + ROMAN[i] + '</span></div>' +
        '<div class="signpost__full">CHAPTER ' + ROMAN[i] + ' · ' + esc(c) + '</div><div class="signpost__pole"></div></div>';
    }).join("");
    var fog2Msg = "第二章「" + esc(CH[1]) + "」· 通关 CH.1 BOSS 后解锁";
    var fog3Msg = "第三章「" + esc(CH[2]) + "」· 通关 CH.2 BOSS 后解锁";
    var basics = BASICS_SLOTS.map(function (p) {
      return '<div class="node is-lock tn-g-ph" style="left:' + p.x + 'px;top:' + p.y + 'px" title="建设中" aria-hidden="true"><div class="node__body"><span class="node__num">·</span></div></div>';
    }).join("");
    root.innerHTML =
      '<div class="start" data-r="start" role="dialog" aria-modal="true" aria-label="知识世界" hidden>' +
        '<div class="start__card"><div class="start__logo" aria-hidden="true">TN</div>' +
        '<h1 class="start__title">知识世界</h1><p class="start__sub">tech-notes · 角色探索</p>' +
        '<div class="start__hero" data-r="hero" aria-hidden="true"></div>' +
        '<button type="button" class="start__go" id="btnStart">开始冒险</button>' +
        '<button type="button" class="start__link" id="btnReadFromStart">只想看文章 → 阅读模式</button></div></div>' +
      '<div class="hint hint--keys" data-r="hint" aria-hidden="true"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><span class="hint__dot"></span><kbd>⏎</kbd><span class="hint__dot"></span><kbd>Esc</kbd></div>' +
      '<button type="button" class="game-menu-btn" data-r="menuBtn" title="菜单" aria-label="菜单" aria-expanded="false">☰</button>' +
      '<nav class="game-menu" data-r="menu" aria-label="游戏菜单" hidden>' +
        '<button type="button" data-act="map">🗺 地图</button><button type="button" data-act="inv">🎒 背包</button>' +
        '<button type="button" data-act="ach">🏅 成就</button><button type="button" data-act="settings">⚙ 设置</button>' +
        '<button type="button" data-act="read">📖 阅读模式</button></nav>' +
      '<div class="viewport" data-r="viewport" tabindex="0" aria-label="知识世界地图（WASD / 方向键移动，Enter 对话，Tab 选关卡）">' +
        '<div class="world" data-r="world">' +
          '<div class="land land--village" aria-hidden="true"><div class="land__soil"></div><span class="land__tag">新手村</span></div>' +
          '<div class="land land--basics is-placeholder" aria-hidden="true"><div class="land__soil"></div><span class="land__tag">基础 · 建设中</span></div>' +
          '<div class="land land--java" aria-hidden="true"><div class="land__soil"></div><span class="land__tag">Java</span></div>' +
          '<div class="land land--ai is-locked" aria-hidden="true"><div class="land__soil"></div><div class="land__fog"></div><span class="land__lock" title="未解锁">🔒</span><span class="land__tag">AI · 未开放</span></div>' +
          '<div class="region region--1" aria-hidden="true"></div><div class="region region--2" aria-hidden="true"></div><div class="region region--3" aria-hidden="true"></div>' +
          signs +
          '<div class="river water-shimmer" aria-hidden="true"></div><div class="bridge" aria-hidden="true"></div>' +
          '<div class="bridge-flag" style="left:1225px;top:272px" aria-hidden="true"><i></i></div>' +
          '<svg class="path-svg" data-r="path" width="' + W + '" height="' + H + '" aria-hidden="true"></svg>' +
          basics +
          '<div class="fog fog--2" data-r="fog2" data-msg="' + fog2Msg + '" role="img" aria-label="' + fog2Msg + '" tabindex="0"><div class="fog-base"></div><div class="fog-plate"><div class="fog-plate__lock" aria-hidden="true">🔒</div><div class="fog-plate__h">' + fog2Msg + '</div></div></div>' +
          '<div class="fog fog--3" data-r="fog3" data-msg="' + fog3Msg + '" role="img" aria-label="' + fog3Msg + '" tabindex="0"><div class="fog-base"></div><div class="fog-plate"><div class="fog-plate__lock" aria-hidden="true">🔒</div><div class="fog-plate__h">' + fog3Msg + '</div></div></div>' +
          '<div class="player" data-r="player" aria-hidden="true"></div>' +
          '<div class="qcard" data-r="qcard" role="dialog" aria-label="关卡信息"></div>' +
        '</div></div>' +
      '<aside class="hud" data-r="hud" aria-label="状态"></aside>' +
      '<div class="hud-tools"><button class="iconbtn" type="button" data-r="btnLog" title="冒险日志 (L)" aria-label="冒险日志">📜</button>' +
        '<button class="iconbtn" type="button" data-r="btnInv" title="背包 (I)" aria-label="背包">🎒</button>' +
        '<button class="iconbtn" type="button" data-r="btnChar" title="角色 (C)" aria-label="角色">🧙</button></div>' +
      '<div class="dpad" aria-label="虚拟方向键"><button type="button" class="u" data-dir="u" aria-label="上">▲</button><button type="button" class="l" data-dir="l" aria-label="左">◀</button><button type="button" class="r" data-dir="r" aria-label="右">▶</button><button type="button" class="d" data-dir="d" aria-label="下">▼</button></div>' +
      '<div class="fog-msg" data-r="fogMsg" role="status"></div>' +
      '<div class="overlay" data-r="overlay"><div class="panel" data-r="panel" tabindex="-1" role="dialog"></div></div>' +
      '<div class="dialog" data-r="dialog" role="dialog" aria-modal="true" aria-label="对话" hidden>' +
        '<div class="dialog__face" data-r="face" aria-hidden="true"></div><div class="dialog__body">' +
        '<div class="dialog__meta"><span class="dialog__who" data-r="who"></span><span class="dialog__dots" data-r="dots" aria-hidden="true"></span></div>' +
        '<div class="dialog__text" data-r="text" aria-live="polite"></div>' +
        '<div class="dialog__quiz" data-r="quiz" hidden></div>' +
        '<div class="dialog__scroll-btn-wrap" data-r="scrollWrap" hidden><button type="button" class="dialog__scroll-btn" data-r="btnScroll">📜 展开卷轴</button></div>' +
        '<div class="dialog__nav"><button type="button" class="dialog__nav-btn" data-r="back" title="上一页" aria-label="上一页">◀</button>' +
        '<button type="button" class="dialog__nav-btn" data-r="next" title="下一页" aria-label="下一页">▶</button>' +
        '<button type="button" class="dialog__esc" data-r="esc" title="离开 (Esc)">Esc</button></div>' +
        '<div class="dialog__choices" data-r="choices"></div></div></div>' +
      '<div class="scroll-panel" data-r="scroll" role="dialog" aria-modal="true" aria-label="卷轴" hidden><div class="scroll-panel__inner">' +
        '<div class="scroll-panel__head"><span data-r="scrollTitle">卷轴</span><button type="button" class="scroll-panel__close" data-r="scrollClose" aria-label="关闭">✕</button></div>' +
        '<pre class="scroll-panel__body" data-r="scrollBody"></pre></div></div>' +
      '<div class="toast" data-r="toast" role="status" aria-live="polite"></div>';

    var R = {};
    root.querySelectorAll("[data-r]").forEach(function (el) { R[el.getAttribute("data-r")] = el; });
    R.btnStart = root.querySelector("#btnStart");
    R.btnRead = root.querySelector("#btnReadFromStart");
    document.body.appendChild(root);
    document.body.classList.add("tn-world-on");

    /* ---- 状态 ---- */
    var S = { s: A.load(), pos: { x: 0, y: 0 }, moving: false, dialogOpen: false, nearNpc: null, nearNode: null,
      teach: null, flavor: null, keys: {}, panel: null };

    function stOf(lv) {
      if (lv.boss) return A.bossState(S.s, lv.b);
      return A.state(S.s, lv.i);
    }
    function fogged(ch) {
      if (ch === 2) return !S.s.done[(BOSS[0] || {}).id];
      if (ch === 3) return !S.s.done[(BOSS[1] || {}).id];
      return false;
    }
    function startPos() {
      var c = A.current(S.s), lv;
      if (c >= 0) lv = byId[Q[c].id];
      if (!lv || fogged(lv.chapter)) {
        /* 当前关在迷雾后（章 BOSS 未标记）→ 站到对应 BOSS 前 */
        for (var i = 0; i < BOSS.length; i++) if (!S.s.done[BOSS[i].id]) { lv = byId[BOSS[i].id]; break; }
      }
      lv = lv || byId[(BOSS[BOSS.length - 1] || {}).id] || LEVELS[0];
      return { x: lv.x, y: lv.y + 55 };
    }
    S.pos = startPos();

    /* ---- 渲染 ---- */
    function pt(r) { return typeof r === "string" ? byId[r] : r; }
    function renderPath() {
      var d = "";
      PATH_SEGMENTS.forEach(function (seg) {
        var p = seg.map(pt); if (p.some(function (x) { return !x; })) return;
        d += "M " + p[0].x + " " + p[0].y;
        for (var i = 1; i < p.length; i++) d += " L " + p[i].x + " " + p[i].y;
      });
      R.path.innerHTML = '<path class="path-line" d="' + d + '" fill="none"/>';
    }
    function renderNodes() {
      R.world.querySelectorAll(".node:not(.tn-g-ph)").forEach(function (n) { n.remove(); });
      LEVELS.forEach(function (lv) {
        var st = stOf(lv), el = document.createElement("button");
        el.type = "button";
        el.style.left = lv.x + "px"; el.style.top = lv.y + "px";
        el.setAttribute("data-id", lv.id);
        if (fogged(lv.chapter)) { el.tabIndex = -1; el.setAttribute("aria-hidden", "true"); }
        if (lv.boss) {
          el.className = "boss-lair node node--boss" + (st === "lock" ? " is-lock" : "") + (st === "done" ? " is-done" : "") + (st === "cur" ? " is-focus" : "");
          el.setAttribute("aria-label", "CH." + lv.chapter + " BOSS · " + lv.name + "（" + stText(st) + "）");
          el.innerHTML = '<div class="boss-lair__aura" aria-hidden="true"></div><div class="node__body">' + bossSprite(lv.chapter) + '</div>' +
            (st === "lock" ? '<span class="boss-lair__lock" title="未解锁">🔒</span>' : st === "done" ? '<span class="boss-lair__lock" title="已通过">✓</span>' : '<span class="boss-lair__lock tn-g-chain" title="题目建设中">⛓</span>') +
            '<div class="node__lab">CH.' + lv.chapter + ' BOSS</div>';
        } else {
          el.className = "node" + (st === "done" ? " is-done" : "") + (st === "cur" ? " is-focus is-cur" : "") + (st === "lock" ? " is-lock" : "");
          el.setAttribute("aria-label", "QUEST " + lv.num + " · " + lv.name + "（" + stText(st) + "）");
          el.innerHTML = '<div class="node__body"><span class="node__num">' + lv.num + '</span></div>' +
            '<div class="node__lab"><b>QUEST ' + lv.num + '</b>' + esc(lv.name) + '</div>';
        }
        el.addEventListener("click", function (e) { e.stopPropagation(); onNodeClick(lv.id); }, sig);
        el.addEventListener("focus", function () { if (!S.moving) showCard(lv.id, true); }, sig);
        R.world.appendChild(el);
      });
      offsetNodeLabs();
    }
    function renderNpcs() {
      R.world.querySelectorAll(".npc").forEach(function (n) { n.remove(); });
      NPCS.forEach(function (npc) {
        if (fogged(npc.region)) return;
        var el = document.createElement("button");
        el.type = "button";
        el.className = "npc" + (npc.teach ? " npc--teacher" : "") + (npc.sprite === "cat" ? " npc--cat" : "");
        el.style.left = npc.x + "px"; el.style.top = npc.y + "px";
        el.setAttribute("data-npc", npc.id);
        el.setAttribute("aria-label", "与 " + npc.name + " 对话");
        if (npc.questId) el.setAttribute("data-quest", npc.questId);
        el.innerHTML = '<div class="npc__ind" aria-hidden="true">!</div><div class="npc__body">' + sprite(npc.sprite) + '</div><div class="npc__name">' + esc(npc.name) + '</div>';
        el.addEventListener("click", function (e) { e.stopPropagation(); walkNearNpc(npc, function () { openNpc(npc); }); }, sig);
        R.world.appendChild(el);
      });
    }
    function renderFog() {
      R.fog2.classList.toggle("is-lifted", !fogged(2));
      R.fog3.classList.toggle("is-lifted", !fogged(3));
    }
    function renderHud() { R.hud.innerHTML = hudInner(); }
    function renderAll() { renderFog(); renderNodes(); renderNpcs(); renderHud(); updateNear(); }

    function stText(st) { return st === "done" ? "已通关" : st === "cur" ? "进行中" : "未解锁"; }

    /* 浮动标签自动避开旁边的 NPC（标签永远不被角色遮住） */
    function offsetNodeLabs() {
      R.world.querySelectorAll(".node:not(.node--boss):not(.tn-g-ph)").forEach(function (el) {
        var lab = el.querySelector(".node__lab"), lv = byId[el.getAttribute("data-id")];
        if (!lab || !lv) return;
        lab.classList.remove("lab-left", "lab-right", "lab-up", "lab-down");
        var best = null, bd = 100;
        NPCS.forEach(function (n) { var d = Math.hypot(n.x - lv.x, n.y - lv.y); if (d < bd) { bd = d; best = n; } });
        if (!best) return;
        var dx = best.x - lv.x, dy = best.y - lv.y;
        if (Math.abs(dx) >= Math.abs(dy)) lab.classList.add(dx > 0 ? "lab-left" : "lab-right");
        else lab.classList.add(dy > 0 ? "lab-up" : "lab-down");
      });
    }

    /* ---- 相机与移动 ---- */
    function camera() {
      var vw = R.viewport.clientWidth, vh = R.viewport.clientHeight;
      var tx = Math.min(0, Math.max(vw - W, vw / 2 - S.pos.x));
      var ty = Math.min(0, Math.max(vh - H, vh / 2 - S.pos.y));
      R.world.style.transform = "translate(" + Math.round(tx) + "px," + Math.round(ty) + "px)";
    }
    function placePlayer() { R.player.style.left = S.pos.x + "px"; R.player.style.top = S.pos.y + "px"; }
    function setWalk(on) { R.player.classList.toggle("is-walk", !!on && !reduce); R.player.classList.toggle("walk", !!on && !reduce); }
    function nearestNode() {
      var best = null, bd = 1e9;
      LEVELS.forEach(function (lv) {
        if (fogged(lv.chapter)) return;
        var d = Math.hypot(lv.x - S.pos.x, lv.y - S.pos.y); if (d < bd) { bd = d; best = lv.id; }
      });
      return best;
    }
    function bfs(from, to) {
      if (!from || from === to) return [to];
      var adj = {}; EDGES.forEach(function (e) { (adj[e[0]] = adj[e[0]] || []).push(e[1]); (adj[e[1]] = adj[e[1]] || []).push(e[0]); });
      var q = [from], prev = {}, seen = {}; seen[from] = true;
      while (q.length) { var u = q.shift(); (adj[u] || []).forEach(function (v) { if (!seen[v]) { seen[v] = true; prev[v] = u; q.push(v); } }); }
      if (!seen[to]) return [to];
      var p = [to]; while (p[p.length - 1] !== from) p.push(prev[p[p.length - 1]]);
      return p.reverse();
    }
    function lerpTo(tx, ty, done) {
      if (reduce) { S.pos.x = tx; S.pos.y = ty; placePlayer(); camera(); updateNear(); if (done) done(); return; }
      var sx = S.pos.x, sy = S.pos.y, dist = Math.hypot(tx - sx, ty - sy) || 1;
      var dur = Math.min(900, Math.max(220, dist * 2.2)), t0 = performance.now();
      S.moving = true; setWalk(true);
      (function frame(t) {
        if (!inst || inst.dead) return;
        var p = Math.min(1, (t - t0) / dur), e = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
        S.pos.x = sx + (tx - sx) * e; S.pos.y = sy + (ty - sy) * e;
        placePlayer(); camera();
        if (p < 1) raf = requestAnimationFrame(frame);
        else { S.moving = false; setWalk(false); updateNear(); if (done) done(); }
      })(t0);
    }
    function walkToNode(id, then) {
      if (S.moving || S.dialogOpen) return;
      var path = bfs(nearestNode(), id), i = 0;
      if (path[0] === nearestNode() && Math.hypot(byId[path[0]].x - S.pos.x, byId[path[0]].y + 55 - S.pos.y) < 8) i = 1;
      (function step() {
        if (i >= path.length) { if (then) then(); return; }
        var lv = byId[path[i++]]; if (!lv) { step(); return; }
        lerpTo(lv.x, lv.y + 55, step);
      })();
    }
    function walkNearNpc(npc, then) {
      if (S.moving || S.dialogOpen) return;
      lerpTo(npc.x - 36, npc.y + 10, then);
    }

    /* ---- 邻近提示 ---- */
    function updateNear() {
      var near = null, bd = 70;
      NPCS.forEach(function (n) { if (fogged(n.region)) return; var d = Math.hypot(n.x - S.pos.x, n.y - S.pos.y); if (d < bd) { bd = d; near = n; } });
      S.nearNpc = near;
      R.world.querySelectorAll(".npc").forEach(function (el) { el.classList.toggle("is-near", !!near && el.getAttribute("data-npc") === near.id); });
      var nn = null, nd = 80;
      LEVELS.forEach(function (lv) { if (fogged(lv.chapter)) return; var d = Math.hypot(lv.x - S.pos.x, lv.y + 20 - S.pos.y); if (d < nd) { nd = d; nn = lv.id; } });
      S.nearNode = nn;
      R.world.querySelectorAll(".node[data-id]").forEach(function (el) { el.classList.toggle("is-near", el.getAttribute("data-id") === nn); });
      R.player.classList.toggle("is-near", !!(near || nn));
      R.world.querySelectorAll(".signpost").forEach(function (sp) {
        var ch = +sp.getAttribute("data-ch"), cx = ch === 2 ? 1700 : ch === 3 ? 700 : 400, cy = ch === 3 ? 900 : 300;
        sp.classList.toggle("is-near", Math.hypot(cx - S.pos.x, cy - S.pos.y) < 160);
      });
      [[R.fog2, 1300, 320], [R.fog3, 900, 760]].forEach(function (f) { f[0].classList.toggle("is-near", Math.hypot(f[1] - S.pos.x, f[2] - S.pos.y) < 200); });
      R.world.querySelectorAll(".land").forEach(function (land) {
        var L = land.offsetLeft, T = land.offsetTop, w = land.offsetWidth, h = land.offsetHeight;
        var inside = S.pos.x >= L - 20 && S.pos.x <= L + w + 20 && S.pos.y >= T - 20 && S.pos.y <= T + h + 20;
        land.classList.toggle("is-near", inside || Math.hypot(L + w / 2 - S.pos.x, T + h / 2 - S.pos.y) < Math.min(w, h) * 0.55);
      });
    }

    /* ---- 关卡卡片 ---- */
    function showCard(id, quiet) {
      var lv = byId[id]; if (!lv || fogged(lv.chapter)) return;
      var st = stOf(lv), title = lv.boss ? "CH." + lv.chapter + " BOSS · " + lv.name : "QUEST " + lv.num + " · " + lv.name;
      var acts = "";
      if (lv.boss) {
        if (st === "cur") acts = '<button type="button" class="qcard__go" data-act="boss">标记通过 · +' + lv.xp + ' XP</button>';
        else if (st === "done") acts = '<button type="button" class="qcard__go qcard__go--ghost" data-act="boss">撤销标记</button>';
      } else {
        if (DIALOGS[lv.id] && st !== "lock") acts += '<button type="button" class="qcard__go" data-act="talk">和导师对话</button>';
        acts += '<a class="qcard__go qcard__go--ghost" href="' + esc(A.urlFor(lv.path)) + '">📖 原文</a>';
      }
      R.qcard.innerHTML = '<button type="button" class="qcard__x" data-act="x" aria-label="关闭">✕</button>' +
        '<div class="qcard__id">' + (lv.boss ? "BOSS" : "QUEST " + lv.num) + '</div>' +
        '<div class="qcard__name">' + esc(title.replace(/^QUEST \d+ · |^CH\.\d BOSS · /, "")) + '</div>' +
        '<div class="qcard__st is-' + st + '">' + stText(st) + ' · +' + lv.xp + ' XP' + (lv.badge ? ' · 「' + esc(lv.badge) + '」' : '') + '</div>' +
        '<div class="qcard__goal">' + esc(lv.goal || "") + '</div>' +
        (st === "lock" && !lv.boss ? '<div class="qcard__goal">先通关前一关解锁。</div>' : '') +
        (st === "lock" && lv.boss ? '<div class="qcard__goal">通关本章全部关卡后解锁。</div>' : '') +
        '<div class="qcard__row">' + acts + '</div>';
      var left = lv.x + 40; if (left + 220 > W) left = lv.x - 250;
      R.qcard.style.left = left + "px"; R.qcard.style.top = (lv.y - 10) + "px";
      R.qcard.classList.add("is-open");
      R.qcard.setAttribute("data-id", lv.id);
      if (!quiet) { /* keep focus on map */ }
    }
    function hideCard() { R.qcard.classList.remove("is-open"); R.qcard.removeAttribute("data-id"); }
    R.qcard.addEventListener("click", function (e) {
      e.stopPropagation();
      var b = e.target.closest("[data-act]"); if (!b) return;
      var id = R.qcard.getAttribute("data-id"), act = b.getAttribute("data-act");
      if (act === "x") hideCard();
      else if (act === "talk") { hideCard(); openTeach(id); }
      else if (act === "boss") toggleBoss(id);
    }, sig);

    function onNodeClick(id) {
      var lv = byId[id]; if (!lv || fogged(lv.chapter)) return;
      var st = stOf(lv);
      if (st === "lock") { walkToNode(id, function () { showCard(id); }); return; }
      walkToNode(id, function () {
        if (!lv.boss && DIALOGS[id]) openTeach(id); else showCard(id);
      });
    }

    /* ---- 进度写入（只经 TN_QUEST） ---- */
    function commit(mut) {
      var s = A.load(); mut(s); A.save(s);
      S.s = A.load();
      if (A.refresh) A.refresh(); /* 刷新首页进度条等，并广播 tn-quest-change */
      renderAll();
    }
    function finishQuest(qid) {
      var lv = byId[qid]; if (!lv) return;
      var was = !!A.load().done[qid];
      commit(function (s) { s.done[qid] = true; });
      if (!was) toast("✓", "通关 QUEST " + lv.num, esc(lv.name) + ' · <b>+' + lv.xp + ' XP</b>' + (lv.badge ? ' · 徽章「' + esc(lv.badge) + '」' : ''));
    }
    function toggleBoss(id) {
      var lv = byId[id]; if (!lv || !lv.boss) return;
      var done = !!A.load().done[id];
      if (!done && A.bossState(A.load(), lv.b) !== "cur") return;
      commit(function (s) { if (done) delete s.done[id]; else s.done[id] = true; });
      hideCard();
      if (!done) toast("★", "CH." + lv.chapter + " BOSS 通过", '<b>+' + lv.xp + ' XP</b>' + (lv.badge ? ' · 徽章「' + esc(lv.badge) + '」' : '') + (lv.chapter < 3 ? ' · 第' + CN[lv.chapter] + '章迷雾散去' : ''));
    }
    function toast(px, h, b) {
      R.toast.innerHTML = '<div class="toast__px" aria-hidden="true">' + px + '</div><div><div class="toast__h">' + esc(h) + '</div><div class="toast__b">' + b + '</div></div>';
      R.toast.classList.add("is-show");
      timers.push(setTimeout(function () { R.toast.classList.remove("is-show"); }, 2600));
    }
    function fogMsg(text) {
      R.fogMsg.textContent = text; R.fogMsg.classList.add("is-show");
      timers.push(setTimeout(function () { R.fogMsg.classList.remove("is-show"); }, 2400));
    }

    /* ---- 对话 ---- */
    function fmt(s) {
      s = String(s || "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1");
      var out = "", re = /`([^`]+)`/g, last = 0, m;
      while ((m = re.exec(s))) { out += esc(s.slice(last, m.index)).replace(/\n/g, "<br>"); out += '<code class="dlg-code">' + esc(m[1]) + '</code>'; last = m.index + m[0].length; }
      return out + esc(s.slice(last)).replace(/\n/g, "<br>");
    }
    function openDialogShell(npcName, spriteKey) {
      hideCard(); closeMenu();
      S.dialogOpen = true; S.keys = {}; setWalk(false);
      R.dialog.hidden = false; R.dialog.classList.add("is-open");
      R.who.textContent = npcName;
      R.face.innerHTML = portrait(spriteKey, "normal");
      R.quiz.hidden = true; R.quiz.innerHTML = ""; R.scrollWrap.hidden = true; R.choices.innerHTML = "";
    }
    function openNpc(npc) {
      if (npc.teach && npc.questId) {
        var lv = byId[npc.questId];
        if (lv && stOf(lv) === "lock") {
          var prev = Q[lv.i - 1];
          S.teach = null;
          S.flavor = { npc: npc, lines: ["先通关「QUEST " + A.shortId(prev.id) + " · " + prev.name + "」，再来找我学「" + lv.name + "」。"], i: 0 };
          openDialogShell(npc.name, npc.sprite); renderFlavor(); return;
        }
        openTeach(npc.questId); return;
      }
      if (!npc.lines) return;
      S.teach = null;
      S.flavor = { npc: npc, lines: npc.lines, i: 0 };
      openDialogShell(npc.name, npc.sprite); renderFlavor();
    }
    function renderFlavor() {
      var f = S.flavor; if (!f) return;
      R.dots.innerHTML = f.lines.map(function (_, i) { return "<i" + (i === f.i ? ' class="is-on"' : "") + "></i>"; }).join("");
      R.text.innerHTML = fmt(f.lines[f.i]);
      R.back.disabled = f.i <= 0; R.next.disabled = false;
      R.choices.innerHTML = "";
      R.next.focus({ preventScroll: true });
    }
    function openTeach(qid) {
      var d = DIALOGS[qid]; if (!d) { showCard(qid); return; }
      S.flavor = null;
      S.teach = { qid: qid, page: 0, revealed: false };
      openDialogShell(d.npc.name, d.npc.sprite);
      renderTeach();
    }
    function closeDialog() {
      S.dialogOpen = false; S.teach = null; S.flavor = null;
      R.dialog.classList.remove("is-open"); R.dialog.hidden = true;
      closeScroll();
      R.viewport.focus({ preventScroll: true });
    }
    function renderTeach() {
      var t = S.teach; if (!t) return;
      var d = DIALOGS[t.qid], pages = d.pages, page = pages[t.page];
      if (!page) { closeDialog(); return; }
      R.face.innerHTML = portrait(d.npc.sprite, page.expr || "normal");
      R.dots.innerHTML = pages.map(function (_, i) { return "<i" + (i === t.page ? ' class="is-on"' : "") + "></i>"; }).join("");
      R.choices.innerHTML = ""; R.quiz.hidden = true; R.quiz.innerHTML = ""; R.scrollWrap.hidden = true;
      R.text.innerHTML = fmt((page.lines || []).join("\n")); /* 全文即时显示，不做打字机、不截断 */
      if (page.type === "quiz") renderQuiz(t, page);
      if (page.scroll && d.scrolls && d.scrolls[page.scroll]) {
        R.scrollWrap.hidden = false;
        R.btnScroll.onclick = function (e) { e.stopPropagation(); openScroll(d.scrolls[page.scroll]); };
      }
      if (page.type === "choice" && page.choices) {
        page.choices.forEach(function (c) {
          var b = document.createElement("button");
          b.type = "button"; b.setAttribute("data-choice", c.id);
          var label = c.label;
          if (c.id === "finish" && S.s.done[t.qid]) label = "✓ 已通关 · 离开";
          b.textContent = label;
          b.addEventListener("click", function (e) { e.stopPropagation(); onChoice(c.id); }, sig);
          R.choices.appendChild(b);
        });
      }
      R.back.disabled = t.page <= 0;
      R.next.disabled = t.page >= pages.length - 1;
    }
    function renderQuiz(t, page) {
      R.quiz.hidden = false;
      var ans = page.answer || "", right = (ans.match(/^[A-D]/) || [""])[0], html = "";
      (page.options || []).forEach(function (o, i) {
        var L = (o.match(/^[A-D]/) || [String.fromCharCode(65 + i)])[0];
        html += '<button type="button" class="opt" data-letter="' + L + '">' + fmt(o) + '</button>';
      });
      html += '<button type="button" class="dialog__reveal">看答案</button><div class="ans" hidden>' + fmt(ans) + '</div>';
      R.quiz.innerHTML = html;
      var ansEl = R.quiz.querySelector(".ans"), rev = R.quiz.querySelector(".dialog__reveal");
      function reveal(picked) {
        t.revealed = true; ansEl.hidden = false;
        if (picked && right) {
          var ok = picked === right;
          ansEl.classList.add(ok ? "is-ok" : "is-bad");
          ansEl.innerHTML = "<strong>" + (ok ? "✓ 正确！" : "✗ 不对。") + "</strong> " + fmt(ans);
        }
        R.quiz.querySelectorAll(".opt").forEach(function (b) {
          b.disabled = true;
          var L = b.getAttribute("data-letter");
          if (L === right) b.classList.add("is-right"); else if (picked && L === picked) b.classList.add("is-wrong");
        });
        rev.hidden = true;
      }
      R.quiz.querySelectorAll(".opt").forEach(function (b) {
        b.addEventListener("click", function (e) { e.stopPropagation(); if (!t.revealed) reveal(b.getAttribute("data-letter")); }, sig);
      });
      rev.addEventListener("click", function (e) { e.stopPropagation(); reveal(null); }, sig);
      if (t.revealed) reveal(null);
    }
    function step(dir) {
      if (S.flavor) {
        var f = S.flavor, n = f.i + dir;
        if (n >= f.lines.length) { closeDialog(); return; }
        if (n < 0) return;
        f.i = n; renderFlavor(); return;
      }
      if (!S.teach) return;
      var pages = DIALOGS[S.teach.qid].pages, nx = S.teach.page + dir;
      if (nx < 0 || nx >= pages.length) return;
      S.teach.page = nx; S.teach.revealed = false; renderTeach();
    }
    function onChoice(id) {
      var qid = S.teach && S.teach.qid;
      if (id === "leave") { closeDialog(); return; }
      if (id === "article") { var lv = byId[qid]; closeDialog(); if (lv) location.href = A.urlFor(lv.path); return; }
      if (id === "finish") { closeDialog(); finishQuest(qid); }
    }
    function openScroll(sc) {
      if (!sc) return;
      R.scroll.hidden = false;
      R.scrollTitle.textContent = sc.title || "卷轴";
      R.scrollBody.textContent = sc.body || "";
      if (sc.lang) R.scrollBody.setAttribute("data-lang", sc.lang); else R.scrollBody.removeAttribute("data-lang");
      R.scrollClose.focus({ preventScroll: true });
    }
    function closeScroll() { R.scroll.hidden = true; }

    R.back.addEventListener("click", function (e) { e.stopPropagation(); step(-1); }, sig);
    R.next.addEventListener("click", function (e) { e.stopPropagation(); step(1); }, sig);
    R.esc.addEventListener("click", function (e) { e.stopPropagation(); closeDialog(); }, sig);
    R.scrollClose.addEventListener("click", closeScroll, sig);
    R.scroll.addEventListener("click", function (e) { if (e.target === R.scroll) closeScroll(); }, sig);

    /* ---- 面板 / 菜单 ---- */
    function closeMenu() { R.menu.hidden = true; R.menuBtn.setAttribute("aria-expanded", "false"); }
    function openPanel(which) {
      if (S.panel === which) { closePanel(); return; }
      S.panel = which; closeMenu();
      var t = A.stats(S.s), html = '<button class="close" type="button" data-act="close" aria-label="关闭">✕</button>';
      var badges = LEVELS.filter(function (l) { return S.s.done[l.id] && l.badge; }).map(function (l) { return l.badge; });
      if (which === "log" || which === "ach") {
        html += '<h2><span>' + (which === "log" ? "LOG" : "ACH") + '</span>' + (which === "log" ? "冒险日志" : "成就") + '</h2><ul>';
        CH.forEach(function (c, ci) {
          html += '<li><b>第' + CN[ci] + '章「' + esc(c) + '」</b>' + (fogged(ci + 1) ? " · 🔒 迷雾中" : "") + '</li>';
          LEVELS.filter(function (l) { return l.chapter === ci + 1; }).forEach(function (l) {
            var st = stOf(l);
            html += '<li>' + (st === "done" ? "✓" : st === "cur" ? "▶" : "·") + ' ' + (l.boss ? "CH." + l.chapter + " BOSS · " : "QUEST " + l.num + " · ") + esc(l.name) +
              (which === "ach" && l.badge ? ' — 「' + esc(l.badge) + '」' : '') + '</li>';
          });
        });
        html += '</ul><p class="tn-g-note">' + t.q + '/' + Q.length + ' 关 · ' + t.b + '/' + BOSS.length + ' BOSS · ' + t.xp + ' XP' + (A.isDemo() ? ' · 演示数据' : '') + '</p>';
      } else if (which === "inv") {
        html += '<h2><span>INV</span>背包</h2><div class="inv-grid">' +
          badges.map(function (b) { return '<div class="inv-slot has" title="' + esc(b) + '">🏅</div>'; }).join("") +
          new Array(Math.max(4 - badges.length % 4, badges.length ? 0 : 4) + 1).join('<div class="inv-slot">·</div>') + '</div>' +
          '<p class="tn-g-note">徽章：' + (badges.map(esc).join(" · ") || "无") + '</p>';
      } else if (which === "settings") {
        html += '<h2><span>SET</span>设置</h2><p class="tn-g-note">主题与模式。</p>' +
          '<button type="button" class="dialog__reveal" data-act="theme">切换浅色 / 深色</button> ' +
          '<button type="button" class="dialog__reveal" data-act="read">📖 阅读模式</button>';
      } else {
        html += '<h2><span>CHAR</span>角色</h2><div class="char-card"><div class="tn-g-char">' + portrait("player", "happy") + '</div>' +
          '<div class="tn-g-charname">冒险者</div><p class="tn-g-note">Lv.' + t.lv + ' · ' + t.xp + ' / ' + t.max + ' XP · 知识世界 · Java 大陆</p></div>';
      }
      R.panel.innerHTML = html; R.panel.setAttribute("data-which", which);
      R.overlay.classList.add("is-open");
      R.panel.focus({ preventScroll: true });
    }
    function closePanel() { S.panel = null; R.overlay.classList.remove("is-open"); }
    function toggleTheme() {
      var lab = document.querySelector('form[data-md-component="palette"] label:not([hidden])');
      if (lab) lab.click();
    }
    R.panel.addEventListener("click", function (e) {
      var b = e.target.closest("[data-act]"); if (!b) return;
      var a = b.getAttribute("data-act");
      if (a === "close") closePanel();
      else if (a === "theme") toggleTheme();
      else if (a === "read") { closePanel(); setMode("read"); }
    }, sig);
    R.overlay.addEventListener("click", function (e) { if (e.target === R.overlay) closePanel(); }, sig);
    R.btnLog.addEventListener("click", function () { openPanel("log"); }, sig);
    R.btnInv.addEventListener("click", function () { openPanel("inv"); }, sig);
    R.btnChar.addEventListener("click", function () { openPanel("char"); }, sig);
    R.menuBtn.addEventListener("click", function () {
      R.menu.hidden = !R.menu.hidden; R.menuBtn.setAttribute("aria-expanded", String(!R.menu.hidden));
      if (!R.menu.hidden) { var f = R.menu.querySelector("button"); if (f) f.focus({ preventScroll: true }); }
    }, sig);
    R.menu.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-act]"); if (!b) return;
      var a = b.getAttribute("data-act"); closeMenu();
      if (a === "map") { closePanel(); hideCard(); S.pos = startPos(); placePlayer(); camera(); updateNear(); R.viewport.focus({ preventScroll: true }); }
      else if (a === "inv" || a === "ach" || a === "settings") openPanel(a);
      else if (a === "read") setMode("read");
    }, sig);

    /* ---- 开始画面 ---- */
    function showStart() {
      var any = A.stats(S.s).q + A.stats(S.s).b > 0;
      R.hero.innerHTML = portrait("player", "happy");
      R.btnStart.textContent = any ? "继续冒险" : "开始冒险";
      R.start.hidden = false;
      R.btnStart.focus({ preventScroll: true });
    }
    function begin() {
      R.start.hidden = true;
      try { sessionStorage.setItem(SESSION_KEY, "1"); } catch (e) {}
      R.hint.hidden = false;
      timers.push(setTimeout(function () { R.hint.classList.add("is-fade"); }, 2800));
      R.viewport.focus({ preventScroll: true });
    }
    R.btnStart.addEventListener("click", begin, sig);
    R.btnRead.addEventListener("click", function () { setMode("read"); }, sig);

    /* ---- 输入 ---- */
    var KEYMAP = { w: "w", a: "a", s: "s", d: "d", W: "w", A: "a", S: "s", D: "d", ArrowUp: "w", ArrowLeft: "a", ArrowDown: "s", ArrowRight: "d" };
    function typing(e) { var t = e.target; return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)); }
    window.addEventListener("keydown", function (e) {
      if (!R.start.hidden || typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Escape") {
        if (!R.scroll.hidden) closeScroll();
        else if (S.dialogOpen) closeDialog();
        else if (!R.menu.hidden) closeMenu();
        else if (S.panel) closePanel();
        else hideCard();
        e.preventDefault(); return;
      }
      if (S.dialogOpen) {
        if (!R.scroll.hidden) return;
        var onBtn = e.target && e.target.closest && e.target.closest(".dialog__choices button, .dialog__quiz button, .dialog__scroll-btn, .dialog__esc");
        if (e.key === "ArrowRight" || ((e.key === "Enter" || e.key === " ") && !onBtn)) { e.preventDefault(); step(1); }
        else if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
        return;
      }
      if (S.panel || !R.menu.hidden) return;
      if (KEYMAP[e.key]) { S.keys[KEYMAP[e.key]] = true; e.preventDefault(); kick(); hideCard(); R.hint.classList.add("is-fade"); return; }
      var onNode = e.target && e.target.closest && e.target.closest(".node, .npc, .qcard, .hud-tools, .game-menu-btn");
      if ((e.key === "Enter" || e.key === " ") && !onNode) {
        e.preventDefault();
        if (S.nearNpc) openNpc(S.nearNpc);
        else if (S.nearNode) { var lv = byId[S.nearNode]; if (!lv.boss && DIALOGS[lv.id] && stOf(lv) !== "lock") openTeach(lv.id); else showCard(lv.id); }
        return;
      }
      if (e.key === "l" || e.key === "L") openPanel("log");
      else if (e.key === "i" || e.key === "I") openPanel("inv");
      else if (e.key === "c" || e.key === "C") openPanel("char");
    }, sig);
    window.addEventListener("keyup", function (e) { if (KEYMAP[e.key]) S.keys[KEYMAP[e.key]] = false; }, sig);
    window.addEventListener("blur", function () { S.keys = {}; }, sig);
    root.querySelectorAll(".dpad button").forEach(function (b) {
      var k = { u: "w", d: "s", l: "a", r: "d" }[b.getAttribute("data-dir")];
      b.addEventListener("pointerdown", function (e) { e.preventDefault(); S.keys[k] = true; kick(); hideCard(); }, sig);
      ["pointerup", "pointerleave", "pointercancel"].forEach(function (ev) { b.addEventListener(ev, function () { S.keys[k] = false; }, sig); });
    });
    var looping = false;
    function kick() { if (!looping) { looping = true; raf = requestAnimationFrame(tick); } }
    function tick() {
      if (!inst || inst.dead) { looping = false; return; }
      var dx = 0, dy = 0, K = S.keys;
      if (K.w) dy -= 1; if (K.s) dy += 1; if (K.a) dx -= 1; if (K.d) dx += 1;
      if ((dx || dy) && !S.dialogOpen && !S.moving) {
        var len = Math.hypot(dx, dy) || 1, sp = 3;
        var nx = Math.max(40, Math.min(W - 40, S.pos.x + dx / len * sp)), ny = Math.max(40, Math.min(H - 40, S.pos.y + dy / len * sp));
        /* 迷雾挡路 */
        if (fogged(2) && nx > 1290 && ny < 620) { nx = Math.min(nx, 1290); if (!R.fogMsg.classList.contains("is-show")) fogMsg(R.fog2.getAttribute("data-msg")); }
        if (fogged(3) && ny > 690) { ny = Math.min(ny, 690); if (!R.fogMsg.classList.contains("is-show")) fogMsg(R.fog3.getAttribute("data-msg")); }
        S.pos.x = nx; S.pos.y = ny;
        placePlayer(); camera(); updateNear(); setWalk(true);
        raf = requestAnimationFrame(tick);
      } else {
        if (!S.moving) setWalk(false);
        looping = false;
      }
    }
    [R.fog2, R.fog3].forEach(function (f) {
      f.addEventListener("click", function (e) { e.stopPropagation(); fogMsg(f.getAttribute("data-msg")); f.classList.add("is-open"); }, sig);
      f.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); fogMsg(f.getAttribute("data-msg")); } }, sig);
    });
    R.viewport.addEventListener("click", function (e) {
      if (e.target.closest(".node,.npc,.qcard,.fog")) return;
      var r = R.viewport.getBoundingClientRect(), m = new DOMMatrixReadOnly(getComputedStyle(R.world).transform);
      var wx = e.clientX - r.left - m.m41, wy = e.clientY - r.top - m.m42, best = null, bd = 120;
      LEVELS.forEach(function (lv) { if (fogged(lv.chapter)) return; var d = Math.hypot(lv.x - wx, lv.y - wy); if (d < bd) { bd = d; best = lv.id; } });
      hideCard();
      if (best) onNodeClick(best);
    }, sig);
    window.addEventListener("resize", camera, sig);

    /* ---- 启动 ---- */
    R.player.innerHTML = '<div class="player__shadow"></div><div class="player__body">' + sprite("player") + '</div><div class="player__tag">冒险者</div>';
    renderPath(); renderAll(); placePlayer(); camera();
    var started = false;
    try { started = sessionStorage.getItem(SESSION_KEY) === "1"; } catch (e) {}
    R.hint.hidden = true;
    if (started) R.start.hidden = true; else showStart();

    return {
      root: root, dead: false,
      refresh: function () { S.s = A.load(); renderAll(); },
      destroy: function () {
        this.dead = true; ac.abort(); cancelAnimationFrame(raf);
        timers.forEach(clearTimeout);
        root.remove(); document.body.classList.remove("tn-world-on");
      },
      /* 测试 / 截图用的只读入口 */
      debug: { S: S, LEVELS: LEVELS, NPCS: NPCS, byId: byId, openTeach: openTeach, showCard: showCard, openScroll: openScroll,
        renderTeach: renderTeach, begin: begin, place: function (x, y) { S.pos = { x: x, y: y }; placePlayer(); camera(); updateNear(); } }
    };
  }

  /* ================= 文章页瘦 HUD ================= */
  function pageTitle() {
    var h = document.querySelector(".md-content__inner h1");
    if (!h) return document.title;
    var c = h.cloneNode(true);
    c.querySelectorAll(".headerlink").forEach(function (a) { a.remove(); });
    return c.textContent.trim();
  }
  function mountSlim() {
    var A = api(); if (!A) return null;
    var wrap = document.createElement("div");
    wrap.className = "tn-g tn-g-slim";
    wrap.setAttribute("data-tn-game", "slim");
    wrap.innerHTML = '<div class="article-slim-hud" role="navigation" aria-label="游戏模式">' + hudInner() +
      '<span class="article-slim-hud__title">' + esc(pageTitle()) + '</span>' +
      '<a class="article-slim-hud__back" href="' + esc(siteRoot()) + '">← 回知识世界</a>' +
      '<button type="button" class="article-slim-hud__read" title="切到阅读模式（显示完整导航）">📖</button></div>';
    var ac = new AbortController();
    wrap.querySelector(".article-slim-hud__read").addEventListener("click", function () { setMode("read"); }, { signal: ac.signal });
    document.body.insertBefore(wrap, document.body.firstChild);
    return {
      root: wrap,
      refresh: function () {
        var hud = wrap.querySelector(".article-slim-hud");
        var parts = hud.querySelectorAll(".hud__face, .hud__meta"); parts.forEach(function (p) { p.remove(); });
        hud.insertAdjacentHTML("afterbegin", hudInner());
        wrap.querySelector(".article-slim-hud__title").textContent = pageTitle();
        wrap.querySelector(".article-slim-hud__back").href = siteRoot();
      },
      destroy: function () { ac.abort(); wrap.remove(); }
    };
  }

  /* ================= 阅读模式 🎮 ================= */
  function ensureFab() {
    if (fab && fab.isConnected) return;
    fab = document.createElement("div");
    fab.className = "tn-g tn-g-fab";
    fab.setAttribute("data-tn-game", "fab");
    fab.innerHTML = '<button type="button" class="mode-fab" title="进入游戏模式" aria-label="进入游戏模式">🎮</button>';
    fab.querySelector("button").addEventListener("click", function () { setMode("game"); });
    document.body.appendChild(fab);
  }

  /* ================= 同步（幂等） ================= */
  function teardownWorld() { if (inst) { inst.destroy(); inst = null; } }
  function teardownSlim() { if (slim) { slim.destroy(); slim = null; } }
  function sync() {
    if (!api() || !document.body) return;
    ensureFab();
    var m = mode(), home = isHome();
    if (m === "game" && home) {
      teardownSlim();
      if (inst && inst.root.isConnected) inst.refresh();
      else { teardownWorld(); inst = mountWorld(); }
    } else if (m === "game") {
      teardownWorld();
      if (slim && slim.root.isConnected) slim.refresh();
      else { teardownSlim(); slim = mountSlim(); }
    } else {
      teardownWorld(); teardownSlim();
    }
  }
  function refresh() { if (inst) inst.refresh(); if (slim) slim.refresh(); }

  /* 页面切换：document$ 每次发射都先让「上一页」的世界 / HUD 判定是否还该存在 */
  if (window.document$ && document$.subscribe) document$.subscribe(function () { sync(); });
  else if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", sync);
  else sync();
  window.addEventListener("tn-mode-change", sync);
  window.addEventListener("tn-quest-change", function () { if (inst || slim) refresh(); });

  window.TN_GAME = {
    sync: sync,
    teardown: function () { teardownWorld(); teardownSlim(); if (fab) { fab.remove(); fab = null; } },
    get world() { return inst; },
    get slim() { return slim; }
  };
})();
