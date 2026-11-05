/* tech-notes · 模式开关（必须是第一个 extra_javascript）
 * <html> 上加 tn-mode-game / tn-mode-read 与 data-tn-mode；默认 game。
 * localStorage["tn-mode"] = "game" | "read"；?mode=game|read 覆盖并记住。
 * 只读写 localStorage，不发任何网络请求。没有 JS 时 <html> 不带任何 tn-mode 类 → 普通文档站。 */
(function () {
  "use strict";
  var KEY = "tn-mode";
  function norm(m) { return m === "read" ? "read" : m === "game" ? "game" : null; }
  function stored() { try { return norm(localStorage.getItem(KEY)); } catch (e) { return null; } }
  function store(m) { try { localStorage.setItem(KEY, m); } catch (e) {} }
  function fromUrl() {
    try { return norm(new URLSearchParams(location.search).get("mode")); } catch (e) { return null; }
  }
  function resolve() {
    var q = fromUrl();
    if (q) { store(q); return q; }
    return stored() || "game";
  }
  function apply(m) {
    var root = document.documentElement;
    if (root.getAttribute("data-tn-mode") === m) return false;
    root.classList.remove("tn-mode-game", "tn-mode-read");
    root.classList.add("tn-mode-" + m);
    root.setAttribute("data-tn-mode", m);
    return true;
  }
  function emit(m) {
    try { window.dispatchEvent(new CustomEvent("tn-mode-change", { detail: { mode: m } })); } catch (e) {}
  }
  apply(resolve());
  function sync() { var m = resolve(); if (apply(m)) emit(m); }
  if (window.document$ && document$.subscribe) document$.subscribe(sync);
  else document.addEventListener("DOMContentLoaded", sync);

  window.TN_MODE = {
    get: function () { return document.documentElement.getAttribute("data-tn-mode") || resolve(); },
    set: function (m) {
      m = norm(m) || "game";
      store(m);
      /* 去掉地址栏里的 ?mode=，免得下一次导航又被它覆盖 */
      try {
        var u = new URL(location.href);
        if (u.searchParams.has("mode")) { u.searchParams.delete("mode"); history.replaceState(history.state, "", u.href); }
      } catch (e) {}
      if (apply(m)) emit(m);
    }
  };
})();
