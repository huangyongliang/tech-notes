/* Language switch. Chinese URLs stay on the Chinese site.
 * English is the same article under /en/.
 * If that article has no English body, /en/ still shows that article
 * plus the banner written into the page. This file does not translate
 * interface strings and does not send the reader to the home page.
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
  function onEnglish(path) {
    return path === "/en/" || path.indexOf("/en/") === 0;
  }
  function englishHref(path) {
    /* lang.js lives at the root of the site that is open. On /en/ that root
     * is already inside /en/, so the English link must not add another en/. */
    if (onEnglish(path)) {
      var rest = path.slice("/en/".length);
      return rest || "./";
    }
    if (path === "/") return "en/";
    return "en" + path;
  }
  var EN_ONLY = { "/en/not-translated/": "/" };
  function chineseHref(path) {
    if (path === "/en/") return "/";
    if (EN_ONLY[path]) return EN_ONLY[path];
    if (path.indexOf("/en/") === 0) return path.slice(3);
    return path;
  }
  function withRoot(root, url, fromEnglish) {
    var hash = "";
    var cut = url.indexOf("#");
    if (cut !== -1) { hash = url.slice(cut); url = url.slice(0, cut); }
    if (url.charAt(0) === "/") url = url.slice(1);
    if (!url) url = "./";
    var prefix = root;
    if (fromEnglish && url.indexOf("en/") !== 0) prefix += "../";
    return prefix + url + hash;
  }
  function linksFor(pageUrl, scriptSrc) {
    var root = String(scriptSrc).replace(/javascripts\/lang\.js.*$/, "");
    var en = onEnglish(pageUrl);
    return {
      zh: withRoot(root, chineseHref(pageUrl), en),
      en: withRoot(root, englishHref(pageUrl), false)
    };
  }
  function render() {
    var path = pagePath();
    var root = siteRoot();
    var en = onEnglish(path);
    if (en) document.documentElement.lang = "en";
    var header = document.querySelector(".md-header__inner");
    if (header && !header.querySelector(".tn-lang")) {
      var nav = document.createElement("nav");
      nav.className = "tn-lang";
      nav.setAttribute("aria-label", en ? "Language" : "语言");
      var zh = document.createElement("a");
      var enLink = document.createElement("a");
      zh.href = withRoot(root, chineseHref(path), en);
      enLink.href = withRoot(root, englishHref(path), false);
      zh.textContent = "中文";
      enLink.textContent = "English";
      zh.setAttribute("lang", "zh");
      enLink.setAttribute("lang", "en");
      (en ? enLink : zh).setAttribute("aria-current", "page");
      nav.appendChild(zh);
      nav.appendChild(document.createTextNode(" · "));
      nav.appendChild(enLink);
      header.appendChild(nav);
    }
    var banner = document.querySelector(".tn-fallback");
    if (banner) {
      document.documentElement.lang = "en";
      banner.setAttribute("lang", "en");
      var inner = document.querySelector(".md-content__inner");
      if (inner) inner.setAttribute("lang", "zh");
    }
  }
  var api = { linksFor: linksFor };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined") return;
  if (window.document$ && document$.subscribe) document$.subscribe(render);
  else document.addEventListener("DOMContentLoaded", render);
})();
