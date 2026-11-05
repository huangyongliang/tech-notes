/* 按路径懒加载 dialogs-<group>.js（同域 <script> 注入，无 fetch/XHR）。
 * 构建期由 prepare_site_src.sh 生成 dialogs-java.js / dialogs-basics.js。 */
(function () {
  "use strict";
  var root = (window.TN_DIALOGS = window.TN_DIALOGS || { dialogs: {} });
  root.dialogs = root.dialogs || {};
  var ready = (window.TN_DIALOGS_READY = window.TN_DIALOGS_READY || {});
  var loading = {};

  function siteRoot() {
    var a = document.querySelector(".md-header__button.md-logo");
    return a ? a.href : new URL("./", location.href).href;
  }

  function detectGroups() {
    var path = location.pathname || "";
    if (/\/topics\/java(\/|$)/.test(path)) return ["java"];
    if (/\/topics\/(getting-started|cs-basics|programming-basics)(\/|$)/.test(path)) return ["basics"];
    /* 首页知识世界以基础陆为主 */
    return ["basics"];
  }

  function load(group, cb) {
    if (ready[group]) {
      if (cb) cb();
      return;
    }
    if (loading[group]) {
      if (cb) loading[group].push(cb);
      return;
    }
    loading[group] = cb ? [cb] : [];
    var s = document.createElement("script");
    s.src = new URL("javascripts/dialogs-" + group + ".js", siteRoot()).href;
    s.async = true;
    s.onload = function () {
      ready[group] = true;
      var q = loading[group] || [];
      delete loading[group];
      for (var i = 0; i < q.length; i++) {
        try {
          if (q[i]) q[i]();
        } catch (e) {}
      }
      try {
        window.dispatchEvent(new CustomEvent("tn-dialogs-ready", { detail: { group: group } }));
      } catch (e) {}
    };
    s.onerror = function () {
      delete loading[group];
    };
    (document.head || document.documentElement).appendChild(s);
  }

  window.TN_DIALOGS_LOAD = load;

  /* 首屏按路径预取（不阻塞；game.js 在打开世界前会再 wait） */
  detectGroups().forEach(function (g) {
    load(g);
  });
})();
