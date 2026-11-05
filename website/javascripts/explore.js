/* tech-notes · Java 探索视图（RPG overworld）
 * 只在 /topics/java/ 激活；关卡数据全部来自 quest-data.js，进度通过 quest.js 暴露的 window.TN_QUEST
 * 读写同一个 tn-quest-v2（?demo 只在内存）。挂载失败时自动撤掉，quest.js 的「闯关地图」原样保留作兜底。 */
(function () {
  "use strict";
  var inst = null; // 当前页面上的实例（instant navigation 下每次换页先 teardown）

  /* Q版精灵：依赖先加载的 chibi-sprites.js（window.TN_CHIBI_SVG） */
  var SVG = window.TN_CHIBI_SVG || {};

  var CN = ["一", "二", "三", "四", "五", "六"], RN = ["I", "II", "III", "IV", "V", "VI"];
  function esc(t) { return String(t).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ---------- 由 quest-data 推导出关卡与地形（只用 id / chapter 顺序做几何，名字一律取数据） ---------- */
  function buildModel(API) {
    var T = API.topic, Q = T.quests, B = T.bosses, chapters = T.chapters;
    var regions = [], levels = [], byId = {};
    var RW_GAP = 160, ROW_H = 600, TOP = 120, LEFT = 40;
    var rowX = [];
    chapters.forEach(function (name, ci) {
      var c = ci + 1, qs = Q.filter(function (q) { return q.chapter === c; });
      var boss = B.filter(function (b) { return b.chapter === c; })[0] || null;
      var n = qs.length, w = 300 + 200 * Math.max(n, 1), h = 480;
      var row = Math.floor(ci / 2), col = ci % 2;
      var rx = col === 0 ? LEFT : rowX[row], ry = TOP + row * ROW_H;
      rowX[row] = rx + w + RW_GAP;
      var R = { c: c, name: name, x: rx, y: ry, w: w, h: h, quests: qs, boss: boss };
      regions.push(R);
      qs.forEach(function (q, k) {
        var lv = { id: q.id, q: q, boss: false, chapter: c, region: R, idx: Q.indexOf(q),
          x: rx + 140 + k * 200, y: ry + (k % 2 ? 150 : 210), sid: API.shortId(q.id), name: q.name };
        levels.push(lv); byId[lv.id] = lv;
      });
      if (boss) {
        var bl = { id: boss.id, q: boss, boss: true, chapter: c, region: R, idx: -1,
          x: rx + 140 + n * 200, y: ry + 220, sid: "B" + c, name: boss.name };
        levels.push(bl); byId[bl.id] = bl;
      }
    });
    var W = 0, H = 0;
    regions.forEach(function (r) { W = Math.max(W, r.x + r.w + 60); H = Math.max(H, r.y + r.h + 80); });
    return { T: T, Q: Q, B: B, chapters: chapters, regions: regions, levels: levels, byId: byId, W: W, H: H };
  }

  function bossOf(M, c) { for (var i = 0; i < M.B.length; i++) if (M.B[i].chapter === c) return M.B[i]; return null; }
  function range(M, c) {
    var qs = M.regions[c - 1] ? M.regions[c - 1].quests : [];
    return qs.length ? M.byId[qs[0].id].sid + "–" + M.byId[qs[qs.length - 1].id].sid : "";
  }

  /* 章节 c 是否在迷雾中：上一章 BOSS 未通过，且本章还没有任何已通关的关卡 */
  function fogged(M, s, c) {
    if (c <= 1) return false;
    var pb = bossOf(M, c - 1);
    if (!pb || s.done[pb.id]) return false;
    return !M.regions[c - 1].quests.some(function (q) { return s.done[q.id]; });
  }

  function status(API, M, s, lv) {
    if (lv.boss) return API.bossState(s, lv.q);
    var st = API.state(s, lv.idx);
    if (st === "lock") {
      var cur = API.current(s);
      if (cur >= 0 && lv.idx === cur + 1 && !fogged(M, s, lv.chapter)) return "next";
    }
    return st;
  }

  /* 文案占位符：名字一律从数据和当前进度取 */
  function fill(API, M, s, text) {
    return String(text).replace(/\{(\w+)(?::([\w-]+))?\}/g, function (all, k, a) {
      var c = parseInt(a, 10), lv = a ? M.byId[a] : null, b = c ? bossOf(M, c) : null;
      switch (k) {
        case "name": return lv ? lv.name : all;
        case "badge": return lv ? lv.q.badge : all;
        case "ch": return M.chapters[c - 1] || all;
        case "chquests": return M.regions[c - 1] ? M.regions[c - 1].quests.map(function (q) { return q.name; }).join(" → ") : all;
        case "range": return range(M, c);
        case "boss": return b ? b.name : all;
        case "bossxp": return b ? String(b.xp) : all;
        case "bossbadge": return b ? b.badge : all;
        case "key": return API.KEY_V2;
        case "progress": {
          var i = API.current(s);
          if (i < 0) return "全部关卡都已通关，了不起。随时回来复习。";
          var q = M.Q[i], done = API.stats(s).q;
          return (done ? "你已通关 " + done + " 关，" : "你还没开始，") + "下一站是 QUEST " + API.shortId(q.id) + "「" + q.name + "」。";
        }
        case "remain": {
          if (!M.regions[c - 1]) return "";
          var left = M.regions[c - 1].quests.filter(function (q) { return !s.done[q.id]; }).map(function (q) { return API.shortId(q.id); });
          var bossLeft = b && !s.done[b.id];
          if (!left.length && !bossLeft) return "你已满足条件。";
          return "你还差 " + left.concat(bossLeft ? ["章节测验"] : []).join("、") + "。";
        }
      }
      return all;
    });
  }

  /* ---------- 挂载 ---------- */
  function mount(API) {
    var inner = document.querySelector(".md-content__inner");
    if (!inner) return null;
    inner.querySelectorAll(".tn2-x").forEach(function (e) { e.remove(); });
    var qmap = inner.querySelector(".tn2-qmap");
    var h2 = document.getElementById("quest-map");
    if (!qmap && !h2) return null;

    var M = buildModel(API);
    var reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
    var ac = typeof AbortController === "function" ? new AbortController() : null;
    var offs = []; // 无 AbortController 时的手动解绑
    var raf = 0, timers = [];
    var S = { s: API.load(), pos: { x: 0, y: 0 }, keys: {}, walking: null, nearNode: null, nearNpc: null, dialog: null, panel: null, moved: false };

    function on(target, type, fn, opts) {
      if (ac) target.addEventListener(type, fn, Object.assign({ signal: ac.signal }, opts || {}));
      else { target.addEventListener(type, fn, opts); offs.push(function () { target.removeEventListener(type, fn, opts); }); }
    }
    function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }

    /* DOM 骨架 */
    var root = el("section", "tn2-x" + (reduce ? " tn2-x--still" : ""));
    root.setAttribute("aria-label", "Java 探索地图");
    root.innerHTML =
      '<div class="tn2-x__vp" tabindex="0" role="application" aria-roledescription="探索地图" aria-describedby="tn2-x-help">' +
        '<div class="tn2-x__world"></div>' +
      '</div>' +
      '<p class="tn2-x__sr" id="tn2-x-help">点击或聚焦地图后：WASD / 方向键移动，Enter 或空格与附近的关卡、NPC 交互，L 冒险日志，I 背包，C 角色，Esc 关闭。Tab 可逐个选中关卡节点。也可用右上角「列表」切换到文字版闯关地图。</p>' +
      '<div class="tn2-x__hint" aria-hidden="true">点地图后 WASD / 方向键移动 · Enter 交互 · L / I / C 面板</div>' +
      '<div class="tn2-x__hud" role="status" aria-live="polite"></div>' +
      '<div class="tn2-x__tools">' +
        '<button type="button" class="tn2-x__ib" data-act="list" aria-pressed="false" title="列表视图（文字版闯关地图）">☰</button>' +
        '<button type="button" class="tn2-x__ib" data-act="log" title="冒险日志 (L)">L</button>' +
        '<button type="button" class="tn2-x__ib" data-act="inv" title="背包 / 徽章 (I)">I</button>' +
        '<button type="button" class="tn2-x__ib" data-act="char" title="角色 (C)">C</button>' +
      '</div>' +
      '<div class="tn2-x__dpad" aria-hidden="true">' +
        '<button type="button" tabindex="-1" class="u" data-d="up">▲</button><button type="button" tabindex="-1" class="l" data-d="left">◀</button>' +
        '<button type="button" tabindex="-1" class="r" data-d="right">▶</button><button type="button" tabindex="-1" class="d" data-d="down">▼</button>' +
      '</div>' +
      '<div class="tn2-x__fogmsg" role="status" aria-live="polite"></div>' +
      '<div class="tn2-x__overlay" hidden><div class="tn2-x__panel" role="dialog" aria-modal="false" tabindex="-1"></div></div>' +
      '<div class="tn2-x__preview" role="dialog" aria-label="关卡详情" tabindex="-1" hidden></div>' +
      '<div class="tn2-x__dialog" role="dialog" aria-label="对话" hidden>' +
        '<div class="tn2-x__face" aria-hidden="true"></div>' +
        '<div><div class="tn2-x__meta"></div><div class="tn2-x__text" aria-live="polite"></div>' +
        '<button type="button" class="tn2-x__next">▼ 继续</button><div class="tn2-x__choices"></div></div>' +
      '</div>' +
      '<div class="tn2-x__toast" role="status" aria-live="polite" hidden></div>';

    var vp = root.querySelector(".tn2-x__vp"), world = root.querySelector(".tn2-x__world");
    var hud = root.querySelector(".tn2-x__hud"), hint = root.querySelector(".tn2-x__hint");
    var fogMsg = root.querySelector(".tn2-x__fogmsg"), overlay = root.querySelector(".tn2-x__overlay"), panel = root.querySelector(".tn2-x__panel");
    var preview = root.querySelector(".tn2-x__preview"), dlg = root.querySelector(".tn2-x__dialog"), toast = root.querySelector(".tn2-x__toast");
    world.style.width = M.W + "px"; world.style.height = M.H + "px";

    /* 静态地形 */
    var terrain = el("div", "tn2-x__terrain");
    terrain.setAttribute("aria-hidden", "true");
    world.appendChild(terrain);
    M.regions.forEach(function (R) {
      var r = el("div", "tn2-x-region tn2-x-region--" + ((R.c - 1) % 3 + 1));
      r.style.cssText = "left:" + R.x + "px;top:" + R.y + "px;width:" + R.w + "px;height:" + R.h + "px";
      terrain.appendChild(r);
      var sp = el("div", "tn2-x-sign", '<div class="tn2-x-sign__b">CHAPTER ' + (RN[R.c - 1] || R.c) + " · " + esc(R.name) + '</div><div class="tn2-x-sign__p"></div>');
      sp.style.left = (R.x + 30) + "px"; sp.style.top = (R.y + 16) + "px";
      terrain.appendChild(sp);
    });
    /* 同一行相邻章节之间：河 + 桥 */
    for (var ri = 0; ri + 1 < M.regions.length; ri++) {
      var A = M.regions[ri], Bn = M.regions[ri + 1];
      if (A.y !== Bn.y) continue;
      var rvx = A.x + A.w + 30, rv = el("div", "tn2-x-river");
      rv.style.cssText = "left:" + rvx + "px;top:" + (A.y + 10) + "px;height:" + (A.h - 20) + "px";
      terrain.appendChild(rv);
      var by = (A.y + 200), br = el("div", "tn2-x-bridge");
      br.style.cssText = "left:" + (rvx - 15) + "px;top:" + by + "px";
      terrain.appendChild(br);
      var fl = el("div", "tn2-x-flag", "<i></i>");
      fl.style.cssText = "left:" + (rvx + 45) + "px;top:" + (by - 28) + "px";
      terrain.appendChild(fl);
    }
    /* 装饰：按区域相对位置撒树石，避开节点与 NPC */
    var avoid = M.levels.map(function (l) { return [l.x, l.y + 20]; });
    var npcDefs = (M.T.explore && M.T.explore.npcs) || [];
    npcDefs.forEach(function (n) { var a = M.byId[n.at]; if (a) avoid.push([a.x + (n.dx || 0), a.y + (n.dy || 0)]); });
    function clear(x, y, d) { return avoid.every(function (p) { return Math.abs(p[0] - x) > d || Math.abs(p[1] - y) > d; }); }
    var TREES = [[.04, .2], [.18, .1], [.36, .14], [.6, .86], [.74, .12], [.92, .84], [.14, .9], [.5, .06], [.84, .3], [.3, .8], [.96, .5], [.66, .5]];
    var ROCKS = [[.26, .88], [.44, .82], [.8, .16], [.08, .6], [.56, .9]];
    M.regions.forEach(function (R) {
      TREES.forEach(function (p) {
        var x = R.x + p[0] * R.w, y = R.y + p[1] * R.h;
        if (!clear(x, y, 80)) return;
        var t = el("div", "tn2-x-tree", SVG.tree); t.style.left = x + "px"; t.style.top = y + "px"; terrain.appendChild(t);
      });
      ROCKS.forEach(function (p) {
        var x = R.x + p[0] * R.w, y = R.y + p[1] * R.h;
        if (!clear(x, y, 70)) return;
        var t = el("div", "tn2-x-rock", SVG.rock); t.style.left = x + "px"; t.style.top = y + "px"; terrain.appendChild(t);
      });
    });
    [[200, 70], [640, 60], [1400, 80], [420, 700]].forEach(function (p, i) {
      var c = el("div", "tn2-x-cloud");
      c.style.cssText = "left:" + p[0] + "px;top:" + p[1] + "px;width:" + (80 + i * 20) + "px;height:" + (36 + i * 8) + "px;animation-delay:" + (i * 4) + "s";
      terrain.appendChild(c);
    });
    /* 路径：相邻关卡相连；跨行时绕到两行之间的空地 */
    var d = "";
    for (var li = 0; li + 1 < M.levels.length; li++) {
      var p0 = M.levels[li], p1 = M.levels[li + 1];
      d += "M" + p0.x + " " + p0.y;
      if (p0.region.y !== p1.region.y) {
        var gy = p1.region.y - 60;
        d += " L" + p0.x + " " + gy + " L" + p1.x + " " + gy;
      }
      d += " L" + p1.x + " " + p1.y + " ";
    }
    var svgNS = "http://www.w3.org/2000/svg", ps = document.createElementNS(svgNS, "svg");
    ps.setAttribute("class", "tn2-x-paths"); ps.setAttribute("width", M.W); ps.setAttribute("height", M.H); ps.setAttribute("aria-hidden", "true");
    var pth = document.createElementNS(svgNS, "path"); pth.setAttribute("d", d); ps.appendChild(pth);
    terrain.appendChild(ps);

    /* 动态层：节点 / 标签 / BOSS / NPC / 迷雾 / 玩家 / 任务卡 */
    var layerNodes = el("div", "tn2-x__nodes"), layerLabels = el("div", "tn2-x__labels"), layerNpc = el("div", "tn2-x__npcs"), layerFog = el("div", "tn2-x__fogs");
    layerLabels.setAttribute("aria-hidden", "true");
    var player = el("div", "tn2-x-player",
      '<div class="tn2-x-player__shadow"></div><div class="tn2-x-player__body">' + SVG.player + '</div><div class="tn2-x-player__tag">冒险者</div>');
    player.setAttribute("aria-hidden", "true");
    var qcard = el("div", "tn2-x-qcard"); qcard.hidden = true;
    var bubble = el("div", "tn2-x-bubble", "按 Enter 找我聊聊操作 →"); bubble.hidden = true; bubble.setAttribute("aria-hidden", "true");
    world.appendChild(layerNodes); world.appendChild(layerNpc); world.appendChild(player); world.appendChild(layerLabels);
    world.appendChild(layerFog); world.appendChild(bubble); world.appendChild(qcard);

    function stance(lv) { return { x: lv.x - 50, y: lv.y + 6 }; } // 站在节点左侧，不压住节点和下方标签

    var npcs = [], labEls = {};
    function render() {
      var s = S.s;
      layerNodes.innerHTML = ""; layerLabels.innerHTML = ""; labEls = {}; layerFog.innerHTML = ""; layerNpc.innerHTML = "";
      M.levels.forEach(function (lv) {
        var st = status(API, M, s, lv), fog = fogged(M, s, lv.chapter);
        lv.st = st; lv.fog = fog;
        var b = el("button", "tn2-x-node is-" + st + (lv.boss ? " tn2-x-node--boss" : ""));
        b.type = "button"; b.dataset.id = lv.id;
        b.style.left = lv.x + "px"; b.style.top = lv.y + "px";
        var stTxt = { done: "已通关", cur: lv.boss ? "可挑战" : "当前关卡", next: "下一关", lock: "未解锁" }[st];
        b.setAttribute("aria-label", (lv.boss ? "CH." + lv.chapter + " BOSS " : "QUEST " + lv.sid + " ") + lv.name + "，" + stTxt + (fog ? "（迷雾中）" : ""));
        if (fog) b.tabIndex = -1;
        if (lv.boss) {
          b.innerHTML = '<span class="tn2-x-lair' + (st === "lock" ? " is-lock" : "") + '" aria-hidden="true"><span class="tn2-x-lair__aura"></span><span class="tn2-x-lair__plat"></span>' +
            ((window.TN_CHIBI && TN_CHIBI["boss" + lv.chapter]) ? TN_CHIBI["boss" + lv.chapter]() : SVG.boss) + (st === "lock" ? '<span class="tn2-x-lair__chain">⛓ 建设中</span>' : st === "done" ? '<span class="tn2-x-lair__ok">✓</span>' : "") + "</span>";
        } else {
          b.innerHTML = '<span class="tn2-x-node__num" aria-hidden="true">' + esc(lv.sid) + "</span>";
        }
        layerNodes.appendChild(b);
        var lab = el("div", "tn2-x-label is-" + st + (lv.boss ? " tn2-x-label--boss" : ""),
          "<b>" + (lv.boss ? "CH." + lv.chapter + " BOSS" : "QUEST " + esc(lv.sid)) + "</b>" + esc(lv.name));
        lab.style.left = lv.x + "px"; lab.style.top = (lv.y + (lv.boss ? 50 : 34)) + "px";
        layerLabels.appendChild(lab); labEls[lv.id] = lab;
      });
      M.regions.forEach(function (R) {
        if (!fogged(M, s, R.c)) return;
        var pb = bossOf(M, R.c - 1);
        var f = el("div", "tn2-x-fog tn2-x-fog--" + ((R.c - 1) % 3 + 1),
          '<div class="tn2-x-fog__base"></div><div class="tn2-x-fog__plate"><div class="tn2-x-fog__t">▓▓ 迷雾 ▓▓</div><div class="tn2-x-fog__h">第' + (CN[R.c - 1] || R.c) + "章「" + esc(R.name) + "」· 通关 CH." + (R.c - 1) + " BOSS" + (pb ? "「" + esc(pb.name) + "」" : "") + " 后解锁</div></div>");
        f.style.cssText = "left:" + R.x + "px;top:" + R.y + "px;width:" + R.w + "px;height:" + R.h + "px";
        f.setAttribute("role", "img"); f.setAttribute("aria-label", "未解锁区域：第" + (CN[R.c - 1] || R.c) + "章「" + R.name + "」");
        f.dataset.c = R.c;
        layerFog.appendChild(f);
      });
      npcs = [];
      npcDefs.forEach(function (n) {
        var a = M.byId[n.at]; if (!a) return;
        if (fogged(M, s, n.region || a.chapter)) return;
        if (n.gate && !fogged(M, s, n.gate)) return; // 门卫只在下一章还被迷雾挡住时出现
        var x = a.x + (n.dx || 0), y = a.y + (n.dy || 0), extra = "";
        if (n.sprite === "smith") extra = '<span class="tn2-x-anvil">' + SVG.anvil + '</span><span class="tn2-x-sparks"><i></i><i></i><i></i></span>';
        if (n.sprite === "lib") extra = '<span class="tn2-x-shelf">' + SVG.shelf + "</span>";
        var b = el("button", "tn2-x-npc tn2-x-npc--" + n.sprite,
          '<span class="tn2-x-npc__ind" aria-hidden="true">!</span><span class="tn2-x-npc__body">' + (SVG[n.sprite] || SVG.mentor) + "</span>" +
          '<span class="tn2-x-npc__name">' + esc(n.name) + "</span>" + extra);
        b.type = "button"; b.dataset.npc = n.id; b.setAttribute("aria-label", "与" + n.name + "对话");
        b.style.left = x + "px"; b.style.top = y + "px";
        layerNpc.appendChild(b);
        npcs.push({ def: n, x: x, y: y, el: b });
      });
      var t = API.stats(s);
      hud.innerHTML = '<span class="tn2-x__lv">LV ' + t.lv + '</span><span class="tn2-x__xp"><small>XP ' + t.xp + " / " + t.max + "</small>" +
        '<span class="tn2-x__bar"><i style="width:' + Math.round(t.xp / t.max * 100) + '%"></i></span></span>' +
        '<span class="tn2-x__who">冒险者<small>' + t.q + "/" + M.Q.length + " 关" + (API.isDemo() ? " · 演示" : "") + "</small></span>";
      var mentor = npcs.filter(function (n) { return n.def.id === "mentor"; })[0];
      bubble.hidden = !(mentor && !t.q && !t.b);
      if (mentor) { bubble.style.left = (mentor.x - 10) + "px"; bubble.style.top = (mentor.y - 70) + "px"; }
      if (S.panel) openPanel(S.panel, true);
      updateNear(true);
    }

    function focusLevel(s) {
      var i = API.current(s);
      if (i >= 0) { var lv = M.byId[M.Q[i].id]; if (!fogged(M, s, lv.chapter)) return lv; }
      for (var k = 0; k < M.B.length; k++) if (API.bossState(s, M.B[k]) === "cur") return M.byId[M.B[k].id];
      return M.levels[M.levels.length - 1];
    }

    /* 相机与玩家 */
    var cam = { x: 0, y: 0 };
    function camera(ease) {
      var vw = vp.clientWidth, vh = vp.clientHeight;
      cam.x = clamp(S.pos.x - vw / 2, 0, Math.max(0, M.W - vw));
      cam.y = clamp(S.pos.y - vh / 2, 0, Math.max(0, M.H - vh));
      world.classList.toggle("is-ease", !!ease && !reduce);
      world.style.transform = "translate(" + (-Math.round(cam.x)) + "px," + (-Math.round(cam.y)) + "px)";
    }
    function lookAt(x, y) {
      var vw = vp.clientWidth, vh = vp.clientHeight;
      var nx = clamp(x - vw / 2, 0, Math.max(0, M.W - vw)), ny = clamp(y - vh / 2, 0, Math.max(0, M.H - vh));
      if (x - cam.x > 60 && x - cam.x < vw - 60 && y - cam.y > 60 && y - cam.y < vh - 60) return;
      cam.x = nx; cam.y = ny;
      world.classList.toggle("is-ease", !reduce);
      world.style.transform = "translate(" + (-Math.round(nx)) + "px," + (-Math.round(ny)) + "px)";
    }
    function placePlayer() { player.style.left = S.pos.x + "px"; player.style.top = S.pos.y + "px"; }

    function inFog(x, y) {
      for (var i = 0; i < M.regions.length; i++) {
        var R = M.regions[i];
        if (fogged(M, S.s, R.c) && x > R.x + 20 && x < R.x + R.w - 20 && y > R.y + 20 && y < R.y + R.h - 20) return R;
      }
      return null;
    }
    function fogNotice(R) {
      var pb = bossOf(M, R.c - 1);
      fogMsg.textContent = "第" + (CN[R.c - 1] || R.c) + "章「" + R.name + "」笼罩在迷雾中 · 先通关 CH." + (R.c - 1) + " BOSS" + (pb ? "「" + pb.name + "」" : "");
      fogMsg.classList.add("is-show");
      clearTimeout(fogNotice.t); fogNotice.t = later(function () { fogMsg.classList.remove("is-show"); }, 2400);
    }

    /* 走近检测：任务卡与 NPC「！」 */
    function updateNear(force) {
      var best = null, bd = 1e9;
      M.levels.forEach(function (lv) {
        if (lv.fog) return;
        var st = stance(lv), dd = Math.min(Math.hypot(st.x - S.pos.x, st.y - S.pos.y), Math.hypot(lv.x - S.pos.x, lv.y - S.pos.y));
        if (dd < 70 && dd < bd) { bd = dd; best = lv; }
      });
      if (best !== S.nearNode || force) { S.nearNode = best; showCard(best); }
      var nb = null, nd = 1e9;
      npcs.forEach(function (n) { var dd = Math.hypot(n.x - S.pos.x, n.y - S.pos.y); if (dd < 72 && dd < nd) { nd = dd; nb = n; } });
      S.nearNpc = nb;
      npcs.forEach(function (n) { n.el.classList.toggle("is-near", n === nb); });
    }
    var STX = { done: "✓ 已通关", cur: "▶ 当前关卡", next: "→ 下一关", lock: "🔒 尚未解锁（笔记可先看）" };
    function goalOf(lv) {
      if (!lv.boss) return lv.q.goal || "";
      return "综合检验第" + (CN[lv.chapter - 1] || lv.chapter) + "章「" + M.chapters[lv.chapter - 1] + "」（QUEST " + range(M, lv.chapter) + "）。题目建设中。";
    }
    function showCard(lv) {
      if (!lv || !preview.hidden || S.dialog) { qcard.hidden = true; return; }
      var link = lv.boss ? "" : '<a class="tn2-x-qcard__go" href="' + esc(API.urlFor(lv.q.path)) + '">进入笔记 →</a>';
      qcard.innerHTML = '<div class="tn2-x-qcard__id">' + (lv.boss ? "CH." + lv.chapter + " BOSS" : "QUEST " + esc(lv.sid)) + " · 第" + (CN[lv.chapter - 1] || lv.chapter) + "章 " + esc(M.chapters[lv.chapter - 1]) + "</div>" +
        '<div class="tn2-x-qcard__name">' + esc(lv.name) + "</div>" +
        '<div class="tn2-x-qcard__st is-' + lv.st + '">' + (lv.boss && lv.st === "cur" ? "▶ 可挑战" : STX[lv.st]) + "</div>" +
        '<p class="tn2-x-qcard__goal">' + esc(goalOf(lv)) + "</p>" +
        '<div class="tn2-x-qcard__row">' + link + '<button type="button" class="tn2-x-qcard__more" data-id="' + esc(lv.id) + '">详情 (Enter)</button></div>';
      qcard.hidden = false;
      var p = placeCard(lv, 236, qcard.offsetHeight || 160);
      qcard.style.left = p.x + "px"; qcard.style.top = p.y + "px";
    }
    /* 任务卡自动摆放：在上/下/左/右/四角候选位里挑与玩家、NPC（含提示气泡）、节点标签重叠最少、且尽量在视口内的位置 */
    function placeCard(lv, w, h) {
      /* 标签按实测尺寸避让（两行标签更高）；读不到时退回估计值 */
      function labBox(o) {
        var e = labEls[o.id], lw = (e && e.offsetWidth) || 136, lh = (e && e.offsetHeight) || 52;
        return [o.x - lw / 2 - 4, o.y + (o.boss ? 50 : 34) - 2, lw + 8, lh + 6];
      }
      var own = labBox(lv), r = lv.boss ? 46 : 28, below = own[1] + own[3] + 4 - lv.y;
      var cands = [
        [lv.x - w / 2, lv.y - r - 8 - h],          // 上
        [lv.x + r + 14, lv.y - h / 2],              // 右
        [lv.x - r - 70 - w, lv.y - h / 2],          // 左（让开站在左侧的玩家）
        [lv.x - w / 2, lv.y + below],               // 下（让开标签）
        [lv.x + r + 10, lv.y - r - h],              // 右上
        [lv.x + r + 10, lv.y + r],                  // 右下
        [lv.x - r - 10 - w, lv.y - r - h],          // 左上
        [lv.x - r - 10 - w, lv.y + r],              // 左下
        [cam.x + 10, lv.y + below],                 // 下（贴视口左缘，窄屏用）
        [cam.x + 10, lv.y - r - 8 - h]              // 上（贴视口左缘）
      ];
      var obst = [[S.pos.x - 22, S.pos.y - 44, 44, 70]]; // 玩家 + 名牌
      npcs.forEach(function (n) { obst.push([n.x - 26, n.y - 30, 52, 70]); });
      if (!bubble.hidden) obst.push([parseFloat(bubble.style.left) - 4, parseFloat(bubble.style.top) - 4, 180, 44]);
      M.levels.forEach(function (o) { obst.push([o.x - (o.boss ? 44 : 30), o.y - (o.boss ? 48 : 30), o.boss ? 88 : 60, o.boss ? 96 : 60]); obst.push(labBox(o)); });
      var vw = vp.clientWidth, vh = vp.clientHeight;
      var dp = root.querySelector(".tn2-x__dpad"), tl = root.querySelector(".tn2-x__tools");
      if (tl && tl.offsetParent) { var tr = tl.getBoundingClientRect(), vr0 = vp.getBoundingClientRect(); obst.push([cam.x + tr.left - vr0.left - 6, cam.y + tr.top - vr0.top - 6, tr.width + 12, tr.height + 12]); }
      if (dp && dp.offsetParent) { // 移动端方向键（半透明）也尽量不压任务卡按钮
        var dr = dp.getBoundingClientRect(), vr = vp.getBoundingClientRect();
        obst.push([cam.x + dr.left - vr.left - 6, cam.y + dr.top - vr.top - 6, dr.width + 12, dr.height + 12]);
      }
      function ov(ax, ay, aw, ah, b) { var x = Math.max(0, Math.min(ax + aw, b[0] + b[2]) - Math.max(ax, b[0])), y = Math.max(0, Math.min(ay + ah, b[1] + b[3]) - Math.max(ay, b[1])); return x * y; }
      var best = null, bs = Infinity;
      cands.forEach(function (c, i) {
        var x = clamp(c[0], 8, M.W - w - 8), y = clamp(c[1], 8, M.H - h - 8);
        var sc = i * 40; // 同分时偏好靠前的候选
        obst.forEach(function (b) { sc += ov(x, y, w, h, b); });
        sc += (w * h - ov(x, y, w, h, [cam.x + 6, cam.y + 6, vw - 52, vh - 70])) * 2; // 出视口（及右侧工具栏、底部状态栏）罚分
        if (sc < bs) { bs = sc; best = { x: x, y: y }; }
      });
      return best;
    }

    /* 移动：只在按键按住或自动寻路时跑 rAF，停下即结束循环 */
    var DIRS = { ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1], ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0], up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    var last = 0, dustAcc = 0;
    function loop(t) {
      raf = 0;
      var dt = last ? Math.min(0.05, (t - last) / 1000) : 0.016; last = t;
      var active = false;
      if (S.walking) { active = stepWalk(dt) || active; }
      else {
        var vx = 0, vy = 0;
        Object.keys(S.keys).forEach(function (k) { if (S.keys[k] && DIRS[k]) { vx += DIRS[k][0]; vy += DIRS[k][1]; } });
        if (vx || vy) {
          var len = Math.hypot(vx, vy), sp = 260 * dt;
          var nx = clamp(S.pos.x + vx / len * sp, 20, M.W - 20), ny = clamp(S.pos.y + vy / len * sp, 30, M.H - 20);
          var R = inFog(nx, ny);
          if (R) { fogNotice(R); } else { S.pos.x = nx; S.pos.y = ny; S.moved = true; }
          active = true;
        }
      }
      player.classList.toggle("is-walk", active && !reduce);
      if (active) {
        placePlayer(); camera(false); updateNear();
        dustAcc += dt; if (!reduce && dustAcc > 0.12) { dustAcc = 0; dust(); }
        raf = requestAnimationFrame(loop);
      } else { last = 0; }
    }
    function kick() { if (!raf) { last = 0; raf = requestAnimationFrame(loop); } }
    function dust() {
      var dd = el("span", "tn2-x-dust"); dd.style.left = (S.pos.x - 4) + "px"; dd.style.top = (S.pos.y + 16) + "px";
      world.appendChild(dd); later(function () { dd.remove(); }, 500);
    }
    function stepWalk(dt) {
      var w = S.walking, tgt = w.pts[0];
      if (!tgt) { var cb = w.done; S.walking = null; if (cb) cb(); return false; }
      var dx = tgt.x - S.pos.x, dy = tgt.y - S.pos.y, dist = Math.hypot(dx, dy), sp = 420 * dt;
      if (reduce || dist <= sp) { S.pos.x = tgt.x; S.pos.y = tgt.y; w.pts.shift(); }
      else { S.pos.x += dx / dist * sp; S.pos.y += dy / dist * sp; }
      return true;
    }
    function walkTo(lv, then) {
      if (lv.fog) { fogNotice(lv.region); return; }
      var from = nearestIndex(), to = M.levels.indexOf(lv), pts = [];
      if (from >= 0 && from !== to) {
        var step = from < to ? 1 : -1;
        for (var i = from + step; i !== to; i += step) {
          var a = M.levels[i - step], b = M.levels[i];
          if (a.region.y !== b.region.y) { var gy = (step > 0 ? b : a).region.y - 60; pts.push({ x: a.x, y: gy }, { x: b.x, y: gy }); }
          pts.push(stance(b));
        }
        var pa = M.levels[to - step];
        if (pa && pa.region.y !== lv.region.y) { var gy2 = (step > 0 ? lv : pa).region.y - 60; pts.push({ x: pa.x, y: gy2 }, { x: lv.x, y: gy2 }); }
      }
      pts.push(stance(lv));
      if (reduce) { S.pos = stance(lv); placePlayer(); camera(false); updateNear(); if (then) then(); return; }
      S.walking = { pts: pts, done: function () { updateNear(true); if (then) then(); } };
      kick();
    }
    function nearestIndex() {
      var bi = -1, bd = 1e9;
      M.levels.forEach(function (lv, i) { if (lv.fog) return; var dd = Math.hypot(lv.x - S.pos.x, lv.y - S.pos.y); if (dd < bd) { bd = dd; bi = i; } });
      return bd < 160 ? bi : -1;
    }

    /* 详情抽屉 + 标记通关 */
    function openPreview(lv) {
      var s = S.s, done = !!s.done[lv.id], t = lv.q;
      var act;
      if (lv.boss) {
        act = done ? '<button type="button" class="tn2-x-btn is-ghost" data-act="toggle">已通过 · 撤销</button>'
          : API.chapterDone(s, lv.chapter) ? '<button type="button" class="tn2-x-btn" data-act="toggle">标记章节测验通过 ✓</button>'
          : '<p class="tn2-x-note">先通关本章全部关卡（' + esc(range(M, lv.chapter)) + "），再回来挑战。</p>";
      } else {
        act = '<a class="tn2-x-btn is-link" href="' + esc(API.urlFor(t.path)) + '">进入笔记 →</a>' +
          (done ? '<button type="button" class="tn2-x-btn is-ghost" data-act="toggle">已通关 · 撤销</button>' : '<button type="button" class="tn2-x-btn" data-act="toggle">标记通关 ✓</button>');
      }
      preview.innerHTML = '<button type="button" class="tn2-x-close" data-act="close" aria-label="关闭">✕</button>' +
        '<div class="tn2-x-preview__id">' + (lv.boss ? "CH." + lv.chapter + " BOSS" : "QUEST " + esc(lv.sid)) + " · 第" + (CN[lv.chapter - 1] || lv.chapter) + "章 " + esc(M.chapters[lv.chapter - 1]) + "</div>" +
        '<div class="tn2-x-preview__h">' + esc(lv.name) + "</div>" +
        '<div class="tn2-x-qcard__st is-' + lv.st + '">' + (lv.boss && lv.st === "cur" ? "▶ 可挑战" : STX[lv.st]) + "</div>" +
        '<p class="tn2-x-preview__p"><b>目标</b> ' + esc(goalOf(lv)) + "</p>" +
        '<p class="tn2-x-preview__p"><b>奖励</b> +' + t.xp + " XP · 徽章「" + esc(t.badge) + "」</p>" +
        (lv.boss ? "" : '<p class="tn2-x-preview__p tn2-x-preview__small">建议：先读笔记、做完页尾「通关自测」，答对 ≥ 80% 再盖章。</p>') +
        '<div class="tn2-x-preview__acts">' + act + "</div>";
      preview.dataset.id = lv.id;
      preview.hidden = false; qcard.hidden = true;
      preview.classList.add("is-open");
      preview.focus({ preventScroll: true });
    }
    function closePreview(back) {
      if (preview.hidden) return;
      preview.hidden = true; preview.classList.remove("is-open");
      if (back !== false) vp.focus({ preventScroll: true });
      updateNear(true);
    }
    function toggleDone(id) {
      var lv = M.byId[id], st = API.load();
      if (st.done[id]) delete st.done[id];
      else {
        if (lv.boss && !API.chapterDone(st, lv.chapter)) return;
        st.done[id] = true;
        celebrate(lv);
      }
      API.save(st);
      API.refresh(); // quest.js 重绘进度条/文字地图，并广播 tn-quest-change → 这里 rerender
      if (!preview.hidden) openPreview(M.byId[id]);
    }
    function celebrate(lv) {
      toast.innerHTML = '<div class="tn2-x-toast__px" aria-hidden="true">★</div><div><div class="tn2-x-toast__h">LEVEL CLEAR</div>' +
        '<div class="tn2-x-toast__b">' + (lv.boss ? "CH." + lv.chapter + " BOSS" : "QUEST " + esc(lv.sid)) + " · " + esc(lv.name) + "<br><b>+" + lv.q.xp + " XP</b> · 徽章「" + esc(lv.q.badge) + "」</div></div>";
      toast.hidden = false;
      clearTimeout(celebrate.t); celebrate.t = later(function () { toast.hidden = true; }, 3200);
      if (reduce) return;
      vp.classList.remove("is-shake"); void vp.offsetWidth; vp.classList.add("is-shake");
      later(function () { vp.classList.remove("is-shake"); }, 500);
      var layer = el("div", "tn2-x-burst");
      layer.style.left = (lv.x) + "px"; layer.style.top = (lv.y) + "px";
      for (var i = 0; i < 18; i++) {
        var p = el("i"), ang = i / 18 * Math.PI * 2, dist = 60 + Math.random() * 80;
        p.style.setProperty("--dx", Math.cos(ang) * dist + "px"); p.style.setProperty("--dy", Math.sin(ang) * dist + "px");
        if (i % 2) p.className = "is-gold";
        layer.appendChild(p);
      }
      world.appendChild(layer); later(function () { layer.remove(); }, 800);
    }

    /* 对话 */
    function openDialog(n) {
      S.dialog = { n: n, q: n.def.lines.slice(), typing: 0 };
      qcard.hidden = true; // 对话期间收起任务卡，避免重叠
      dlg.querySelector(".tn2-x__face").innerHTML = (window.TN_CHIBI && TN_CHIBI.portrait) ? TN_CHIBI.portrait(n.def.sprite || "mentor", "normal") : (SVG[n.def.sprite] || SVG.mentor || "");
      dlg.querySelector(".tn2-x__meta").textContent = n.def.name;
      dlg.hidden = false;
      nextLine();
      dlg.querySelector(".tn2-x__next").focus({ preventScroll: true });
    }
    function closeDialog() {
      if (!S.dialog) return;
      clearInterval(S.dialog.typing); S.dialog = null; dlg.hidden = true; vp.focus({ preventScroll: true });
      updateNear(true);
    }
    function nextLine() {
      var D = S.dialog; if (!D) return;
      var txt = dlg.querySelector(".tn2-x__text"), ch = dlg.querySelector(".tn2-x__choices"), nx = dlg.querySelector(".tn2-x__next");
      if (D.typing) { clearInterval(D.typing); D.typing = 0; txt.textContent = D.full; afterType(); return; } // 跳过打字
      var line = D.q.shift();
      if (!line) { closeDialog(); return; }
      D.line = line; D.full = fill(API, M, S.s, line.text || "");
      ch.innerHTML = ""; nx.hidden = true;
      // 整句一次性显示（不做打字机效果，文字永远完整）
      txt.textContent = D.full; afterType();
    }
    function afterType() {
      var D = S.dialog; if (!D) return;
      var ch = dlg.querySelector(".tn2-x__choices"), nx = dlg.querySelector(".tn2-x__next");
      if (D.line.choice) {
        nx.hidden = true;
        D.line.choice.forEach(function (c, k) {
          var b = el("button", null, esc(c.label)); b.type = "button";
          b.addEventListener("click", function () {
            if (!c.next) { closeDialog(); return; }
            var br = (D.n.def.branches || {})[c.next] || [];
            D.q = br.slice(); nextLine();
            dlg.querySelector(".tn2-x__next").focus({ preventScroll: true });
          });
          ch.appendChild(b);
          if (k === 0) later(function () { b.focus({ preventScroll: true }); }, 0);
        });
      } else {
        nx.hidden = false;
        nx.textContent = D.q.length ? "▼ 继续" : "■ 结束";
      }
    }

    /* 面板：日志 / 背包 / 角色（由真实进度生成） */
    function openPanel(kind, keep) {
      var s = S.s, t = API.stats(s), html = "";
      if (kind === "log") {
        html = '<div class="tn2-x-panel__h"><span>L</span>冒险日志</div><ul>' + M.levels.map(function (lv) {
          var st = lv.st || status(API, M, s, lv);
          return '<li class="is-' + st + '"><b>' + (st === "done" ? "✓" : st === "cur" ? "▶" : st === "next" ? "→" : "·") + "</b> " +
            (lv.boss ? "CH." + lv.chapter + " BOSS" : "QUEST " + esc(lv.sid)) + " · " +
            (lv.boss ? esc(lv.name) : '<a href="' + esc(API.urlFor(lv.q.path)) + '">' + esc(lv.name) + "</a>") + "</li>";
        }).join("") + "</ul>";
      } else if (kind === "inv") {
        var all = M.Q.concat(M.B);
        html = '<div class="tn2-x-panel__h"><span>I</span>背包 · 徽章 ' + (t.q + t.b) + " / " + all.length + '</div><div class="tn2-x-inv">' +
          all.map(function (x) { var has = !!s.done[x.id]; return '<div class="tn2-x-inv__slot' + (has ? " has" : "") + '" title="' + esc(has ? x.badge : "未获得") + '"><span aria-hidden="true">' + (has ? "★" : "?") + "</span><small>" + esc(has ? x.badge : "？？？") + "</small></div>"; }).join("") + "</div>";
      } else {
        var i = API.current(s);
        html = '<div class="tn2-x-panel__h"><span>C</span>角色</div><ul>' +
          "<li><b>名字</b> 冒险者</li><li><b>等级</b> LV " + t.lv + "</li><li><b>经验</b> " + t.xp + " / " + t.max + " XP" + (t.next != null ? "（距 LV " + (t.lv + 1) + " 还差 " + (t.next - t.xp) + "）" : "（已满级）") + "</li>" +
          "<li><b>通关</b> " + t.q + " / " + M.Q.length + " 关 · BOSS " + t.b + " / " + M.B.length + "</li>" +
          "<li><b>当前</b> " + (i < 0 ? "全部通关" : "QUEST " + esc(API.shortId(M.Q[i].id)) + " · " + esc(M.Q[i].name)) + "</li>" +
          "<li><b>存档</b> " + (API.isDemo() ? "演示数据（仅内存，不写入浏览器）" : "本浏览器 localStorage「" + API.KEY_V2 + "」") + "</li></ul>";
      }
      panel.innerHTML = '<button type="button" class="tn2-x-close" data-act="close" aria-label="关闭">✕</button>' + html;
      panel.setAttribute("aria-label", { log: "冒险日志", inv: "背包", char: "角色" }[kind]);
      S.panel = kind; overlay.hidden = false;
      if (!keep) panel.focus({ preventScroll: true });
    }
    function closePanel() { if (!S.panel) return; S.panel = null; overlay.hidden = true; vp.focus({ preventScroll: true }); }

    function toggleList(btn) {
      var onNow = inner.classList.toggle("tn2-x-list");
      btn.setAttribute("aria-pressed", onNow ? "true" : "false");
      var m = inner.querySelector(".tn2-qmap");
      if (onNow && m) m.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    }

    function interact() {
      if (S.nearNpc) { openDialog(S.nearNpc); return true; }
      if (S.nearNode) { openPreview(S.nearNode); return true; }
      return false;
    }

    /* ---------- 事件 ---------- */
    var KEYS = { ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1, KeyW: 1, KeyA: 1, KeyS: 1, KeyD: 1 };
    on(root, "keydown", function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      var k = e.code, t = e.target;
      if (k === "Escape") {
        if (S.dialog) closeDialog(); else if (!preview.hidden) closePreview(); else if (S.panel) closePanel(); else return;
        e.preventDefault(); e.stopPropagation(); return;
      }
      if (S.dialog) {
        if ((k === "Enter" || k === "Space") && t.classList.contains("tn2-x__next")) { e.preventDefault(); e.stopPropagation(); nextLine(); }
        else e.stopPropagation(); // 不把字母键漏给 Material 的快捷键（如 S 打开搜索）
        return;
      }
      if (t !== vp && !vp.contains(t)) { if (/^Key[A-Z]$/.test(k)) e.stopPropagation(); return; } // 面板/按钮内：交给浏览器默认行为
      if (KEYS[k]) {
        e.preventDefault(); e.stopPropagation();
        if (t !== vp) vp.focus({ preventScroll: true });
        S.walking = null; S.keys[k] = true; kick(); hint.classList.add("is-fade"); return;
      }
      if ((k === "Enter" || k === "Space") && t === vp) { if (interact()) { e.preventDefault(); e.stopPropagation(); } return; }
      if (k === "KeyL" || k === "KeyI" || k === "KeyC") {
        e.preventDefault(); e.stopPropagation();
        var kind = { KeyL: "log", KeyI: "inv", KeyC: "char" }[k];
        if (S.panel === kind) closePanel(); else openPanel(kind);
        return;
      }
      if (/^Key[A-Z]$/.test(k)) e.stopPropagation();
    });
    on(window, "keyup", function (e) { if (S.keys[e.code]) S.keys[e.code] = false; });
    on(window, "blur", function () { S.keys = {}; });
    on(root, "focusout", function (e) { if (!root.contains(e.relatedTarget)) S.keys = {}; });

    on(root, "click", function (e) {
      var t = e.target;
      var act = t.closest("[data-act]");
      if (act) {
        var a = act.dataset.act;
        if (a === "list") toggleList(act);
        else if (a === "log" || a === "inv" || a === "char") { if (S.panel === a) closePanel(); else openPanel(a); }
        else if (a === "close") { if (act.parentNode === preview) closePreview(); else closePanel(); }
        else if (a === "toggle") toggleDone(preview.dataset.id);
        return;
      }
      if (t.closest(".tn2-x-qcard__more")) { openPreview(M.byId[t.closest(".tn2-x-qcard__more").dataset.id]); return; }
      if (t === overlay) { closePanel(); return; }
      if (t.closest(".tn2-x__next")) { nextLine(); return; }
      var nb = t.closest(".tn2-x-node");
      if (nb) {
        var lv = M.byId[nb.dataset.id];
        if (S.nearNode === lv) openPreview(lv); else walkTo(lv, function () { nb.focus({ preventScroll: true }); });
        return;
      }
      var npcB = t.closest(".tn2-x-npc");
      if (npcB) {
        var n = npcs.filter(function (x) { return x.el === npcB; })[0];
        if (n) openDialog(n);
        return;
      }
      if (t.closest(".tn2-x-fog")) { fogNotice(M.regions[parseInt(t.closest(".tn2-x-fog").dataset.c, 10) - 1]); return; }
      if (vp.contains(t) && !t.closest("a,button,.tn2-x-qcard")) {
        vp.focus({ preventScroll: true });
        var r = vp.getBoundingClientRect(), wx = e.clientX - r.left + cam.x, wy = e.clientY - r.top + cam.y;
        var best = null, bd = 120;
        M.levels.forEach(function (lv) { var dd = Math.hypot(lv.x - wx, lv.y - wy); if (dd < bd) { bd = dd; best = lv; } });
        if (best) walkTo(best);
      }
    });
    // 视口是 overflow:clip；兜底：浏览器把聚焦元素滚入视野时会改 scrollLeft/Top，归零交给 lookAt
    on(vp, "scroll", function () { vp.scrollTop = 0; vp.scrollLeft = 0; });
    on(root, "focusin", function (e) {
      var nb = e.target.closest && e.target.closest(".tn2-x-node");
      if (nb && !S.walking) { var lv = M.byId[nb.dataset.id]; lookAt(lv.x, lv.y); }
      var npcB = e.target.closest && e.target.closest(".tn2-x-npc");
      if (npcB && !S.walking) lookAt(parseFloat(npcB.style.left), parseFloat(npcB.style.top));
    });
    root.querySelectorAll(".tn2-x__dpad button").forEach(function (b) {
      var k = b.dataset.d;
      function down(e) { e.preventDefault(); S.walking = null; S.keys[k] = true; kick(); }
      function up() { S.keys[k] = false; }
      b.addEventListener("pointerdown", down);
      b.addEventListener("pointerup", up); b.addEventListener("pointerleave", up); b.addEventListener("pointercancel", up);
    });
    on(window, "resize", function () { camera(false); });
    on(window, "tn-quest-change", function () { S.s = API.load(); render(); });
    later(function () { hint.classList.add("is-fade"); }, 4500);

    /* ---------- 首次渲染（全部成功后才隐藏文字版地图） ---------- */
    if (h2) h2.parentNode.insertBefore(root, h2.nextSibling);
    else qmap.parentNode.insertBefore(root, qmap);
    document.body.classList.add(PAGE_CLASS); // 先加宽版面，再按最终尺寸摆镜头
    render();
    var f = focusLevel(S.s);
    S.pos = stance(f); placePlayer(); camera(false); updateNear(true);
    inner.classList.add("tn2-x-on");

    return {
      root: root,
      destroy: function () {
        if (raf) cancelAnimationFrame(raf); raf = 0;
        timers.forEach(clearTimeout);
        if (S.dialog) clearInterval(S.dialog.typing);
        if (ac) ac.abort(); offs.forEach(function (f) { f(); });
        inner.classList.remove("tn2-x-on", "tn2-x-list");
        document.body.classList.remove(PAGE_CLASS);
        if (root.parentNode) root.remove();
      }
    };
  }

  function teardown() {
    if (inst) { try { inst.destroy(); } catch (e) {} inst = null; }
    if (document.body) document.body.classList.remove(PAGE_CLASS);
  }

  var PAGE_CLASS = "tn-explore-page";
  function boot() {
    teardown();
    var API = window.TN_QUEST;
    if (!API || !API.isIndex || !API.isIndex()) return; // 只在 /topics/java/ 激活
    try { inst = mount(API); }
    catch (e) {
      /* 兜底：撤掉半成品，保留 quest.js 的文字版闯关地图 */
      var inner = document.querySelector(".md-content__inner");
      if (inner) { inner.querySelectorAll(".tn2-x").forEach(function (x) { x.remove(); }); inner.classList.remove("tn2-x-on", "tn2-x-list"); }
      document.body.classList.remove(PAGE_CLASS);
      inst = null;
      if (window.console && console.warn) console.warn("[tn explore] disabled:", e);
    }
  }
  if (window.document$ && document$.subscribe) document$.subscribe(boot);
  else if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
