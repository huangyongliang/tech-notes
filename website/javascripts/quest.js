/* tech-notes · Java 闯关（只在网站侧注入；进度只存本浏览器 localStorage，不发任何网络请求） */
(function () {
  "use strict";
  var D = window.TN_QUEST_DATA; if (!D) return;
  var KEY = "tn-quest-v1", Q = D.quests, BOSS = D.bosses, LEVELS = D.levels, CN = "一二三";
  var demo = null; // ?demo=N：仅内存中的演示状态，不写 localStorage

  function load() {
    if (demo) return demo;
    try { var s = JSON.parse(localStorage.getItem(KEY)); if (s && s.done) { s.tasks = s.tasks || {}; return s; } } catch (e) {}
    return { done: {}, tasks: {} };
  }
  function save(s) { if (demo) { demo = s; return; } try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
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
  function rel(p) { return location.pathname.replace(/\/+$/, "/").endsWith("/" + p) ; }

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
      if (demo) demo = { done: {}, tasks: {} }; else { try { localStorage.removeItem(KEY); } catch (e) {} }
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
    D.chapters.forEach(function (name, ci) {
      var c = ci + 1, qs = Q.filter(function (x) { return x.chapter === c; });
      var ch = h("div", "tn2-qchap tn2-qchap--" + c);
      ch.appendChild(h("p", "tn2-qchap__head", '<span>§ 0' + c + '</span> 第' + CN[ci] + '章 · ' + name + ' <em>关卡 ' + qs[0].id + '–' + qs[qs.length - 1].id + '</em>'));
      var row = h("div", "tn2-qrow");
      qs.forEach(function (x) {
        var i = Q.indexOf(x), a = h("a", "tn2-qnode",
          '<span class="tn2-qnode__dot">' + x.id + '</span><span class="tn2-qnode__lab"><b>QUEST ' + x.id + '</b>' + x.name + '</span>');
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

  function mountIndex(inner, s) {
    var h2 = headingNamed(inner, "学习路径");
    var anchor = h2 || inner.querySelector("h2");
    anchor.parentNode.insertBefore(map(s), anchor);
    if (h2) {
      h2.classList.add("tn2-q-hidden");
      var n = h2.nextElementSibling;
      while (n && n.tagName !== "H2") { n.classList.add("tn2-q-hidden"); n = n.nextElementSibling; }
      inner.classList.add("tn2-q-mapmode");
      var title = h("h2", "tn2-q-injected", "闯关地图");
      anchor.parentNode.insertBefore(title, inner.querySelector(".tn2-qmap"));
    }
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
      card.appendChild(h("span", "tn2-quest__no", "QUEST " + x.id + " · 第" + CN[x.chapter - 1] + "章 " + D.chapters[x.chapter - 1]));
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
    if (i + 1 < Q.length) { var a = h("a", "tn2-clear__next", "下一关 QUEST " + Q[i + 1].id + " " + Q[i + 1].name + " →"); a.href = url(i + 1); clear.appendChild(a); }
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
      p.innerHTML = c < 0 ? "全部通关！" : "当前关卡 <b>QUEST " + Q[c].id + "</b> " + Q[c].name + " · Lv." + t.lv + " · " + t.xp + " XP";
    });
  }

  function mount() {
    var inner = document.querySelector(".md-content__inner"); if (!inner) return;
    inner.querySelectorAll(".tn2-q-injected").forEach(function (e) { e.remove(); });
    var s = load(), isHome = !!inner.querySelector(".tn2-hero");
    if (isHome) { mountHome(s); var hero = inner.querySelector(".tn2-hero"); hero.parentNode.insertBefore(bar(s), hero); return; }
    if (rel("topics/java/")) {
      var h1 = inner.querySelector("h1"); h1.insertAdjacentElement("afterend", bar(s));
      if (!inner.querySelector(".tn2-qmap")) mountIndex(inner, s); else { inner.querySelector(".tn2-qmap").replaceWith(map(s)); }
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
      var n = Math.min(Q.length, parseInt(m[1], 10)), d = { done: {}, tasks: {} };
      for (var i = 0; i < n; i++) d.done[Q[i].id] = true;
      BOSS.forEach(function (b) { if (chapterDone(d, b.chapter)) d.done[b.id] = true; });
      demo = d;
    }
    mount();
  }
  if (window.document$ && document$.subscribe) document$.subscribe(init);
  else document.addEventListener("DOMContentLoaded", init);
})();
