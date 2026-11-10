/* Language switch. Default URLs stay Chinese.
 * English pages live under en/. A Chinese page with no English twin
 * goes to en/not-translated/#anchor, never to Chinese text labeled as English.
 * No network. */
(function () {
  "use strict";
  function siteRoot() {
    var script = document.querySelector("script[src*='lang.js']");
    if (!script) return "";
    return script.getAttribute("src").replace(/javascripts\/lang\.js.*$/, "");
  }
  function pagePath() {
    var path = location.pathname;
    var marker = "/tech-notes/";
    var at = path.indexOf(marker);
    if (at !== -1) path = path.slice(at + marker.length - 1);
    else if (path === "/tech-notes") path = "/";
    if (path.endsWith("/index.html")) path = path.slice(0, -"/index.html".length);
    if (!path.endsWith("/")) path += "/";
    return path || "/";
  }
  function map() {
    return window.TN_LANG || { translated: {}, anchors: {} };
  }
  function englishHref(path) {
    var data = map();
    var urls = Object.keys(data.translated || {});
    for (var i = 0; i < urls.length; i++) {
      if (data.translated[urls[i]] === path) return path;
    }
    if (data.translated[path]) return data.translated[path];
    if (path.indexOf("/en/") === 0) return path;
    var id = (data.anchors || {})[path] || "";
    return "/en/not-translated/" + (id ? "#" + id : "");
  }
  function chineseHref(path) {
    var data = map();
    var urls = Object.keys(data.translated || {});
    for (var i = 0; i < urls.length; i++) {
      if (data.translated[urls[i]] === path) return urls[i];
    }
    if (path.indexOf("/en/not-translated/") === 0) {
      var id = (location.hash || "").replace(/^#/, "");
      var keys = Object.keys(data.anchors || {});
      for (var j = 0; j < keys.length; j++) {
        if (data.anchors[keys[j]] === id) return keys[j];
      }
      return "/";
    }
    if (path.indexOf("/en/") === 0) return "/";
    return path;
  }
  function withRoot(root, url) {
    var hash = "";
    var cut = url.indexOf("#");
    if (cut !== -1) { hash = url.slice(cut); url = url.slice(0, cut); }
    if (url.charAt(0) === "/") url = url.slice(1);
    return root + url + hash;
  }
  function render() {
    var data = map();
    if (!data.translated) return;
    var path = pagePath();
    var root = siteRoot();
    var onEnglish = path === "/en/" || path.indexOf("/en/") === 0;
    if (onEnglish) document.documentElement.lang = "en";
    var header = document.querySelector(".md-header__inner");
    if (header && !header.querySelector(".tn-lang")) {
      var nav = document.createElement("nav");
      nav.className = "tn-lang";
      nav.setAttribute("aria-label", onEnglish ? "Language" : "语言");
      var zh = document.createElement("a");
      var en = document.createElement("a");
      zh.href = withRoot(root, chineseHref(path));
      en.href = withRoot(root, englishHref(path));
      zh.textContent = "中文";
      en.textContent = "English";
      if (!onEnglish) zh.setAttribute("aria-current", "true");
      else en.setAttribute("aria-current", "true");
      nav.appendChild(zh);
      nav.appendChild(document.createTextNode(" · "));
      nav.appendChild(en);
      header.appendChild(nav);
    }
    if (onEnglish && data.searchLimit && !document.querySelector(".tn-lang-limit")) {
      var host = document.querySelector(".md-content__inner");
      if (host) {
        var note = document.createElement("p");
        note.className = "tn-lang-limit";
        note.textContent = data.searchLimit;
        host.insertBefore(note, host.firstChild);
      }
    }
  }
  if (window.document$ && document$.subscribe) document$.subscribe(render);
  else document.addEventListener("DOMContentLoaded", render);
})();
