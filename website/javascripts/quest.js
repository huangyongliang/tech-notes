/* tech-notes · Java 闯关进度（只存本浏览器 localStorage，不发任何网络请求） */
(function () {
  "use strict";
  var KEY = "tn-quest-v1";
  var Q = [
    ["01", "01-language-basics", "语言基础与新特性", "语法新兵"],
    ["02", "02-collections", "集合框架", "容器大师"],
    ["03", "03-core-advanced", "异常、泛型、反射与注解", "反射术士"],
    ["04", "04-io-nio", "输入输出", "管道工"],
    ["05", "05-concurrency", "并发", "线程驯兽师"],
    ["06", "06-jvm", "Java 虚拟机", "字节码考古"],
    ["07", "07-build-tools", "构建工具", "构建匠人"],
    ["08", "08-testing", "测试", "红绿循环"],
    ["09", "09-spring", "Spring 框架", "春之学徒"],
    ["10", "10-persistence", "持久层", "事务守门人"],
    ["11", "11-performance-diagnostics", "性能与诊断", "火焰图猎人"],
    ["12", "12-ecosystem-trends", "生态与新趋势", "趋势瞭望员"]
  ];
  var BOSS = ["b1", "b2", "b3"];
  var XP_Q = 100, XP_B = 150;
  var LEVELS = [0, 200, 450, 750, 1100, 1650]; // Lv.1 … Lv.6（满级 = 全部通关）
  var demo = null; // ?demo=N：仅内存中的演示状态，不写入 localStorage

  function load() {
    if (demo) return demo;
    try { var s = JSON.parse(localStorage.getItem(KEY)); if (s && s.done) return s; } catch (e) {}
    return { done: {}, tasks: {} };
  }
  function save(s) {
    if (demo) { demo = s; return; }
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
  }
  function stats(s) {
    var q = Q.filter(function (x) { return s.done[x[0]]; }).length;
    var b = BOSS.filter(function (x) { return s.done[x]; }).length;
    var xp = q * XP_Q + b * XP_B, lv = 1;
    for (var i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i]) lv = i + 1;
    var lo = LEVELS[lv - 1], hi = LEVELS[lv] || LEVELS[LEVELS.length - 1];
    return { q: q, b: b, xp: xp, lv: lv, lo: lo, hi: hi, badges: q + b, max: Q.length * XP_Q + BOSS.length * XP_B };
  }
  function current(s) { for (var i = 0; i < Q.length; i++) if (!s.done[Q[i][0]]) return i; return -1; }
  function state(s, i) { var c = current(s); return s.done[Q[i][0]] ? "done" : (i === c ? "cur" : "lock"); }
  function chapterDone(s, c) { for (var i = c * 4; i < c * 4 + 4; i++) if (!s.done[Q[i][0]]) return false; return true; }
  function root() {
    var a = document.querySelector(".md-header__button.md-logo");
    return a ? a.href : location.origin + "/";
  }
  function url(i) { return new URL("topics/java/" + Q[i][1] + "/", root()).href; }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  function bar(s) {
    var t = stats(s), pct = t.hi > t.lo ? Math.round((t.xp - t.lo) / (t.hi - t.lo) * 100) : 100;
    var b = el("div", "tn2-pbar");
    b.innerHTML =
      '<span class="tn2-pbar__lv">Lv.' + t.lv + '</span>' +
      '<div class="tn2-pbar__xp"><div><span>XP 经验值</span><span>' + t.xp + ' / ' + t.max + '</span></div>' +
      '<i><b style="width:' + Math.round(t.xp / t.max * 100) + '%"></b></i>' +
      '<small>' + (t.lv < LEVELS.length ? '距 Lv.' + (t.lv + 1) + ' 还差 ' + (t.hi - t.xp) + ' XP' : '已满级') + '</small></div>' +
      '<div class="tn2-pbar__n"><b>' + t.q + '/12</b><small>已通关</small></div>' +
      '<div class="tn2-pbar__n"><b>' + t.badges + '</b><small>徽章</small></div>' +
      '<div class="tn2-pbar__note">进度只保存在本浏览器' + (demo ? ' · <em>演示数据</em>' : '') +
      '<button type="button" class="tn2-pbar__reset">重置进度</button></div>';
    b.querySelector(".tn2-pbar__reset").addEventListener("click", function () {
      if (!confirm("确定清空本浏览器里的闯关进度？")) return;
      if (demo) demo = { done: {}, tasks: {} }; else { try { localStorage.removeItem(KEY); } catch (e) {} }
      mount();
    });
    void pct;
    return b;
  }

  function mount() {
    var s = load();
    var inner = document.querySelector(".md-content__inner");
    if (!inner) return;
    var path = location.pathname;
    var isHome = !!document.querySelector(".tn2-hero");
    var isJava = /\/topics\/java\//.test(path);
    var old = inner.querySelector(".tn2-pbar"); if (old) old.remove();
    if (!isHome && !isJava) return;
    var b = bar(s);
    if (isHome) { var h = inner.querySelector(".tn2-hero"); h.parentNode.insertBefore(b, h); }
    else { var h1 = inner.querySelector("h1"); h1 ? h1.insertAdjacentElement("afterend", b) : inner.prepend(b); }

    // 地图 / 首页缩略路径：按 data-q 设置节点状态
    document.querySelectorAll("[data-q]").forEach(function (n) {
      var i = parseInt(n.getAttribute("data-q"), 10) - 1;
      n.classList.remove("is-done", "is-cur", "is-lock");
      n.classList.add("is-" + state(s, i));
    });
    document.querySelectorAll("[data-boss]").forEach(function (n) {
      var c = parseInt(n.getAttribute("data-boss"), 10) - 1, id = BOSS[c];
      n.classList.remove("is-done", "is-cur", "is-lock");
      n.classList.add(s.done[id] ? "is-done" : chapterDone(s, c) ? "is-cur" : "is-lock");
      n.title = s.done[id] ? "章节测验已通过（点击撤销）" : chapterDone(s, c) ? "点击标记章节测验通过" : "先通关本章 4 关";
      n.onclick = function (e) {
        e.preventDefault();
        var st = load();
        if (st.done[id]) delete st.done[id]; else if (chapterDone(st, c)) st.done[id] = true; else return;
        save(st); mount();
      };
    });
    var c = current(s);
    document.querySelectorAll(".tn2-continue").forEach(function (a) {
      a.href = url(c < 0 ? 0 : c);
      a.textContent = c < 0 ? "全部通关 · 再看一遍 →" : (s.done["01"] ? "继续闯关 →" : "开始闯关 →");
    });
    document.querySelectorAll(".tn2-qprog").forEach(function (p) {
      var t = stats(s);
      p.innerHTML = c < 0 ? "全部通关！" : "当前关卡 <b>QUEST " + Q[c][0] + "</b> " + Q[c][2] + " · Lv." + t.lv + " · " + t.xp + " XP";
    });

    // 子页：任务卡复选框 + 标记通关
    var card = document.querySelector(".tn2-quest[data-quest]");
    if (card) {
      var qid = card.getAttribute("data-quest"), qi = parseInt(qid, 10) - 1;
      card.classList.remove("is-done", "is-cur", "is-lock");
      card.classList.add("is-" + state(s, qi));
      card.querySelectorAll('input[type="checkbox"]').forEach(function (cb, k) {
        var tk = qid + "-" + k;
        cb.disabled = false;
        cb.checked = !!(s.tasks && s.tasks[tk]);
        cb.onchange = function () { var st = load(); st.tasks = st.tasks || {}; if (cb.checked) st.tasks[tk] = true; else delete st.tasks[tk]; save(st); };
      });
    }
    document.querySelectorAll(".tn2-clear[data-quest]").forEach(function (box) {
      var qid = box.getAttribute("data-quest"), done = !!s.done[qid];
      var nx = parseInt(qid, 10);
      box.innerHTML = done
        ? '<span class="tn2-clear__ok">✓ 已通关 · +100 XP</span><button type="button" class="tn2-clear__btn is-done">已通关 · 撤销</button>' + (nx < 12 ? '<a class="tn2-clear__next" href="' + url(nx) + '">下一关 QUEST ' + Q[nx][0] + ' →</a>' : "")
        : '<span class="tn2-clear__hint">读完、勾完目标后，给自己盖个章。</span><button type="button" class="tn2-clear__btn">标记通关 ✓</button>';
      box.querySelector("button").onclick = function () {
        var st = load();
        if (st.done[qid]) delete st.done[qid]; else st.done[qid] = true;
        save(st); mount();
      };
    });
  }

  function init() {
    var m = /[?&]demo=(\d{1,2})\b/.exec(location.search);
    if (m && !demo) {
      var n = Math.min(12, parseInt(m[1], 10)), d = { done: {}, tasks: {} };
      for (var i = 0; i < n; i++) d.done[Q[i][0]] = true;
      for (var c = 0; c < 3; c++) if (n >= c * 4 + 4) d.done[BOSS[c]] = true;
      demo = d;
    }
    mount();
  }
  if (window.document$ && document$.subscribe) document$.subscribe(init);
  else document.addEventListener("DOMContentLoaded", init);
})();
