/* tech-notes · 游戏模式「知识世界」（移植自 tn-ui/hud 原型 explore.js）
 *
 * - 首页（.tn2-hero 存在）+ 游戏模式：开始画面 → 当前在学章节的单章场景（光路 / 芯片节点 / 传送门），
 *   右上角 ◎「星图」打开全息世界星图，可传送到已解锁章节（场景数据见 scene-data.js）
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

  /* 场景布局（节点槽位 / 道具 / 星图坐标）见 scene-data.js 的 TN_SCENE_THEMES / TN_WORLD_MAP */
  var CN = "一二三四五";
  var SESSION_KEY = "tn-game-started";
  /* 顶部 WASD 提示条：只在第一次进入时出现，看过就记住（独立的 key，不碰 tn-quest-v2） */
  var HINT_KEY = "tn-hint-keys-seen";
  /* 与 game.css 中显示 D-pad 的媒体查询保持一致：触屏 / 窄屏从不显示键盘提示 */
  var TOUCH_MQ = "(max-width: 720px), (hover: none) and (pointer: coarse)";
  function isTouch() { return !!(window.matchMedia && matchMedia(TOUCH_MQ).matches); }
  function hintSeen() { try { return localStorage.getItem(HINT_KEY) === "1"; } catch (e) { return true; } }
  function markHintSeen() { try { localStorage.setItem(HINT_KEY, "1"); } catch (e) {} }

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
    var A = api(), QD = window.TN_QUEST_DATA, THEMES = window.TN_SCENE_THEMES, WMAP = window.TN_WORLD_MAP, KIT = window.TN_SCENE_KIT;
    if (!A || !QD || !THEMES || !WMAP || !KIT) return null;
    var DIALOGS = (window.TN_DIALOGS && window.TN_DIALOGS.dialogs) || {};
    var ac = new AbortController(), sig = { signal: ac.signal };
    var timers = [], raf = 0;
    var reduce = reduceMotion();

    /* ---- 章节顺序：basics:1-3 → java:1-3（只收 quest-data 与场景主题都有的章） ---- */
    var ORDER = [];
    ["basics", "java"].forEach(function (t) {
      var T = QD.topics[t]; if (!T) return;
      (T.chapters || []).forEach(function (_, i) { var k = t + ":" + (i + 1); if (THEMES[k]) ORDER.push(k); });
    });
    if (!ORDER.length) return null;
    function parseKey(k) { var p = String(k).split(":"); return { topic: p[0], chapter: +p[1] }; }

    /* ---- 全部关卡元数据（名称 / XP / 徽章只来自 quest-data；坐标在渲染当前章时才给） ---- */
    var ALL = [], byId = {};
    ORDER.forEach(function (key) {
      var p = parseKey(key), T = QD.topics[p.topic], CHN = T.chapters[p.chapter - 1];
      T.quests.forEach(function (q, i) {
        if (q.chapter === p.chapter) ALL.push({ id: q.id, key: key, topic: p.topic, i: i, prev: i > 0 ? T.quests[i - 1] : null, num: A.shortId(q.id), name: q.name, chapter: q.chapter, xp: q.xp, badge: q.badge, path: q.path, goal: q.goal, boss: false });
      });
      T.bosses.forEach(function (b) {
        if (b.chapter === p.chapter) ALL.push({ id: b.id, key: key, topic: p.topic, b: b, num: "B" + b.chapter, name: b.name, chapter: b.chapter, xp: b.xp, badge: b.badge, boss: true,
          goal: "综合检验第" + CN[b.chapter - 1] + "章「" + CHN + "」。题目建设中；本章关卡全通后可在此标记通过。" });
      });
    });
    ALL.forEach(function (l) { byId[l.id] = l; });
    function levelsOf(key) { return ALL.filter(function (l) { return l.key === key; }); }

    /* ---- DOM ---- */
    var root = document.createElement("div");
    root.className = "tn-g tn-game-root tn-scene";
    root.setAttribute("data-tn-game", "world");
    root.innerHTML =
      '<div class="start" data-r="start" role="dialog" aria-modal="true" aria-label="知识世界" hidden>' +
        '<div class="start__card"><div class="start__logo" aria-hidden="true">TN</div>' +
        '<h1 class="start__title">知识世界</h1><p class="start__sub">tech-notes · 角色探索</p>' +
        '<div class="start__hero" data-r="hero" aria-hidden="true"></div>' +
        '<button type="button" class="start__go" id="btnStart">开始冒险</button>' +
        '<button type="button" class="start__link" id="btnReadFromStart">只想看文章 → 阅读模式</button></div></div>' +
      '<div class="hint hint--keys" data-r="hint" aria-hidden="true"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><span class="hint__dot"></span><kbd>⏎</kbd><span class="hint__dot"></span><kbd>Esc</kbd></div>' +
      '<div class="hud-title" data-r="title" role="status"></div>' +
      '<button type="button" class="hud-btn tn-starmap-btn" data-r="mapBtn" title="星图 (M)" aria-label="星图" aria-haspopup="dialog">◎</button>' +
      '<button type="button" class="game-menu-btn" data-r="menuBtn" title="菜单" aria-label="菜单" aria-expanded="false">☰</button>' +
      '<nav class="game-menu" data-r="menu" aria-label="游戏菜单" hidden>' +
        '<button type="button" data-act="map">◎ 星图</button><button type="button" data-act="inv">🎒 背包</button>' +
        '<button type="button" data-act="ach">🏅 成就</button><button type="button" data-act="settings">⚙ 设置</button>' +
        '<button type="button" data-act="read">📖 阅读模式</button></nav>' +
      '<div class="viewport" data-r="viewport" tabindex="0" aria-label="知识世界 · 当前章节（WASD / 方向键移动，Enter 对话，Tab 选关卡）">' +
        '<div class="scene" data-r="scene"></div>' +
        '<div class="qcard" data-r="qcard" role="dialog" aria-label="关卡信息"></div>' +
      '</div>' +
      '<aside class="hud" data-r="hud" aria-label="状态"></aside>' +
      '<div class="hud-tools"><button class="iconbtn" type="button" data-r="btnLog" title="冒险日志 (L)" aria-label="冒险日志">📜</button>' +
        '<button class="iconbtn" type="button" data-r="btnInv" title="背包 (I)" aria-label="背包">🎒</button>' +
        '<button class="iconbtn" type="button" data-r="btnChar" title="角色 (C)" aria-label="角色">🧙</button></div>' +
      '<div class="dpad" aria-label="虚拟方向键"><button type="button" class="u" data-dir="u" aria-label="上">▲</button><button type="button" class="l" data-dir="l" aria-label="左">◀</button><button type="button" class="r" data-dir="r" aria-label="右">▶</button><button type="button" class="d" data-dir="d" aria-label="下">▼</button></div>' +
      '<div class="fog-msg" data-r="fogMsg" role="status"></div>' +
      '<div class="wmap" data-r="wmap" hidden><div class="wmap-panel" role="dialog" aria-modal="true" aria-label="星图">' +
        '<div class="wmap-hd"><h2>◎ 星图</h2><button type="button" class="wmap-close" data-r="wmapClose" aria-label="关闭星图">✕</button></div>' +
        '<div class="wmap-canvas" data-r="wcanvas"></div></div></div>' +
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
    var S = { s: A.load(), key: null, theme: null, portrait: false, pos: { x: 50, y: 50 }, moving: false, dialogOpen: false, wmapOpen: false,
      nearNpc: null, nearNode: null, teach: null, flavor: null, keys: {}, panel: null, gate: null };
    var LEVELS = [], NPCS = [];

    function questsOf(key) { return levelsOf(key).filter(function (l) { return !l.boss; }); }
    function bossOf(key) { return levelsOf(key).filter(function (l) { return l.boss; })[0] || null; }
    function chapterComplete(key) {
      var ls = levelsOf(key); return ls.length > 0 && ls.every(function (l) { return !!S.s.done[l.id]; });
    }
    function chapterUnlocked(key) {
      var i = ORDER.indexOf(key); if (i < 0) return false;
      return i === 0 || chapterComplete(ORDER[i - 1]);
    }
    function currentChapter() {
      for (var i = 0; i < ORDER.length; i++) if (chapterUnlocked(ORDER[i]) && !chapterComplete(ORDER[i])) return ORDER[i];
      return ORDER[ORDER.length - 1];
    }
    function nextKey(key) { var i = ORDER.indexOf(key); return i >= 0 && i < ORDER.length - 1 ? ORDER[i + 1] : null; }
    function chapterMarkState(key) {
      if (!chapterUnlocked(key)) return "locked";
      if (key === S.key) return "cur";
      return chapterComplete(key) ? "done" : "open";
    }
    function stOf(lv) {
      /* 按 id 判定（同一 topic 内按顺序解锁）；basics/java 共享 done{} 互不影响 */
      var T = QD.topics[lv.topic];
      if (lv.boss) {
        if (S.s.done[lv.id]) return "done";
        var chQ = T.quests.filter(function (q) { return q.chapter === lv.chapter; });
        return chQ.every(function (q) { return S.s.done[q.id]; }) ? "cur" : "lock";
      }
      if (S.s.done[lv.id]) return "done";
      for (var j = 0; j < lv.i; j++) if (!S.s.done[T.quests[j].id]) return "lock";
      return "cur";
    }
    function stText(st) { return st === "done" ? "已通关" : st === "cur" ? "进行中" : "未解锁"; }
    function isPortraitView() {
      return !!(window.matchMedia && matchMedia("(max-width: 520px), (orientation: portrait) and (max-width: 900px)").matches);
    }

    /* ---- 坐标：场景内一律用 %（0–100），距离按视口像素换算 ---- */
    function vw() { return R.viewport.clientWidth || window.innerWidth; }
    function vh() { return R.viewport.clientHeight || window.innerHeight; }
    function dpx(ax, ay, bx, by) { return Math.hypot((ax - bx) * vw() / 100, (ay - by) * vh() / 100); }
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
    function chibi(key, size) {
      var C = window.TN_CHIBI, fn = C && (C[key] || C[(C.ID_TO_SPRITE || {})[key]]);
      return typeof fn === "function" ? fn({ size: size }) : sprite(key);
    }

    /* ---- 渲染当前章（其它章不进 DOM） ---- */
    function renderScene(key, keepPos) {
      var theme = THEMES[key]; if (!theme) return;
      var changed = S.key !== key;
      S.key = key; S.theme = theme; S.portrait = isPortraitView();
      root.classList.toggle("is-portrait", S.portrait);
      var sc = R.scene;
      sc.setAttribute("data-theme", theme.theme);
      sc.setAttribute("data-key", key);
      sc.setAttribute("data-layout", S.portrait ? "portrait" : "landscape");
      var P = S.portrait;
      var slots = (P && theme.nodesPortrait ? theme.nodesPortrait : theme.nodes).slice();
      var bossAt = (P && theme.bossAtPortrait) || theme.bossAt || { x: 88, y: 16 };
      var gateAt = (P && theme.gateAtPortrait) || theme.gateAt || { x: 92, y: 10 };
      var qs = questsOf(key), boss = bossOf(key);
      LEVELS = [];
      qs.forEach(function (lv, i) { var s = slots[i] || slots[slots.length - 1] || { x: 50, y: 50 }; lv.x = s.x; lv.y = s.y; LEVELS.push(lv); });
      if (boss) { var bs = qs.length < slots.length ? slots[qs.length] : bossAt; boss.x = bs.x; boss.y = bs.y; LEVELS.push(boss); }
      S.gate = { x: gateAt.x, y: gateAt.y, next: nextKey(key) };
      var stops = LEVELS.map(function (l) { return { x: l.x, y: l.y }; }).concat([{ x: gateAt.x, y: gateAt.y }]);
      var d = KIT.pathThrough(stops);
      sc.innerHTML =
        '<div class="sc-sky" aria-hidden="true"><div class="sc-stars"></div></div>' +
        '<div class="sc-hills" aria-hidden="true"><div class="sc-hill sc-hill--far"></div><div class="sc-hill sc-hill--mid"></div></div>' +
        '<div class="sc-ground" aria-hidden="true"></div>' +
        '<div class="sc-props sc-props--bg" aria-hidden="true"></div>' +
        '<svg class="sc-path" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' +
          '<path class="trail-edge" d="' + d + '"/><path class="trail" d="' + d + '"/><path class="trail-glow" d="' + d + '"/><path class="trail-flow" d="' + d + '"/></svg>' +
        '<div class="sc-props sc-props--mid" aria-hidden="true"></div>' +
        '<div class="nodes" data-s="nodes"></div>' +
        '<div class="entities" data-s="ents"></div>' +
        '<div class="sc-props sc-props--fg" aria-hidden="true"></div>' +
        '<div class="sc-particles" aria-hidden="true"></div>' +
        '<div class="sc-vignette" aria-hidden="true"></div>';
      /* 装饰：粒子 / 夜间星星 / 道具（伪随机但确定，避免每次刷新跳动） */
      var rs = 7; function rnd() { rs = (rs * 9301 + 49297) % 233280; return rs / 233280; }
      var glyphs = ["0", "1", "{", "}", "</>", "◆", "·", "✦"], ph = sc.querySelector(".sc-particles"), html = "";
      for (var pi = 0; pi < 18; pi++) {
        var kind = pi % 5 === 0 ? "dot" : pi % 3 === 0 ? "v" : pi % 2 === 0 ? "m" : "";
        html += '<span class="sc-particle' + (kind ? " sc-particle--" + kind : "") + '" style="left:' + (4 + rnd() * 92).toFixed(1) + "%;top:" + (18 + rnd() * 70).toFixed(1) +
          "%;animation-delay:" + (rnd() * 6).toFixed(2) + "s;animation-duration:" + (7 + rnd() * 5).toFixed(2) + 's">' + (kind === "dot" ? "" : esc(glyphs[pi % glyphs.length])) + "</span>";
      }
      ph.innerHTML = html; html = "";
      for (var si = 0; si < 28; si++) html += '<span class="star" style="left:' + (rnd() * 100).toFixed(1) + "%;top:" + (rnd() * 42).toFixed(1) + "%;animation-delay:" + (rnd() * 3).toFixed(2) + 's"></span>';
      sc.querySelector(".sc-stars").innerHTML = html;
      (theme.props || []).forEach(function (p) {
        var el = document.createElement("div");
        el.className = "prop prop--" + p.k + (p.layer ? " prop-layer--" + p.layer : "");
        if (p.k.indexOf("skyline") === 0) {
          el.className += " prop--skyline";
          el.style.left = "0"; el.style.right = "0"; el.style.width = "100%";
          el.style.top = (p.y || 20) + "%"; el.style.transform = "translateY(-100%)";
        } else { el.style.left = p.x + "%"; el.style.top = p.y + "%"; }
        el.innerHTML = KIT.propSvg(p.k);
        sc.querySelector(p.layer === "fg" ? ".sc-props--fg" : p.layer === "bg" ? ".sc-props--bg" : ".sc-props--mid").appendChild(el);
      });
      R.title.innerHTML = '<span class="sign-land">' + esc(theme.land) + '</span><span class="sign-dot">·</span><span class="sign-ch">' + esc(theme.name) + "</span>";
      buildNpcs();
      renderAll();
      if (!keepPos || changed) {
        var start = LEVELS.filter(function (l) { return stOf(l) === "cur"; })[0] || LEVELS[0];
        if (start) { S.pos = { x: clamp(start.x - (P ? 0 : 5), 6, 94), y: clamp(start.y + (P ? 7 : 6), 8, 92) }; }
      }
      placePlayer(); layoutNpcs(); updateNear();
      /* 本章导师台词按 topic 懒加载（同域 script，加载器原样） */
      if (window.TN_DIALOGS_LOAD) window.TN_DIALOGS_LOAD(theme.topic, function () {
        if (!inst || inst.dead || S.key !== key) return;
        DIALOGS = (window.TN_DIALOGS && window.TN_DIALOGS.dialogs) || DIALOGS;
        buildNpcs(); renderNpcs(); layoutNpcs(); updateNear();
      });
    }

    /* ---- NPC：本章每关一位导师（dialogs），门卫守传送门，新手村第一章有流浪猫 ---- */
    function buildNpcs() {
      var P = S.portrait; NPCS = [];
      LEVELS.forEach(function (lv) {
        if (lv.boss) return;
        var d = DIALOGS[lv.id]; if (!d || !d.npc) return;
        NPCS.push({ id: d.npc.id, questId: lv.id, sprite: d.npc.sprite, name: d.npc.name, teach: true,
          x: clamp(lv.x + (P ? 9 : 5), 5, 95), y: clamp(lv.y - (P ? 2 : 4), 10, 94) });
      });
      var nk = S.gate.next, nt = nk ? THEMES[nk] : null, boss = bossOf(S.key), ch = parseKey(S.key).chapter;
      NPCS.push({ id: "guard", sprite: "guard", name: "门卫", x: clamp(S.gate.x + (P ? -10 : -8), 5, 95), y: clamp(S.gate.y + (P ? 6 : 5), 10, 94), lines: nt ? [
        "站住。传送门那边是「" + nt.land + " · " + nt.name + "」。",
        "通关本章全部关卡并在「CH." + ch + " BOSS · " + (boss ? boss.name : "") + "」标记通过后，传送门才会开启。"
      ] : ["这里是目前的最后一章。更多大陆还在迷雾之外。", "随时可以点右上角 ◎「星图」回到已解锁的章节复习。"] });
      if (S.key === ORDER[0] && LEVELS[0]) NPCS.push({ id: "cat", sprite: "cat", name: "流浪猫", x: clamp(LEVELS[0].x + 7, 5, 95), y: clamp(LEVELS[0].y + 9, 10, 94), lines: [
        "喵。进度存在本浏览器的 " + A.KEY_V2 + "，阅读模式和游戏模式共用。",
        "想看完整文章？菜单里有「📖 阅读模式」。"
      ] });
    }
    function nodesEl() { return R.scene.querySelector('[data-s="nodes"]'); }
    function entsEl() { return R.scene.querySelector('[data-s="ents"]'); }
    function renderNodes() {
      var host = nodesEl(); if (!host) return;
      host.innerHTML = "";
      LEVELS.forEach(function (lv) {
        var st = stOf(lv), el = document.createElement("button"), cls = st === "lock" ? "is-locked" : "is-" + st;
        el.type = "button";
        el.style.left = lv.x + "%"; el.style.top = lv.y + "%";
        el.setAttribute("data-id", lv.id);
        if (lv.boss) {
          el.className = "node node--boss " + cls;
          el.setAttribute("aria-label", "CH." + lv.chapter + " BOSS · " + lv.name + "（" + stText(st) + "）");
          el.innerHTML = '<div class="node__boss">' + bossSprite(lv.chapter) + (st === "lock" ? '<span class="boss-lock" aria-hidden="true">🔒</span>' : "") + '</div>' +
            '<div class="node__lab">CH.' + lv.chapter + " · " + esc(lv.name) + '</div>';
        } else {
          el.className = "node " + cls;
          el.setAttribute("aria-label", "QUEST " + lv.num + " · " + lv.name + "（" + stText(st) + "）");
          el.innerHTML = '<div class="node__body">' + esc(lv.num) + '</div><div class="node__lab">' + esc(lv.name) + '</div>';
        }
        el.addEventListener("click", function (e) { e.stopPropagation(); onNodeClick(lv.id); }, sig);
        el.addEventListener("focus", function () { if (!S.moving) showCard(lv.id, true); }, sig);
        host.appendChild(el);
      });
      var g = S.gate, open = !!(g.next && chapterUnlocked(g.next)), nt = g.next ? THEMES[g.next] : null;
      var gate = document.createElement("button");
      gate.type = "button";
      gate.className = "gate " + (open ? "is-open" : "is-locked");
      gate.style.left = g.x + "%"; gate.style.top = g.y + "%";
      gate.setAttribute("data-gate", g.next || "end");
      gate.setAttribute("aria-label", nt ? (open ? "传送门 · 前往「" + nt.name + "」" : "传送门 · 通关本章 BOSS 后开启「" + nt.name + "」") : "终章");
      gate.innerHTML = '<div class="gate__arch"></div><div class="gate__lab">' + esc(nt ? nt.name : "终章") + "</div>";
      gate.addEventListener("click", function (e) {
        e.stopPropagation();
        if (open) travelTo(g.next);
        else fogMsg(nt ? "🔒「" + nt.name + "」· 通关本章 BOSS 后传送门开启" : "这是目前的最后一章 · 更多大陆在迷雾之外");
      }, sig);
      host.appendChild(gate);
    }
    function renderNpcs() {
      var host = entsEl(); if (!host) return;
      host.querySelectorAll(".npc").forEach(function (n) { n.remove(); });
      NPCS.forEach(function (npc) {
        var el = document.createElement("button");
        el.type = "button";
        el.className = "npc" + (npc.teach ? " npc--teacher" : "") + (npc.sprite === "cat" ? " npc--cat" : "");
        el.style.left = npc.x + "%"; el.style.top = npc.y + "%";
        el.setAttribute("data-npc", npc.id);
        el.setAttribute("aria-label", "与 " + npc.name + " 对话");
        if (npc.questId) el.setAttribute("data-quest", npc.questId);
        el.innerHTML = chibi(npc.sprite, npc.sprite === "cat" ? 36 : 44) + '<div class="npc__bang" aria-hidden="true">!</div><div class="npc__name">' + esc(npc.name) + '</div>';
        el.addEventListener("click", function (e) { e.stopPropagation(); walkNearNpc(npc, function () { openNpc(npc); }); }, sig);
        host.insertBefore(el, R.player && R.player.parentNode === host ? R.player : null);
      });
      if (!R.player || R.player.parentNode !== host) {
        R.player = document.createElement("div");
        R.player.className = "hero hero-bob";
        R.player.setAttribute("aria-hidden", "true");
        R.player.innerHTML = chibi("player", 48);
        host.appendChild(R.player);
      }
    }
    function renderHud() { R.hud.innerHTML = hudInner(); }
    function renderAll() { renderNodes(); renderNpcs(); renderHud(); placePlayer(); layoutNpcs(); updateNear(); }

    /* ---- 防遮挡布局：NPC 避开关卡芯片 / 标签 / 传送门 / HUD / 主角站位，任何精灵都不压标签 ---- */
    function relRect(el, vr, pad) {
      var r = el.getBoundingClientRect(); pad = pad || 0;
      return { l: r.left - vr.left - pad, t: r.top - vr.top - pad, r: r.right - vr.left + pad, b: r.bottom - vr.top + pad };
    }
    function overlapArea(a, b) {
      var w = Math.min(a.r, b.r) - Math.max(a.l, b.l), h = Math.min(a.b, b.b) - Math.max(a.t, b.t);
      return w > 0 && h > 0 ? w * h : 0;
    }
    function chromeRects(vr) {
      var out = [{ l: -1e4, t: -1e4, r: 1e4, b: 52 }]; /* 顶部标题 / 按钮条 */
      root.querySelectorAll(".hud, .dpad, .dpad button, .hud-tools, .tn-starmap-btn, .game-menu-btn, .hud-title").forEach(function (el) {
        if (el.offsetParent !== null || getComputedStyle(el).position === "fixed") { var r = relRect(el, vr, 6); if (r.r > r.l && r.b > r.t) out.push(r); }
      });
      return out;
    }
    function sceneObstacles(vr) {
      var obs = [];
      R.scene.querySelectorAll(".node__body, .node__boss, .gate__arch").forEach(function (el) { obs.push(relRect(el, vr, 6)); });
      /* 标签默认可能是 opacity:0（靠近才显示），按完整盒子避让 */
      R.scene.querySelectorAll(".node__lab, .gate__lab").forEach(function (el) { obs.push(relRect(el, vr, 4)); });
      var W = vw(), H = vh();
      LEVELS.forEach(function (lv) { var s = standAt(lv), x = s.x / 100 * W, y = s.y / 100 * H; obs.push({ l: x - 22, t: y - 50, r: x + 22, b: y + 2 }); });
      return obs.concat(chromeRects(vr));
    }
    /* 关卡标签若压到 HUD / 方向键 / 其它芯片，换到上 / 左 / 右侧 */
    function layoutLabels(vr) {
      var chrome = chromeRects(vr), LAB = ["", "lab-up", "lab-left", "lab-right"];
      R.scene.querySelectorAll(".node").forEach(function (n) {
        var lab = n.querySelector(".node__lab"); if (!lab) return;
        var others = [];
        R.scene.querySelectorAll(".node__body, .node__boss, .gate__arch, .gate__lab").forEach(function (el) { if (!n.contains(el)) others.push(relRect(el, vr, 2)); });
        var best = "", bc = 1e12;
        LAB.forEach(function (c, i) {
          LAB.forEach(function (x) { if (x) n.classList.remove(x); }); if (c) n.classList.add(c);
          var r = relRect(lab, vr, 2), cost = i;
          if (r.l < 0 || r.t < 0 || r.r > vw() || r.b > vh()) cost += 1e6;
          chrome.concat(others).forEach(function (o) { cost += overlapArea(r, o) * 100; });
          if (cost < bc) { bc = cost; best = c; }
        });
        LAB.forEach(function (x) { if (x) n.classList.remove(x); }); if (best) n.classList.add(best);
      });
    }
    function layoutNpcs() {
      var host = entsEl(); if (!host) return;
      var vr = R.viewport.getBoundingClientRect(); if (!vr.width) return;
      layoutLabels(vr);
      var W = vw(), H = vh(), obs = sceneObstacles(vr), placed = [];
      if (R.player && R.player.parentNode) obs.push(relRect(R.player, vr, 6));
      /* 竖屏场景拥挤：先给关卡卡片预留一块不压芯片 / 标签 / HUD 的停靠区，NPC 不进入，卡片就总有空位 */
      if (S.portrait) {
        var cw = 184, chh = 172, dock = null, dc = 1e12;
        for (var dy = 56; dy <= H - chh - 8; dy += 12) for (var dx = 8; dx <= W - cw - 8; dx += 12) {
          var db = { l: dx, t: dy, r: dx + cw, b: dy + chh }, c2 = 0;
          obs.forEach(function (o) { c2 += overlapArea(db, o); });
          if (c2 < dc) { dc = c2; dock = db; }
        }
        if (dock) obs.push(dock);
      }
      NPCS.forEach(function (npc) {
        var el = host.querySelector('.npc[data-npc="' + npc.id + '"]'); if (!el) return;
        if (npc.ax == null) { npc.ax = npc.x; npc.ay = npc.y; }
        var bw = Math.max(36, el.offsetWidth), bh = Math.max(36, el.offsetHeight);
        var ax = npc.ax / 100 * W, ay = npc.ay / 100 * H, best = null, bestCost = 1e12;
        for (var ring = 0; ring <= 8 && bestCost > 0; ring++) {
          var steps = ring ? 12 : 1;
          for (var k = 0; k < steps; k++) {
            var ang = k / steps * Math.PI * 2, x = ax + Math.cos(ang) * ring * 22, y = ay + Math.sin(ang) * ring * 18;
            /* 精灵锚点在脚底中心；名字牌在脚下 16px */
            var box = { l: x - bw / 2, t: y - bh - 14, r: x + bw / 2, b: y + 18 };
            if (box.l < 4 || box.r > W - 4 || box.t < 4 || box.b > H - 4) continue;
            var cost = 0;
            obs.concat(placed).forEach(function (o) { cost += overlapArea(box, o); });
            cost += ring; /* 同等无遮挡时尽量贴近原锚点 */
            if (cost < bestCost) { bestCost = cost; best = { x: x, y: y, box: box }; }
          }
        }
        if (!best) return;
        npc.x = best.x / W * 100; npc.y = best.y / H * 100;
        el.style.left = npc.x + "%"; el.style.top = npc.y + "%";
        placed.push(best.box);
      });
    }

    /* ---- 移动 ---- */
    function placePlayer() { if (R.player) { R.player.style.left = S.pos.x + "%"; R.player.style.top = S.pos.y + "%"; } }
    function setWalk(on) { if (R.player) R.player.classList.toggle("is-walk", !!on && !reduce); }
    function standAt(lv) { return { x: lv.x, y: clamp(lv.y + (S.portrait ? 5 : 6), 8, 94) }; }
    function nearestIdx() {
      var bi = 0, bd = 1e9;
      LEVELS.forEach(function (lv, i) { var s = standAt(lv), d = dpx(s.x, s.y, S.pos.x, S.pos.y); if (d < bd) { bd = d; bi = i; } });
      return bi;
    }
    function lerpTo(tx, ty, done) {
      if (reduce) { S.pos.x = tx; S.pos.y = ty; placePlayer(); updateNear(); if (done) done(); return; }
      var sx = S.pos.x, sy = S.pos.y, dist = dpx(sx, sy, tx, ty) || 1;
      var dur = Math.min(900, Math.max(220, dist * 2.2)), t0 = performance.now();
      S.moving = true; setWalk(true);
      (function frame(t) {
        if (!inst || inst.dead) return;
        var p = Math.min(1, (t - t0) / dur), e = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
        S.pos.x = sx + (tx - sx) * e; S.pos.y = sy + (ty - sy) * e;
        placePlayer();
        if (p < 1) raf = requestAnimationFrame(frame);
        else { S.moving = false; setWalk(false); updateNear(); if (done) done(); }
      })(t0);
    }
    /* 沿光路逐个节点走（不穿越场景） */
    function walkToNode(id, then) {
      if (S.moving || S.dialogOpen) return;
      var to = -1; LEVELS.forEach(function (l, i) { if (l.id === id) to = i; });
      if (to < 0) return;
      var from = nearestIdx(), path = [];
      var s0 = standAt(LEVELS[from]);
      if (dpx(s0.x, s0.y, S.pos.x, S.pos.y) < 8 && from !== to) from += from < to ? 1 : -1;
      for (var i = from; from <= to ? i <= to : i >= to; i += from <= to ? 1 : -1) path.push(LEVELS[i]);
      (function step() {
        var lv = path.shift(); if (!lv) { if (then) then(); return; }
        var s = standAt(lv); lerpTo(s.x, s.y, step);
      })();
    }
    function walkNearNpc(npc, then) {
      if (S.moving || S.dialogOpen) return;
      lerpTo(clamp(npc.x - 36 / vw() * 100, 3, 97), clamp(npc.y + 2, 8, 95), then);
    }

    /* ---- 邻近提示 ---- */
    function updateNear() {
      var near = null, bd = 70;
      NPCS.forEach(function (n) { var d = dpx(n.x, n.y, S.pos.x, S.pos.y); if (d < bd) { bd = d; near = n; } });
      S.nearNpc = near;
      R.scene.querySelectorAll(".npc").forEach(function (el) { el.classList.toggle("is-near", !!near && el.getAttribute("data-npc") === near.id); });
      var nn = null, nd = 80;
      LEVELS.forEach(function (lv) { var d = dpx(lv.x, lv.y, S.pos.x, S.pos.y); if (d < nd) { nd = d; nn = lv.id; } });
      S.nearNode = nn;
      R.scene.querySelectorAll(".node[data-id]").forEach(function (el) { el.classList.toggle("is-near", el.getAttribute("data-id") === nn); });
      if (R.player) R.player.classList.toggle("is-near", !!(near || nn));
    }

    /* ---- 关卡卡片 ---- */
    /* 卡片放在不压任何精灵 / 其它芯片 / 标签 / HUD 的位置（候选：右、左、上、下、各角落），取遮挡面积最小者 */
    function placeCard(lv) {
      var W = vw(), H = vh(), px = lv.x / 100 * W, py = lv.y / 100 * H;
      var vis = R.qcard.style.visibility; R.qcard.style.visibility = "hidden"; R.qcard.classList.add("is-open");
      var cw = R.qcard.offsetWidth || 210, chh = R.qcard.offsetHeight || 140;
      var vr = R.viewport.getBoundingClientRect(), obs = chromeRects(vr).map(function (r) { r.w = 50; return r; }), own = R.scene.querySelector('.node[data-id="' + lv.id + '"]');
      R.scene.querySelectorAll(".npc, .hero").forEach(function (el) { var r = relRect(el, vr, 4); r.w = 50; obs.push(r); }); /* 精灵：最高优先避让 */
      R.scene.querySelectorAll(".node__body, .node__boss, .gate__arch, .node__lab, .gate__lab").forEach(function (el) {
        if (own && own.contains(el) && !el.classList.contains("node__lab")) return; obs.push(relRect(el, vr, 2));
      });
      if (own) { var ob = own.querySelector(".node__body, .node__boss"); if (ob) obs.push(relRect(ob, vr, 6)); }
      var c = [], g = 34;
      [[px + g, py - chh / 2], [px - g - cw, py - chh / 2], [px - cw / 2, py - g - chh], [px - cw / 2, py + g],
       [px + g, py - chh], [px + g, py], [px - g - cw, py - chh], [px - g - cw, py]].forEach(function (p) { c.push(p); });
      for (var yy = 56; yy <= H - chh - 8; yy += 12) for (var xx = 8; xx <= W - cw - 8; xx += 12) c.push([xx, yy]);
      var best = null, bc = 1e12;
      c.forEach(function (p, i) {
        var l = clamp(p[0], 8, Math.max(8, W - cw - 8)), t = clamp(p[1], 56, Math.max(56, H - chh - 8));
        var box = { l: l, t: t, r: l + cw, b: t + chh }, cost = 0;
        obs.forEach(function (o) { cost += overlapArea(box, o) * (o.w || 1); });
        cost = cost * 1000 + Math.hypot(l + cw / 2 - px, t + chh / 2 - py) + (i < 8 ? 0 : 60);
        if (cost < bc) { bc = cost; best = box; }
      });
      R.qcard.style.left = best.l + "px"; R.qcard.style.top = best.t + "px";
      R.qcard.style.visibility = vis;
    }
    function showCard(id, quiet) {
      var lv = byId[id]; if (!lv || lv.key !== S.key) return;
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
        '<div class="qcard__name">' + esc(title.replace(/^QUEST \w+ · |^CH\.\d BOSS · /, "")) + '</div>' +
        '<div class="qcard__st is-' + st + '">' + stText(st) + ' · +' + lv.xp + ' XP' + (lv.badge ? ' · 「' + esc(lv.badge) + '」' : '') + '</div>' +
        '<div class="qcard__goal">' + esc(lv.goal || "") + '</div>' +
        (st === "lock" && !lv.boss ? '<div class="qcard__goal">先通关前一关解锁。</div>' : '') +
        (st === "lock" && lv.boss ? '<div class="qcard__goal">通关本章全部关卡后解锁。</div>' : '') +
        '<div class="qcard__row">' + acts + '</div>';
      placeCard(lv);
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
      var lv = byId[id]; if (!lv || lv.key !== S.key) return;
      var st = stOf(lv);
      if (st === "lock") { walkToNode(id, function () { showCard(id); }); return; }
      walkToNode(id, function () {
        if (!lv.boss && DIALOGS[id]) openTeach(id); else showCard(id);
      });
    }

    /* ---- 传送（只去已解锁章节；所选章节只记在内存里） ---- */
    function travelTo(key) {
      if (!THEMES[key] || !chapterUnlocked(key)) { fogMsg("🔒 尚未解锁"); return; }
      closeWorldMap(); hideCard();
      if (key === S.key) return;
      if (reduce) { renderScene(key); return; }
      R.scene.classList.add("is-fading");
      timers.push(setTimeout(function () {
        if (!inst || inst.dead) return;
        renderScene(key);
        R.scene.classList.remove("is-fading");
      }, 280));
    }

    /* ---- 全息星图 ---- */
    function buildWorldMap() {
      var P = isPortraitView(), html = "", labels = "";
      html += '<div class="wmap-starfield" aria-hidden="true"><div class="wmap-starfield__stars"></div><div class="wmap-starfield__grid"></div><div class="wmap-starfield__radar"></div></div>';
      html += '<div class="wmap-compass" aria-hidden="true"><svg viewBox="0 0 64 64" width="56" height="56">' +
        '<circle cx="32" cy="32" r="28" fill="rgba(8,12,28,0.7)" stroke="#22d3ee" stroke-width="2"/>' +
        '<circle cx="32" cy="32" r="22" fill="none" stroke="#a78bfa" stroke-width="1" stroke-dasharray="2 3"/>' +
        '<polygon points="32,6 36,32 32,28 28,32" fill="#22d3ee"/><polygon points="32,58 28,32 32,36 36,32" fill="#67e8f9"/>' +
        '<polygon points="6,32 32,28 28,32 32,36" fill="#a78bfa"/><polygon points="58,32 32,36 36,32 32,28" fill="#a78bfa"/>' +
        '<circle cx="32" cy="32" r="3" fill="#f472b6" stroke="#fff" stroke-width="1"/>' +
        '<text x="32" y="14" text-anchor="middle" font-size="7" font-weight="800" fill="#e0f2fe">N</text></svg></div>';
      var route = (P && WMAP.routePortrait) || WMAP.route || [];
      if (route.length) {
        var d = KIT.pathThrough(route);
        html += '<svg class="wmap-route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' +
          '<defs><linearGradient id="tnWmapBeam" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#22d3ee"/><stop offset="55%" stop-color="#a78bfa"/><stop offset="100%" stop-color="#c084fc"/></linearGradient></defs>' +
          '<path class="wmap-route__glow" d="' + d + '"/><path class="wmap-route__dash" d="' + d + '"/></svg>';
      }
      WMAP.lands.forEach(function (land) {
        var lx = P && land.xP != null ? land.xP : land.x, ly = P && land.yP != null ? land.yP : land.y;
        var lw = P && land.wP != null ? land.wP : land.w, lh = P && land.hP != null ? land.hP : land.h;
        var locked = !!land.locked, vars = "--land-glow:" + (land.glow || "#22d3ee") + ";--land-tone:" + (land.tone || "#0f766e");
        html += '<div class="wmap-land' + (locked ? " is-locked" : "") + '" style="left:' + lx + "%;top:" + ly + "%;width:" + lw + "%;height:" + lh + "%;" + vars + '">' +
          KIT.planetSvg(locked) + (locked ? '<div class="wmap-fog" aria-hidden="true"></div>' : "") +
          '<div class="wmap-land__icon" aria-hidden="true">' + KIT.landIcon(land.icon) + "</div></div>";
        /* 名称 / 副标题放进独立的标签层（z 高于光束与节点），不再被光束压住 */
        labels += '<div class="wmap-land__name' + (locked ? " is-locked" : "") + '" data-land="' + esc(land.id) + '" style="left:' + (lx + lw / 2) + "%;top:" + (ly + lh * 0.58) + "%;" + vars + '">' + esc(land.name) + "</div>";
        if (land.subtitle) labels += '<div class="wmap-land__sub' + (locked ? " is-locked" : "") + '" style="left:' + (lx + lw / 2) + "%;top:" + (ly + lh * 0.92) + "%;" + vars + '">' + esc(land.subtitle) + "</div>";
        (land.chapters || []).forEach(function (ch) {
          if (!THEMES[ch.key]) return;
          var st = chapterMarkState(ch.key), cx = P && ch.xP != null ? ch.xP : ch.x, cy = P && ch.yP != null ? ch.yP : ch.y;
          var inner = st === "cur" ? '<div class="wmap-mark__dot"><div class="wmap-mark__chibi">' + chibi("player", 30) + "</div></div>"
            : '<div class="wmap-mark__dot">' + (st === "done" ? "✓" : st === "locked" ? "🔒" : "·") + "</div>";
          var t = THEMES[ch.key];
          html += '<button type="button" class="wmap-mark is-' + st + '" data-key="' + esc(ch.key) + '" style="left:' + cx + "%;top:" + cy + '%"' +
            ' aria-label="' + esc(t.land + " · " + t.name) + "（" + (st === "locked" ? "未解锁" : st === "cur" ? "当前所在" : st === "done" ? "已通关 · 可传送" : "可传送") + '）"' +
            (st === "locked" ? ' aria-disabled="true"' : "") + ">" + inner + '<div class="wmap-mark__tip">' + esc(ch.name) + "</div></button>";
        });
      });
      R.wcanvas.innerHTML = html + '<div class="wmap-labels" aria-hidden="true">' + labels + "</div>";
      R.wcanvas.querySelectorAll(".wmap-mark").forEach(function (btn) {
        btn.addEventListener("click", function (e) {
          e.stopPropagation();
          var k = btn.getAttribute("data-key");
          if (chapterMarkState(k) === "locked") { fogMsg("🔒「" + THEMES[k].name + "」尚未解锁 · 先通关前一章"); return; }
          travelTo(k);
        }, sig);
      });
    }
    function openWorldMap() {
      if (S.dialogOpen) return;
      hideCard(); closeMenu(); closePanel(); S.keys = {};
      buildWorldMap();
      S.wmapOpen = true; R.wmap.hidden = false; R.wmap.classList.add("is-open");
      syncChrome();
      var cur = R.wcanvas.querySelector(".wmap-mark.is-cur") || R.wmapClose;
      cur.focus({ preventScroll: true });
    }
    function closeWorldMap() {
      if (!S.wmapOpen) return;
      S.wmapOpen = false; R.wmap.classList.remove("is-open"); R.wmap.hidden = true;
      syncChrome();
      R.viewport.focus({ preventScroll: true });
    }
    R.mapBtn.addEventListener("click", function (e) { e.stopPropagation(); if (S.wmapOpen) closeWorldMap(); else openWorldMap(); }, sig);
    R.wmapClose.addEventListener("click", function (e) { e.stopPropagation(); closeWorldMap(); }, sig);
    R.wmap.addEventListener("click", function (e) { if (e.target === R.wmap) closeWorldMap(); }, sig);

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
      if (!done && stOf(lv) !== "cur") return;
      commit(function (s) { if (done) delete s.done[id]; else s.done[id] = true; });
      hideCard();
      var nk = nextKey(lv.key);
      if (!done) toast("★", "CH." + lv.chapter + " BOSS 通过", '<b>+' + lv.xp + ' XP</b>' + (lv.badge ? ' · 徽章「' + esc(lv.badge) + '」' : '') + (nk && chapterUnlocked(nk) ? ' · 传送门已开启「' + esc(THEMES[nk].name) + '」' : ''));
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
    function fmt(s) {
      s = String(s || "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1");
      var out = "", re = /`([^`]+)`/g, last = 0, m;
      while ((m = re.exec(s))) { out += esc(s.slice(last, m.index)).replace(/\n/g, "<br>"); out += '<code class="dlg-code">' + esc(m[1]) + '</code>'; last = m.index + m[0].length; }
      return out + esc(s.slice(last)).replace(/\n/g, "<br>");
    }
    function syncChrome() {
      /* 对话 / 卷轴打开时隐藏虚拟方向键，避免挡在对话框下方 */
      var scrollOpen = R.scroll && !R.scroll.hidden;
      root.classList.toggle("is-dialoging", !!(S.dialogOpen || scrollOpen || S.wmapOpen));
    }
    function openDialogShell(npcName, spriteKey) {
      hideCard(); closeMenu();
      S.dialogOpen = true; S.keys = {}; setWalk(false);
      R.dialog.hidden = false; R.dialog.classList.add("is-open");
      R.who.textContent = npcName;
      R.face.innerHTML = portrait(spriteKey, "normal");
      R.quiz.hidden = true; R.quiz.innerHTML = ""; R.scrollWrap.hidden = true; R.choices.innerHTML = "";
      syncChrome();
    }
    function openNpc(npc) {
      if (npc.teach && npc.questId) {
        var lv = byId[npc.questId];
        if (lv && stOf(lv) === "lock") {
          var prev = lv.prev;
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
      function go() {
        DIALOGS = (window.TN_DIALOGS && window.TN_DIALOGS.dialogs) || DIALOGS;
        var d = DIALOGS[qid]; if (!d) { showCard(qid); return; }
        S.flavor = null;
        S.teach = { qid: qid, page: 0, revealed: false };
        openDialogShell(d.npc.name, d.npc.sprite);
        renderTeach();
      }
      if (DIALOGS[qid]) { go(); return; }
      var group = /^java-/.test(qid) ? "java" : "basics";
      if (window.TN_DIALOGS_LOAD) window.TN_DIALOGS_LOAD(group, go);
      else go();
    }
    function closeDialog() {
      S.dialogOpen = false; S.teach = null; S.flavor = null;
      R.dialog.classList.remove("is-open"); R.dialog.hidden = true;
      closeScroll();
      syncChrome();
      R.viewport.focus({ preventScroll: true });
    }
    function renderTeach() {
      var t = S.teach; if (!t) return;
      var d = DIALOGS[t.qid], pages = d.pages, page = pages[t.page];
      if (!page) { closeDialog(); return; }
      R.face.innerHTML = portrait(d.npc.sprite, page.expr || "normal");
      /* 页数多时用计数器，避免一排圆点挤爆 */
      if (pages.length > 12) {
        R.dots.innerHTML = '<span class="dialog__prog">' + (t.page + 1) + " / " + pages.length + "</span>";
      } else {
        R.dots.innerHTML = pages.map(function (_, i) { return "<i" + (i === t.page ? ' class="is-on"' : "") + "></i>"; }).join("");
      }
      R.choices.innerHTML = ""; R.quiz.hidden = true; R.quiz.innerHTML = ""; R.scrollWrap.hidden = true;
      R.text.innerHTML = fmt((page.lines || []).join("\n")); /* 全文即时显示，不做打字机、不截断 */
      if (page.type === "quiz") renderQuiz(t, page);
      if (page.scroll && d.scrolls && d.scrolls[page.scroll]) {
        var scBtn = d.scrolls[page.scroll];
        R.scrollWrap.hidden = false;
        R.btnScroll.textContent = scBtn.kind === "links" ? "📜 资料卷轴" : "📜 展开卷轴";
        R.btnScroll.onclick = function (e) { e.stopPropagation(); openScroll(scBtn); };
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
      R.scrollTitle.textContent = sc.title || (sc.kind === "links" ? "资料索引" : "卷轴");
      if (sc.kind === "links" && sc.items && sc.items.length) {
        R.scrollBody.classList.add("scroll-panel__body--links");
        R.scrollBody.removeAttribute("data-lang");
        R.scrollBody.innerHTML = sc.items.map(function (it) {
          var note = it.note ? " — " + esc(it.note) : "";
          return '<div class="scroll-panel__link"><a href="' + esc(it.url) + '" target="_blank" rel="noopener noreferrer">' +
            esc(it.title) + "</a>" + note + "</div>";
        }).join("");
      } else {
        R.scrollBody.classList.remove("scroll-panel__body--links");
        R.scrollBody.textContent = sc.body || "";
        if (sc.lang) R.scrollBody.setAttribute("data-lang", sc.lang); else R.scrollBody.removeAttribute("data-lang");
      }
      R.scrollClose.focus({ preventScroll: true });
      syncChrome();
    }
    function closeScroll() { R.scroll.hidden = true; syncChrome(); }

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
      var badges = ALL.filter(function (l) { return S.s.done[l.id] && l.badge; }).map(function (l) { return l.badge; });
      if (which === "log" || which === "ach") {
        html += '<h2><span>' + (which === "log" ? "LOG" : "ACH") + '</span>' + (which === "log" ? "冒险日志" : "成就") + '</h2><ul>';
        ORDER.forEach(function (key) {
          var th = THEMES[key];
          html += '<li><b>' + esc(th.land) + ' · 第' + CN[parseKey(key).chapter - 1] + '章「' + esc(th.name) + '」</b>' + (chapterUnlocked(key) ? (key === S.key ? " · ◎ 当前" : "") : " · 🔒 未解锁") + '</li>';
          levelsOf(key).forEach(function (l) {
            var st = stOf(l);
            html += '<li>' + (st === "done" ? "✓" : st === "cur" ? "▶" : "·") + ' ' + (l.boss ? "CH." + l.chapter + " BOSS · " : "QUEST " + l.num + " · ") + esc(l.name) +
              (which === "ach" && l.badge ? ' — 「' + esc(l.badge) + '」' : '') + '</li>';
          });
        });
        var nq = ALL.filter(function (l) { return !l.boss; }), nb = ALL.filter(function (l) { return l.boss; });
        html += '</ul><p class="tn-g-note">' + nq.filter(function (l) { return S.s.done[l.id]; }).length + '/' + nq.length + ' 关 · ' + nb.filter(function (l) { return S.s.done[l.id]; }).length + '/' + nb.length + ' BOSS' + (A.isDemo() ? ' · 演示数据' : '') + '</p>';
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
          '<div class="tn-g-charname">冒险者</div><p class="tn-g-note">Lv.' + t.lv + ' · ' + t.xp + ' / ' + t.max + ' XP · 知识世界 · ' + esc(S.theme ? S.theme.land + " · " + S.theme.name : "") + '</p></div>';
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
      if (a === "map") openWorldMap();
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
      maybeShowHint();
      R.viewport.focus({ preventScroll: true });
    }
    function maybeShowHint() {
      if (isTouch() || hintSeen()) return;
      markHintSeen(); /* 第一次显示即记住：之后（含刷新）不再出现 */
      R.hint.classList.remove("is-fade");
      R.hint.hidden = false;
      timers.push(setTimeout(dismissHint, 4000));
    }
    function dismissHint() {
      if (R.hint.hidden) return;
      if (reduce) { R.hint.hidden = true; return; } /* 减少动态：直接隐藏，不做淡出 */
      R.hint.classList.add("is-fade");
      timers.push(setTimeout(function () { R.hint.hidden = true; }, 950));
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
        else if (S.wmapOpen) closeWorldMap();
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
      if (S.wmapOpen || S.panel || !R.menu.hidden) return;
      if (e.key === "m" || e.key === "M") { e.preventDefault(); openWorldMap(); return; }
      if (KEYMAP[e.key]) { S.keys[KEYMAP[e.key]] = true; e.preventDefault(); kick(); hideCard(); dismissHint(); return; }
      var onNode = e.target && e.target.closest && e.target.closest(".node, .npc, .gate, .qcard, .hud-tools, .game-menu-btn, .hud-btn");
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
      if ((dx || dy) && !S.dialogOpen && !S.wmapOpen && !S.moving) {
        var len = Math.hypot(dx, dy) || 1, sp = 3; /* 3px / 帧，换算成 % */
        S.pos.x = clamp(S.pos.x + dx / len * sp / vw() * 100, 3, 97);
        S.pos.y = clamp(S.pos.y + dy / len * sp / vh() * 100, 12, 96);
        placePlayer(); updateNear(); setWalk(true);
        raf = requestAnimationFrame(tick);
      } else {
        if (!S.moving) setWalk(false);
        looping = false;
      }
    }
    R.viewport.addEventListener("click", function (e) {
      if (e.target.closest(".node,.npc,.gate,.qcard")) return;
      var r = R.viewport.getBoundingClientRect();
      var wx = (e.clientX - r.left) / r.width * 100, wy = (e.clientY - r.top) / r.height * 100, best = null, bd = 120;
      LEVELS.forEach(function (lv) { var d = dpx(lv.x, lv.y, wx, wy); if (d < bd) { bd = d; best = lv.id; } });
      hideCard();
      if (best) onNodeClick(best);
    }, sig);
    window.addEventListener("resize", function () {
      if (isPortraitView() !== S.portrait) { hideCard(); renderScene(S.key); if (S.wmapOpen) buildWorldMap(); }
      else { layoutNpcs(); if (S.wmapOpen) buildWorldMap(); }
    }, sig);

    /* ---- 启动：只渲染当前在学的章节 ---- */
    renderScene(currentChapter());
    var started = false;
    try { started = sessionStorage.getItem(SESSION_KEY) === "1"; } catch (e) {}
    R.hint.hidden = true;
    if (started) R.start.hidden = true; else showStart();

    return {
      root: root, dead: false,
      refresh: function () {
        DIALOGS = (window.TN_DIALOGS && window.TN_DIALOGS.dialogs) || DIALOGS;
        S.s = A.load(); buildNpcs(); renderAll(); if (S.wmapOpen) buildWorldMap();
      },
      destroy: function () {
        this.dead = true; ac.abort(); cancelAnimationFrame(raf);
        timers.forEach(clearTimeout);
        root.remove(); document.body.classList.remove("tn-world-on");
      },
      /* 测试 / 截图用的只读入口 */
      debug: { S: S, get LEVELS() { return LEVELS; }, get NPCS() { return NPCS; }, ORDER: ORDER, byId: byId, openTeach: openTeach, showCard: showCard, openScroll: openScroll,
        renderTeach: renderTeach, begin: begin, travelTo: travelTo, openWorldMap: openWorldMap, closeWorldMap: closeWorldMap,
        place: function (x, y) { S.pos = { x: x, y: y }; placePlayer(); updateNear(); } }
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
      function goWorld() {
        /* 刷新 dialogs 引用（懒加载完成后） */
        if (inst && inst.root.isConnected) inst.refresh();
        else { teardownWorld(); inst = mountWorld(); }
      }
      if (window.TN_DIALOGS_LOAD) window.TN_DIALOGS_LOAD("basics", goWorld);
      else goWorld();
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
