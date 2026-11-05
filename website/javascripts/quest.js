/* tech-notes · Java 闯关（只在网站侧注入；进度只存本浏览器 localStorage，不发任何网络请求） */
(function () {
  "use strict";
  var D = window.TN_QUEST_DATA; if (!D || !D.topics) return;
  var KEY_V1 = "tn-quest-v1", KEY_V2 = "tn-quest-v2";
  var TOPIC_KEY = "java", TOPIC = D.topics[TOPIC_KEY]; if (!TOPIC) return;
  var Q = TOPIC.quests, BOSS = TOPIC.bosses, LEVELS = D.levels, CN = "一二三";
  var demo = null; // ?demo=N：仅内存中的演示状态，不写 localStorage

  /* 展示用短号：java-01 → 01，java-b1 → b1 */
  function shortId(id) {
    var m = /^(?:[a-z]+-)?((?:b)?\d+)$/i.exec(id || "");
    return m ? m[1] : id;
  }

  function migrateDoneKey(id) {
    if (typeof id !== "string") return null;
    if (id.indexOf(TOPIC_KEY + "-") === 0) return id;
    if (/^b[1-3]$/.test(id) || /^\d{2}$/.test(id)) return TOPIC_KEY + "-" + id;
    return null;
  }
  function migrateTaskKey(k) {
    if (typeof k !== "string") return null;
    if (k.indexOf(TOPIC_KEY + "-") === 0) return k;
    var m = /^(b[1-3]|\d{2})-(\d+)$/.exec(k);
    return m ? TOPIC_KEY + "-" + m[1] + "-" + m[2] : null;
  }
  function migrateV1toV2(raw) {
    var done = {}, tasks = {};
    if (raw && raw.done && typeof raw.done === "object") {
      Object.keys(raw.done).forEach(function (k) {
        var nk = migrateDoneKey(k);
        if (nk && raw.done[k]) done[nk] = true;
      });
    }
    if (raw && raw.tasks && typeof raw.tasks === "object") {
      Object.keys(raw.tasks).forEach(function (k) {
        var nk = migrateTaskKey(k);
        if (nk && raw.tasks[k]) tasks[nk] = true;
      });
    }
    return { version: 2, done: done, tasks: tasks };
  }
  function parseStore(raw) {
    if (raw == null || raw === "") return null;
    var s = JSON.parse(raw); // may throw
    if (!s || typeof s !== "object") return null;
    s.done = s.done && typeof s.done === "object" ? s.done : {};
    s.tasks = s.tasks && typeof s.tasks === "object" ? s.tasks : {};
    return s;
  }

  function load() {
    if (demo) return demo;
    /* Prefer v2; migrate v1 → v2 once when v2 missing. Bad JSON → fresh empty state. */
    try {
      var v2raw = localStorage.getItem(KEY_V2);
      if (v2raw != null) {
        var v2 = parseStore(v2raw);
        if (v2) { v2.version = 2; return v2; }
        return { version: 2, done: {}, tasks: {} };
      }
    } catch (e) {
      return { version: 2, done: {}, tasks: {} };
    }
    try {
      var v1raw = localStorage.getItem(KEY_V1);
      if (v1raw != null) {
        var v1 = parseStore(v1raw);
        if (v1) {
          var migrated = migrateV1toV2(v1);
          try {
            localStorage.setItem(KEY_V2, JSON.stringify(migrated));
            /* Keep v1 untouched as backup after successful write. */
          } catch (e) {}
          return migrated;
        }
      }
    } catch (e) {}
    return { version: 2, done: {}, tasks: {} };
  }
  function save(s) {
    if (demo) { demo = s; return; }
    try {
      s.version = 2;
      localStorage.setItem(KEY_V2, JSON.stringify(s));
    } catch (e) {}
  }
  function stats(s) {
    var xp = 0, q = 0, b = 0, max = 0;
    Q.forEach(function (x) { max += x.xp; if (s.done[x.id]) { q++; xp += x.xp; } });
    BOSS.forEach(function (x) { max += x.xp; if (s.done[x.id]) { b++; xp += x.xp; } });
    var lv = 1; for (var i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i]) lv = i + 1;
    return { q: q, b: b, xp: xp, lv: lv, next: LEVELS[lv], max: max };
  }
  function current(s) { for (var i = 0; i < Q.length; i++) if (!s.done[Q[i].id]) return i; return -1; }
  function state(s, i) { return s.done[Q[i].id] ? "done" : i === current(s) ? "cur" : "lock"; }
  function chapterDone(s, c) { return Q.filter(function (x) { return x.chapter === c; }).every(function (x) { return s.done[x.id]; }); }
  function bossState(s, b) { return s.done[b.id] ? "done" : chapterDone(s, b.chapter) ? "cur" : "lock"; }
  function root() { var a = document.querySelector(".md-header__button.md-logo"); return a ? a.href : location.origin + "/"; }
  function url(i) { return new URL(Q[i].path, root()).href; }
  function h(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function setState(n, st) { n.classList.remove("is-done", "is-cur", "is-lock"); n.classList.add("is-" + st); }
  function rel(p) { return location.pathname.replace(/\/+$/, "/").endsWith("/" + p); }

  function bar(s) {
    var t = stats(s), b = h("div", "tn2-pbar tn2-q-injected");
    b.innerHTML =
      '<span class="tn2-pbar__lv">Lv.' + t.lv + '</span>' +
      '<div class="tn2-pbar__xp"><div><span>XP 经验值</span><span>' + t.xp + ' / ' + t.max + '</span></div>' +
      '<i><b style="width:' + Math.round(t.xp / t.max * 100) + '%"></b></i>' +
      '<small>' + (t.next != null ? '距 Lv.' + (t.lv + 1) + ' 还差 ' + (t.next - t.xp) + ' XP' : '已满级') + '</small></div>' +
      '<div class="tn2-pbar__n"><b>' + t.q + '/' + Q.length + '</b><small>已通关</small></div>' +
      '<div class="tn2-pbar__n"><b>' + (t.q + t.b) + '</b><small>徽章</small></div>' +
      '<div class="tn2-pbar__note">进度只保存在本浏览器' + (demo ? ' · <em>演示数据</em>' : '') +
      '<button type="button" class="tn2-pbar__reset">重置进度</button></div>';
    b.querySelector("button").onclick = function () {
      if (!confirm("确定清空本浏览器里的闯关进度？")) return;
      if (demo) demo = { version: 2, done: {}, tasks: {} };
      else {
        try { localStorage.removeItem(KEY_V2); } catch (e) {}
        try { localStorage.removeItem(KEY_V1); } catch (e) {}
      }
      mount();
    };
    return b;
  }

  function bossToggle(el, b) {
    el.onclick = function () {
      var st = load();
      if (st.done[b.id]) delete st.done[b.id];
      else if (chapterDone(st, b.chapter)) st.done[b.id] = true;
      else { alert("第" + CN[b.chapter - 1] + "章 BOSS 章节测验：题目建设中。先通关本章 4 关，再回来标记通过。"); return; }
      save(st); mount();
    };
  }

  function map(s) {
    var m = h("div", "tn2-qmap tn2-q-injected");
    TOPIC.chapters.forEach(function (name, ci) {
      var c = ci + 1, qs = Q.filter(function (x) { return x.chapter === c; });
      var ch = h("div", "tn2-qchap tn2-qchap--" + c);
      ch.appendChild(h("p", "tn2-qchap__head",
        '<span>§ 0' + c + '</span> 第' + CN[ci] + '章 · ' + name +
        ' <em>关卡 ' + shortId(qs[0].id) + '–' + shortId(qs[qs.length - 1].id) + '</em>'));
      var row = h("div", "tn2-qrow");
      qs.forEach(function (x) {
        var i = Q.indexOf(x), sid = shortId(x.id), a = h("a", "tn2-qnode",
          '<span class="tn2-qnode__dot">' + sid + '</span><span class="tn2-qnode__lab"><b>QUEST ' + sid + '</b>' + x.name + '</span>');
        a.href = url(i); setState(a, state(s, i)); row.appendChild(a);
      });
      var b = BOSS[ci], bn = h("span", "tn2-qnode tn2-qnode--boss",
        '<span class="tn2-qnode__dot">BOSS</span><span class="tn2-qnode__lab"><b>CH.' + c + ' BOSS</b>' + b.name + '<i>建设中</i></span>');
      bn.setAttribute("role", "button"); bn.tabIndex = 0;
      var bs = bossState(s, b); setState(bn, bs);
      bn.title = bs === "done" ? "已通过（点击撤销）" : bs === "cur" ? "点击标记章节测验通过" : "先通关本章 4 关";
      bossToggle(bn, b); row.appendChild(bn);
      ch.appendChild(row); m.appendChild(ch);
    });
    return m;
  }

  function headingNamed(inner, text) {
    var hs = inner.querySelectorAll("h2");
    for (var i = 0; i < hs.length; i++) if (hs[i].textContent.replace(/[¶#\s]/g, "").indexOf(text) === 0) return hs[i];
    return null;
  }

  /* Desktop secondary TOC + mobile drawer TOC (same secondary nav / nested copies). */
  function patchToc() {
    var links = document.querySelectorAll(
      '.md-sidebar--secondary a.md-nav__link, .md-nav--secondary a.md-nav__link, [data-md-component="toc"] a.md-nav__link'
    );
    for (var i = 0; i < links.length; i++) {
      var a = links[i], span = a.querySelector(".md-ellipsis");
      var label = ((span || a).textContent || "").replace(/\s+/g, " ").trim();
      var href = a.getAttribute("href") || "";
      var isPath = label === "学习路径" || label === "闯关地图";
      var isOld = href === "#_1" || href === "#学习路径";
      var isNew = href === "#quest-map";
      if (!isPath && !isOld && !isNew) continue;
      a.setAttribute("href", "#quest-map");
      if (span) {
        while (span.firstChild) span.removeChild(span.firstChild);
        span.appendChild(document.createTextNode("闯关地图"));
      } else {
        a.textContent = "闯关地图";
      }
    }
  }

  function mountIndex(inner, s) {
    var h2 = document.getElementById("quest-map") || headingNamed(inner, "闯关地图") || headingNamed(inner, "学习路径");
    var anchor = h2 || inner.querySelector("h2");
    if (!inner.querySelector(".tn2-qmap")) {
      anchor.parentNode.insertBefore(map(s), anchor);
    } else {
      inner.querySelector(".tn2-qmap").replaceWith(map(s));
    }
    if (h2) {
      /* Keep the same h2 element (id/text swap) so Material scroll-spy's element ref stays valid. */
      h2.id = "quest-map";
      h2.classList.remove("tn2-q-hidden");
      var link = h2.querySelector("a.headerlink");
      var labelNode = null;
      for (var i = 0; i < h2.childNodes.length; i++) {
        if (h2.childNodes[i].nodeType === 3 && h2.childNodes[i].textContent.replace(/\s/g, "")) {
          labelNode = h2.childNodes[i]; break;
        }
      }
      if (labelNode) labelNode.textContent = "闯关地图";
      else if (!h2.querySelector(".tn2-q-title")) {
        var t = document.createTextNode("闯关地图");
        h2.insertBefore(t, h2.firstChild);
      }
      if (link) link.setAttribute("href", "#quest-map");
      var n = h2.nextElementSibling;
      while (n && n.tagName !== "H2") {
        if (!n.classList.contains("tn2-qmap") && !n.classList.contains("tn2-q-injected")) n.classList.add("tn2-q-hidden");
        n = n.nextElementSibling;
      }
      inner.classList.add("tn2-q-mapmode");
      /* Move map to sit right under the retitled h2 */
      var qmap = inner.querySelector(".tn2-qmap");
      if (qmap && qmap.previousElementSibling !== h2) h2.parentNode.insertBefore(qmap, h2.nextSibling);
    }
    patchToc();
  }

  function mountQuest(inner, s, i) {
    var x = Q[i], h2 = headingNamed(inner, "闯关任务");
    if (h2 && !h2.closest(".tn2-quest")) {
      var card = h("div", "tn2-quest"); card.setAttribute("data-quest", x.id);
      var bq = inner.querySelector("h1 ~ blockquote");
      var place = bq ? bq.nextElementSibling : h2;
      var nodes = [h2], n = h2.nextElementSibling;
      while (n && n.tagName !== "H2") { nodes.push(n); n = n.nextElementSibling; }
      place.parentNode.insertBefore(card, place);
      card.appendChild(h("span", "tn2-quest__no", "QUEST " + shortId(x.id) + " · 第" + CN[x.chapter - 1] + "章 " + TOPIC.chapters[x.chapter - 1]));
      nodes.forEach(function (e) { card.appendChild(e); });
      h2.classList.add("tn2-q-hidden");
      var lead = card.querySelector("p"); if (lead && /^QUEST/.test(lead.textContent)) lead.classList.add("tn2-q-hidden");
    }
    var c = inner.querySelector(".tn2-quest");
    if (c) {
      setState(c, state(s, i));
      c.querySelectorAll('input[type="checkbox"]').forEach(function (cb, k) {
        var tk = x.id + "-" + k;
        cb.disabled = false; cb.checked = !!s.tasks[tk];
        cb.onchange = function () { var st = load(); if (cb.checked) st.tasks[tk] = true; else delete st.tasks[tk]; save(st); };
      });
    }
    var clear = h("div", "tn2-clear tn2-q-injected"), done = !!s.done[x.id];
    clear.innerHTML = done
      ? '<span class="tn2-clear__ok">✓ 已通关 · +' + x.xp + ' XP · 徽章「' + x.badge + '」</span><button type="button" class="tn2-clear__btn is-done">已通关 · 撤销</button>'
      : '<span class="tn2-clear__hint">自测答对 ≥ 80% 后，给自己盖个章。</span><button type="button" class="tn2-clear__btn">标记通关 ✓</button>';
    if (i + 1 < Q.length) {
      var a = h("a", "tn2-clear__next", "下一关 QUEST " + shortId(Q[i + 1].id) + " " + Q[i + 1].name + " →");
      a.href = url(i + 1); clear.appendChild(a);
    }
    clear.querySelector("button").onclick = function () { var st = load(); if (st.done[x.id]) delete st.done[x.id]; else st.done[x.id] = true; save(st); mount(); };
    var hr = inner.querySelectorAll("hr"); hr = hr[hr.length - 1];
    var quiz = headingNamed(inner, "通关自测");
    if (hr) hr.parentNode.insertBefore(clear, hr); else if (quiz) quiz.parentNode.appendChild(clear);
  }

  function mountHome(s) {
    document.querySelectorAll(".tn2-qmini [data-q]").forEach(function (n) { setState(n, state(s, parseInt(n.getAttribute("data-q"), 10) - 1)); });
    document.querySelectorAll(".tn2-qmini [data-boss]").forEach(function (n) { setState(n, bossState(s, BOSS[parseInt(n.getAttribute("data-boss"), 10) - 1])); });
    var c = current(s), t = stats(s);
    document.querySelectorAll(".tn2-continue").forEach(function (a) {
      a.href = url(c < 0 ? 0 : c);
      a.textContent = c < 0 ? "全部通关 · 再看一遍 →" : (s.done[Q[0].id] ? "继续闯关 →" : "开始闯关 →");
    });
    document.querySelectorAll(".tn2-qprog").forEach(function (p) {
      p.innerHTML = c < 0 ? "全部通关！" : "当前关卡 <b>QUEST " + shortId(Q[c].id) + "</b> " + Q[c].name + " · Lv." + t.lv + " · " + t.xp + " XP";
    });
  }

  function mount() {
    var inner = document.querySelector(".md-content__inner"); if (!inner) return;
    inner.querySelectorAll(".tn2-q-injected").forEach(function (e) { e.remove(); });
    var s = load(), isHome = !!inner.querySelector(".tn2-hero");
    if (isHome) { mountHome(s); var hero = inner.querySelector(".tn2-hero"); hero.parentNode.insertBefore(bar(s), hero); return; }
    if (rel("topics/java/")) {
      var h1 = inner.querySelector("h1"); h1.insertAdjacentElement("afterend", bar(s));
      mountIndex(inner, s);
      return;
    }
    for (var i = 0; i < Q.length; i++) if (rel(Q[i].path)) {
      inner.querySelector("h1").insertAdjacentElement("afterend", bar(s));
      mountQuest(inner, s, i);
      return;
    }
  }

  function init() {
    var m = /[?&]demo=(\d{1,2})(?:&|$)/.exec(location.search);
    if (m && !demo) {
      var n = Math.min(Q.length, parseInt(m[1], 10)), d = { version: 2, done: {}, tasks: {} };
      for (var i = 0; i < n; i++) d.done[Q[i].id] = true;
      BOSS.forEach(function (b) { if (chapterDone(d, b.chapter)) d.done[b.id] = true; });
      demo = d;
    }
    mount();
  }
  if (window.document$ && document$.subscribe) document$.subscribe(init);
  else document.addEventListener("DOMContentLoaded", init);

  /* Expose migration helpers for offline tests (no network). */
  window.TN_QUEST_MIGRATE_ = { migrateV1toV2: migrateV1toV2, migrateDoneKey: migrateDoneKey, migrateTaskKey: migrateTaskKey, KEY_V1: KEY_V1, KEY_V2: KEY_V2, load: load, save: save };
})();
