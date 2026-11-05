/* tech-notes · Q版 chibi sprites
 * Drop-in keys match 变鼠 explore.js SVG object:
 *   player, mentor, lib, shelf, smith, anvil, guard, cat, boss, tree, rock
 * Extra (themed bosses): boss1, boss2, boss3  — boss === boss1 for compat
 * Portrait: TN_CHIBI.portrait(id, 'normal'|'happy')
 * Options: { expr:'normal'|'happy', size:number, portrait:boolean, className:string }
 */
(function (root) {
  'use strict';

  var INK = '#14110f';
  var HOT = '#ff4f12';
  var GOLD = '#ffd84d';
  var PAPER = '#f4efe4';
  var SKIN = '#f3c79a';
  var SKIN2 = '#e8b07a';
  var BLUSH = '#ff8fa3';
  var HAIR_DK = '#3d2a1a';
  var HAIR_BR = '#8b5a2b';
  var BLUE = '#1a3a5c';
  var BLUE2 = '#2a5a8c';
  var GREEN = '#2a9d5c';
  var PURPLE = '#7b2cbf';
  var PURPLE2 = '#5a1a8f';
  var GRAY = '#6e665a';
  var GRAY2 = '#3a3a3a';
  var CAT = '#d4a574';
  var CAT2 = '#c4895a';

  function attrs(obj) {
    var s = '', k;
    for (k in obj) if (Object.prototype.hasOwnProperty.call(obj, k) && obj[k] != null)
      s += ' ' + k + '="' + String(obj[k]).replace(/"/g, '&quot;') + '"';
    return s;
  }

  function svg(vb, w, h, body, extraClass) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + vb + ' ' + vb +
      '" width="' + w + '" height="' + h + '" aria-hidden="true" focusable="false"' +
      ' class="chibi' + (extraClass ? ' ' + extraClass : '') +
      '" style="image-rendering:pixelated;shape-rendering:geometricPrecision">' + body + '</svg>';
  }

  /* shared face bits — big eyes that stay readable at ~40px */
  function eyes(cx, cy, expr, scale) {
    scale = scale || 1;
    var er = 3.2 * scale, pr = 1.55 * scale, hx = 0.7 * scale, hy = 0.7 * scale;
    var gap = 7.2 * scale;
    var ly = cy, ry = cy;
    var smile = expr === 'happy';
    /* closed happy eyes as arcs */
    if (smile) {
      return '' +
        '<path d="M' + (cx - gap - er) + ' ' + ly + ' Q' + (cx - gap) + ' ' + (ly - er * 1.1) + ' ' + (cx - gap + er) + ' ' + ly +
          '" fill="none" stroke="' + INK + '" stroke-width="1.8" stroke-linecap="round" class="chibi-eye"/>' +
        '<path d="M' + (cx + gap - er) + ' ' + ry + ' Q' + (cx + gap) + ' ' + (ry - er * 1.1) + ' ' + (cx + gap + er) + ' ' + ry +
          '" fill="none" stroke="' + INK + '" stroke-width="1.8" stroke-linecap="round" class="chibi-eye"/>';
    }
    return '' +
      '<g class="chibi-eye">' +
        '<circle cx="' + (cx - gap) + '" cy="' + ly + '" r="' + er + '" fill="#fff" stroke="' + INK + '" stroke-width="1.6"/>' +
        '<circle cx="' + (cx - gap + 0.3) + '" cy="' + (ly + 0.4) + '" r="' + pr + '" fill="' + INK + '"/>' +
        '<circle cx="' + (cx - gap - 0.7) + '" cy="' + (ly - 0.8) + '" r="' + hx + '" fill="#fff"/>' +
      '</g>' +
      '<g class="chibi-eye">' +
        '<circle cx="' + (cx + gap) + '" cy="' + ry + '" r="' + er + '" fill="#fff" stroke="' + INK + '" stroke-width="1.6"/>' +
        '<circle cx="' + (cx + gap + 0.3) + '" cy="' + (ry + 0.4) + '" r="' + pr + '" fill="' + INK + '"/>' +
        '<circle cx="' + (cx + gap - 0.7) + '" cy="' + (ry - 0.8) + '" r="' + hx + '" fill="#fff"/>' +
      '</g>';
  }

  function blush(cx, cy, scale) {
    scale = scale || 1;
    var rx = 2.4 * scale, ry = 1.4 * scale, gap = 11 * scale;
    return '' +
      '<ellipse cx="' + (cx - gap) + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="' + BLUSH + '" opacity=".7"/>' +
      '<ellipse cx="' + (cx + gap) + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="' + BLUSH + '" opacity=".7"/>';
  }

  function mouth(cx, cy, expr) {
    if (expr === 'happy') {
      return '<path d="M' + (cx - 3) + ' ' + cy + ' Q' + cx + ' ' + (cy + 4) + ' ' + (cx + 3) + ' ' + cy +
        '" fill="none" stroke="' + INK + '" stroke-width="1.6" stroke-linecap="round"/>';
    }
    return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="1.4" ry="1.1" fill="' + INK + '"/>';
  }

  function shadow(cx, cy, rx, ry) {
    return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry +
      '" fill="' + INK + '" opacity=".18"/>';
  }

  function opt(opts) {
    opts = opts || {};
    return {
      expr: opts.expr === 'happy' ? 'happy' : 'normal',
      size: opts.size || (opts.portrait ? 64 : 48),
      portrait: !!opts.portrait,
      className: opts.className || ''
    };
  }

  /* ========== PLAYER 冒险者 ========== */
  function player(opts) {
    var o = opt(opts);
    if (o.portrait) return portraitPlayer(o);
    var body =
      shadow(24, 45.5, 12, 2.2) +
      '<g class="chibi-bob chibi-walk">' +
        /* cape */
        '<path d="M14 28 Q8 36 12 42 Q18 38 20 32 Z" fill="' + HOT + '" stroke="' + INK + '" stroke-width="1.6"/>' +
        '<path d="M34 28 Q40 36 36 42 Q30 38 28 32 Z" fill="' + HOT + '" stroke="' + INK + '" stroke-width="1.6"/>' +
        /* legs */
        '<rect x="16" y="38" width="6" height="7" rx="2" fill="' + BLUE + '" stroke="' + INK + '" stroke-width="1.5"/>' +
        '<rect x="26" y="38" width="6" height="7" rx="2" fill="' + BLUE + '" stroke="' + INK + '" stroke-width="1.5"/>' +
        /* body */
        '<rect x="15" y="28" width="18" height="12" rx="4" fill="' + GOLD + '" stroke="' + INK + '" stroke-width="1.7"/>' +
        /* scarf */
        '<path d="M15 27 Q24 31 33 27" fill="none" stroke="' + HOT + '" stroke-width="3.5" stroke-linecap="round"/>' +
        '<path d="M28 28 Q34 34 30 40" fill="none" stroke="' + HOT + '" stroke-width="2.6" stroke-linecap="round"/>' +
        /* head */
        '<circle cx="24" cy="16" r="11.5" fill="' + SKIN + '" stroke="' + INK + '" stroke-width="1.8"/>' +
        /* hair */
        '<path d="M12.5 16 Q12 6 24 5 Q36 6 35.5 16 Q30 10 24 10 Q18 10 12.5 16 Z" fill="' + HAIR_DK + '" stroke="' + INK + '" stroke-width="1.6"/>' +
        '<path d="M20 5 Q24 1 28 5" fill="' + HOT + '" stroke="' + INK + '" stroke-width="1.4"/>' +
        eyes(24, 16.5, o.expr, 1) +
        blush(24, 21, 0.95) +
        mouth(24, 22.5, o.expr) +
      '</g>';
    return svg(48, o.size, o.size, body, 'chibi--player ' + o.className);
  }

  function portraitPlayer(o) {
    var body =
      '<rect width="64" height="64" fill="none"/>' +
      /* shoulders */
      '<path d="M8 64 Q12 42 32 40 Q52 42 56 64 Z" fill="' + GOLD + '" stroke="' + INK + '" stroke-width="2"/>' +
      '<path d="M10 50 Q20 46 32 48 Q44 46 54 50" fill="none" stroke="' + HOT + '" stroke-width="5" stroke-linecap="round"/>' +
      /* cape tips */
      '<path d="M8 48 Q2 58 8 64" fill="' + HOT + '" stroke="' + INK + '" stroke-width="1.6"/>' +
      '<path d="M56 48 Q62 58 56 64" fill="' + HOT + '" stroke="' + INK + '" stroke-width="1.6"/>' +
      /* head */
      '<circle cx="32" cy="28" r="18" fill="' + SKIN + '" stroke="' + INK + '" stroke-width="2"/>' +
      '<path d="M14 28 Q14 8 32 6 Q50 8 50 28 Q42 18 32 18 Q22 18 14 28 Z" fill="' + HAIR_DK + '" stroke="' + INK + '" stroke-width="1.8"/>' +
      '<path d="M26 6 Q32 0 38 6" fill="' + HOT + '" stroke="' + INK + '" stroke-width="1.5"/>' +
      eyes(32, 28, o.expr, 1.45) +
      blush(32, 36, 1.35) +
      mouth(32, 38.5, o.expr);
    return svg(64, o.size, o.size, body, 'chibi--portrait chibi--player ' + o.className);
  }

  /* ========== MENTOR 笔记导师 ========== */
  function mentor(opts) {
    var o = opt(opts);
    if (o.portrait) return portraitMentor(o);
    var body =
      shadow(24, 45.5, 12, 2.2) +
      '<g class="chibi-bob">' +
        '<rect x="17" y="38" width="5.5" height="7" rx="2" fill="' + BLUE + '" stroke="' + INK + '" stroke-width="1.4"/>' +
        '<rect x="26" y="38" width="5.5" height="7" rx="2" fill="' + BLUE + '" stroke="' + INK + '" stroke-width="1.4"/>' +
        '<rect x="14" y="27" width="20" height="13" rx="4" fill="' + BLUE2 + '" stroke="' + INK + '" stroke-width="1.7"/>' +
        /* book */
        '<g class="chibi-book">' +
          '<rect x="30" y="30" width="10" height="8" rx="1" fill="' + GOLD + '" stroke="' + INK + '" stroke-width="1.4"/>' +
          '<line x1="35" y1="31" x2="35" y2="37" stroke="' + INK + '" stroke-width="1"/>' +
        '</g>' +
        '<circle cx="24" cy="15.5" r="11.5" fill="' + SKIN + '" stroke="' + INK + '" stroke-width="1.8"/>' +
        /* scholar cap */
        '<rect x="12" y="6" width="24" height="5" rx="1" fill="' + BLUE + '" stroke="' + INK + '" stroke-width="1.5"/>' +
        '<rect x="20" y="2" width="8" height="5" fill="' + BLUE + '" stroke="' + INK + '" stroke-width="1.4"/>' +
        '<line x1="28" y1="4" x2="36" y2="7" stroke="' + GOLD + '" stroke-width="2" stroke-linecap="round"/>' +
        /* glasses */
        '<circle cx="18.5" cy="16" r="4.2" fill="none" stroke="' + INK + '" stroke-width="1.6"/>' +
        '<circle cx="29.5" cy="16" r="4.2" fill="none" stroke="' + INK + '" stroke-width="1.6"/>' +
        '<line x1="22.7" y1="16" x2="25.3" y2="16" stroke="' + INK + '" stroke-width="1.5"/>' +
        eyes(24, 16.2, o.expr, 0.85) +
        blush(24, 21, 0.9) +
        mouth(24, 22.2, o.expr) +
      '</g>';
    return svg(48, o.size, o.size, body, 'chibi--mentor ' + o.className);
  }

  function portraitMentor(o) {
    var body =
      '<rect width="64" height="64" fill="none"/>' +
      '<path d="M6 64 Q10 44 32 42 Q54 44 58 64 Z" fill="' + BLUE2 + '" stroke="' + INK + '" stroke-width="2"/>' +
      '<circle cx="32" cy="28" r="18" fill="' + SKIN + '" stroke="' + INK + '" stroke-width="2"/>' +
      '<rect x="14" y="12" width="36" height="7" rx="1.5" fill="' + BLUE + '" stroke="' + INK + '" stroke-width="1.8"/>' +
      '<rect x="26" y="5" width="12" height="8" fill="' + BLUE + '" stroke="' + INK + '" stroke-width="1.6"/>' +
      '<line x1="38" y1="8" x2="50" y2="12" stroke="' + GOLD + '" stroke-width="2.4" stroke-linecap="round"/>' +
      '<circle cx="24" cy="28" r="6.5" fill="none" stroke="' + INK + '" stroke-width="2"/>' +
      '<circle cx="40" cy="28" r="6.5" fill="none" stroke="' + INK + '" stroke-width="2"/>' +
      '<line x1="30.5" y1="28" x2="33.5" y2="28" stroke="' + INK + '" stroke-width="2"/>' +
      eyes(32, 28.5, o.expr, 1.2) +
      blush(32, 37, 1.3) +
      mouth(32, 39, o.expr);
    return svg(64, o.size, o.size, body, 'chibi--portrait chibi--mentor ' + o.className);
  }

  /* ========== LIB 图书管理员 ========== */
  function lib(opts) {
    var o = opt(opts);
    if (o.portrait) return portraitLib(o);
    var body =
      shadow(24, 45.5, 12, 2.2) +
      '<g class="chibi-bob">' +
        '<rect x="17" y="38" width="5.5" height="7" rx="2" fill="' + HAIR_DK + '" stroke="' + INK + '" stroke-width="1.4"/>' +
        '<rect x="26" y="38" width="5.5" height="7" rx="2" fill="' + HAIR_DK + '" stroke="' + INK + '" stroke-width="1.4"/>' +
        '<rect x="14" y="27" width="20" height="13" rx="4" fill="#5c3d2e" stroke="' + INK + '" stroke-width="1.7"/>' +
        '<rect x="18" y="29" width="12" height="7" rx="2" fill="' + HOT + '" stroke="' + INK + '" stroke-width="1.3"/>' +
        /* book stack in arms */
        '<g class="chibi-book">' +
          '<rect x="31" y="28" width="11" height="4" rx="0.8" fill="' + HOT + '" stroke="' + INK + '" stroke-width="1.2"/>' +
          '<rect x="32" y="24" width="10" height="4" rx="0.8" fill="' + GOLD + '" stroke="' + INK + '" stroke-width="1.2"/>' +
          '<rect x="33" y="20" width="9" height="4" rx="0.8" fill="' + BLUE2 + '" stroke="' + INK + '" stroke-width="1.2"/>' +
        '</g>' +
        '<circle cx="22" cy="15.5" r="11.5" fill="' + SKIN + '" stroke="' + INK + '" stroke-width="1.8"/>' +
        '<path d="M11 16 Q11 5 22 4 Q33 5 33 16 Q28 9 22 9 Q16 9 11 16 Z" fill="' + HAIR_BR + '" stroke="' + INK + '" stroke-width="1.6"/>' +
        '<path d="M10 18 Q8 24 12 28" fill="none" stroke="' + HAIR_BR + '" stroke-width="3" stroke-linecap="round"/>' +
        eyes(22, 16, o.expr, 0.95) +
        blush(22, 20.8, 0.9) +
        mouth(22, 22, o.expr) +
      '</g>';
    return svg(48, o.size, o.size, body, 'chibi--lib ' + o.className);
  }

  function portraitLib(o) {
    var body =
      '<rect width="64" height="64" fill="none"/>' +
      '<path d="M6 64 Q10 44 32 42 Q54 44 58 64 Z" fill="#5c3d2e" stroke="' + INK + '" stroke-width="2"/>' +
      '<rect x="22" y="48" width="20" height="10" rx="2" fill="' + HOT + '" stroke="' + INK + '" stroke-width="1.5"/>' +
      '<g class="chibi-book">' +
        '<rect x="44" y="40" width="14" height="6" rx="1" fill="' + HOT + '" stroke="' + INK + '" stroke-width="1.4"/>' +
        '<rect x="45" y="34" width="13" height="6" rx="1" fill="' + GOLD + '" stroke="' + INK + '" stroke-width="1.4"/>' +
        '<rect x="46" y="28" width="12" height="6" rx="1" fill="' + BLUE2 + '" stroke="' + INK + '" stroke-width="1.4"/>' +
      '</g>' +
      '<circle cx="30" cy="28" r="18" fill="' + SKIN + '" stroke="' + INK + '" stroke-width="2"/>' +
      '<path d="M12 28 Q12 8 30 6 Q48 8 48 28 Q40 16 30 16 Q20 16 12 28 Z" fill="' + HAIR_BR + '" stroke="' + INK + '" stroke-width="1.8"/>' +
      eyes(30, 28, o.expr, 1.35) +
      blush(30, 36.5, 1.3) +
      mouth(30, 39, o.expr);
    return svg(64, o.size, o.size, body, 'chibi--portrait chibi--lib ' + o.className);
  }

  /* ========== SMITH 编译器工匠 ========== */
  function smith(opts) {
    var o = opt(opts);
    if (o.portrait) return portraitSmith(o);
    var body =
      shadow(24, 45.5, 12, 2.2) +
      '<g class="chibi-bob">' +
        '<rect x="16" y="38" width="6" height="7" rx="2" fill="' + GRAY2 + '" stroke="' + INK + '" stroke-width="1.4"/>' +
        '<rect x="26" y="38" width="6" height="7" rx="2" fill="' + GRAY2 + '" stroke="' + INK + '" stroke-width="1.4"/>' +
        /* apron body */
        '<rect x="14" y="27" width="20" height="13" rx="4" fill="' + GRAY + '" stroke="' + INK + '" stroke-width="1.7"/>' +
        '<path d="M16 28 L32 28 L30 40 L18 40 Z" fill="#cfc6b6" stroke="' + INK + '" stroke-width="1.4"/>' +
        '<line x1="24" y1="28" x2="24" y2="40" stroke="' + INK + '" stroke-width="1.2"/>' +
        /* hammer */
        '<g class="chibi-hammer">' +
          '<rect x="34" y="22" width="3" height="14" rx="1" fill="#6b4a2e" stroke="' + INK + '" stroke-width="1.2"/>' +
          '<rect x="31" y="18" width="9" height="6" rx="1" fill="' + GRAY2 + '" stroke="' + INK + '" stroke-width="1.4"/>' +
        '</g>' +
        '<circle cx="24" cy="15.5" r="11.5" fill="' + SKIN + '" stroke="' + INK + '" stroke-width="1.8"/>' +
        /* bandana */
        '<path d="M12.5 14 Q13 5 24 4 Q35 5 35.5 14 Q30 9 24 9 Q18 9 12.5 14 Z" fill="#555" stroke="' + INK + '" stroke-width="1.6"/>' +
        '<path d="M34 10 Q40 12 38 18" fill="none" stroke="#555" stroke-width="2.5" stroke-linecap="round"/>' +
        eyes(24, 16.5, o.expr, 0.95) +
        /* soot smudge */
        '<ellipse cx="30" cy="20" rx="2.8" ry="1.8" fill="' + GRAY2 + '" opacity=".85"/>' +
        '<ellipse cx="18" cy="19" rx="1.6" ry="1.1" fill="' + GRAY2 + '" opacity=".7"/>' +
        blush(24, 21, 0.85) +
        mouth(24, 22.5, o.expr) +
      '</g>';
    return svg(48, o.size, o.size, body, 'chibi--smith ' + o.className);
  }

  function portraitSmith(o) {
    var body =
      '<rect width="64" height="64" fill="none"/>' +
      '<path d="M6 64 Q10 44 32 42 Q54 44 58 64 Z" fill="' + GRAY + '" stroke="' + INK + '" stroke-width="2"/>' +
      '<path d="M18 46 L46 46 L42 64 L22 64 Z" fill="#cfc6b6" stroke="' + INK + '" stroke-width="1.6"/>' +
      '<circle cx="32" cy="28" r="18" fill="' + SKIN + '" stroke="' + INK + '" stroke-width="2"/>' +
      '<path d="M14 26 Q15 8 32 6 Q49 8 50 26 Q42 16 32 16 Q22 16 14 26 Z" fill="#555" stroke="' + INK + '" stroke-width="1.8"/>' +
      eyes(32, 28, o.expr, 1.35) +
      '<ellipse cx="42" cy="34" rx="4" ry="2.6" fill="' + GRAY2 + '" opacity=".85"/>' +
      '<ellipse cx="22" cy="33" rx="2.4" ry="1.6" fill="' + GRAY2 + '" opacity=".7"/>' +
      blush(32, 36.5, 1.2) +
      mouth(32, 39, o.expr);
    return svg(64, o.size, o.size, body, 'chibi--portrait chibi--smith ' + o.className);
  }

  /* ========== GUARD 门卫 ========== */
  function guard(opts) {
    var o = opt(opts);
    if (o.portrait) return portraitGuard(o);
    var body =
      shadow(24, 45.5, 12, 2.2) +
      '<g class="chibi-bob">' +
        '<rect x="16" y="38" width="6" height="7" rx="2" fill="#2a1a1a" stroke="' + INK + '" stroke-width="1.4"/>' +
        '<rect x="26" y="38" width="6" height="7" rx="2" fill="#2a1a1a" stroke="' + INK + '" stroke-width="1.4"/>' +
        '<rect x="14" y="27" width="20" height="13" rx="4" fill="#4a1a1a" stroke="' + INK + '" stroke-width="1.7"/>' +
        '<rect x="18" y="29" width="12" height="7" rx="2" fill="#cfc6b6" stroke="' + INK + '" stroke-width="1.3"/>' +
        /* spear */
        '<g class="chibi-spear">' +
          '<rect x="38" y="10" width="2.4" height="28" rx="1" fill="' + GRAY + '" stroke="' + INK + '" stroke-width="1.2"/>' +
          '<polygon points="39.2,6 43,12 35.4,12" fill="' + GOLD + '" stroke="' + INK + '" stroke-width="1.3"/>' +
        '</g>' +
        '<circle cx="24" cy="16.5" r="10.5" fill="' + SKIN + '" stroke="' + INK + '" stroke-width="1.8"/>' +
        /* round helmet */
        '<path d="M12 16 Q12 4 24 3 Q36 4 36 16 Q30 10 24 10 Q18 10 12 16 Z" fill="' + GRAY + '" stroke="' + INK + '" stroke-width="1.7"/>' +
        '<rect x="20" y="3" width="8" height="4" rx="1" fill="' + GOLD + '" stroke="' + INK + '" stroke-width="1.2"/>' +
        eyes(24, 17, o.expr, 0.9) +
        blush(24, 21.5, 0.85) +
        mouth(24, 23, o.expr) +
      '</g>';
    return svg(48, o.size, o.size, body, 'chibi--guard ' + o.className);
  }

  function portraitGuard(o) {
    var body =
      '<rect width="64" height="64" fill="none"/>' +
      '<path d="M6 64 Q10 44 32 42 Q54 44 58 64 Z" fill="#4a1a1a" stroke="' + INK + '" stroke-width="2"/>' +
      '<rect x="20" y="48" width="24" height="12" rx="2" fill="#cfc6b6" stroke="' + INK + '" stroke-width="1.5"/>' +
      '<circle cx="32" cy="30" r="17" fill="' + SKIN + '" stroke="' + INK + '" stroke-width="2"/>' +
      '<path d="M14 28 Q14 8 32 6 Q50 8 50 28 Q42 16 32 16 Q22 16 14 28 Z" fill="' + GRAY + '" stroke="' + INK + '" stroke-width="2"/>' +
      '<rect x="26" y="6" width="12" height="6" rx="1.5" fill="' + GOLD + '" stroke="' + INK + '" stroke-width="1.4"/>' +
      eyes(32, 30, o.expr, 1.3) +
      blush(32, 38, 1.25) +
      mouth(32, 40.5, o.expr);
    return svg(64, o.size, o.size, body, 'chibi--portrait chibi--guard ' + o.className);
  }

  /* ========== CAT 流浪猫 ========== */
  function cat(opts) {
    var o = opt(opts);
    if (o.portrait) return portraitCat(o);
    var body =
      shadow(24, 42, 14, 2.4) +
      '<g class="chibi-bob">' +
        /* tail */
        '<path class="chibi-tail" d="M36 28 Q46 18 42 32 Q40 38 36 34" fill="' + CAT + '" stroke="' + INK + '" stroke-width="1.6"/>' +
        /* round body */
        '<ellipse cx="22" cy="30" rx="14" ry="11" fill="' + CAT + '" stroke="' + INK + '" stroke-width="1.8"/>' +
        /* head */
        '<circle cx="20" cy="18" r="11" fill="' + CAT + '" stroke="' + INK + '" stroke-width="1.8"/>' +
        /* ears */
        '<polygon points="10,12 12,3 17,11" fill="' + CAT + '" stroke="' + INK + '" stroke-width="1.5"/>' +
        '<polygon points="23,11 28,3 30,12" fill="' + CAT + '" stroke="' + INK + '" stroke-width="1.5"/>' +
        '<polygon points="12,10 13,5 15.5,10" fill="' + BLUSH + '" opacity=".7"/>' +
        '<polygon points="25,10 27,5 28.5,10" fill="' + BLUSH + '" opacity=".7"/>' +
        eyes(20, 18, o.expr, 0.95) +
        blush(20, 22.5, 0.85) +
        /* nose + mouth */
        '<ellipse cx="20" cy="22.2" rx="1.5" ry="1.1" fill="' + HOT + '" stroke="' + INK + '" stroke-width="0.8"/>' +
        (o.expr === 'happy'
          ? '<path d="M16 23.5 Q20 26 24 23.5" fill="none" stroke="' + INK + '" stroke-width="1.3" stroke-linecap="round"/>'
          : '<path d="M17 23.5 Q20 25 23 23.5" fill="none" stroke="' + INK + '" stroke-width="1.2"/>') +
        /* belly */
        '<ellipse cx="22" cy="32" rx="7" ry="5.5" fill="' + PAPER + '" opacity=".55"/>' +
      '</g>';
    return svg(48, o.size, Math.round(o.size * 0.85), body, 'chibi--cat ' + o.className);
  }

  function portraitCat(o) {
    var body =
      '<rect width="64" height="64" fill="none"/>' +
      '<ellipse cx="32" cy="52" rx="22" ry="14" fill="' + CAT + '" stroke="' + INK + '" stroke-width="2"/>' +
      '<circle cx="32" cy="30" r="20" fill="' + CAT + '" stroke="' + INK + '" stroke-width="2"/>' +
      '<polygon points="14,22 16,6 26,18" fill="' + CAT + '" stroke="' + INK + '" stroke-width="1.8"/>' +
      '<polygon points="38,18 48,6 50,22" fill="' + CAT + '" stroke="' + INK + '" stroke-width="1.8"/>' +
      eyes(32, 30, o.expr, 1.5) +
      blush(32, 38, 1.4) +
      '<ellipse cx="32" cy="38" rx="2.4" ry="1.8" fill="' + HOT + '" stroke="' + INK + '" stroke-width="1"/>' +
      mouth(32, 42, o.expr);
    return svg(64, o.size, o.size, body, 'chibi--portrait chibi--cat ' + o.className);
  }

  /* ========== BOSSES ========== */
  function bossFace(cx, cy, expr, scale) {
    return eyes(cx, cy, expr, scale) + blush(cx, cy + 5 * scale, scale * 0.9) + mouth(cx, cy + 7 * scale, expr);
  }

  /* CH.1 语言 — curly-brace monster */
  function boss1(opts) {
    var o = opt(opts);
    o.size = opts && opts.size ? opts.size : (o.portrait ? 80 : 96);
    if (o.portrait) return portraitBoss1(o);
    var body =
      shadow(48, 90, 28, 4) +
      '<g class="chibi-wobble">' +
        /* aura ring handled in CSS/host; soft glow disc */
        '<ellipse cx="48" cy="52" rx="40" ry="38" fill="' + PURPLE + '" opacity=".12"/>' +
        /* left curly brace — thick filled silhouette */
        '<path d="M22 18 C10 22 6 34 10 48 C6 62 10 74 22 78 C14 70 12 58 14 48 C12 38 14 26 22 18 Z" fill="' + PURPLE + '" stroke="' + INK + '" stroke-width="2"/>' +
        '<text x="8" y="54" font-family="ui-monospace,Menlo,monospace" font-size="28" font-weight="800" fill="' + GOLD + '" stroke="' + INK + '" stroke-width="1.2">{</text>' +
        /* right curly brace */
        '<path d="M74 18 C86 22 90 34 86 48 C90 62 86 74 74 78 C82 70 84 58 82 48 C84 38 82 26 74 18 Z" fill="' + PURPLE + '" stroke="' + INK + '" stroke-width="2"/>' +
        '<text x="78" y="54" font-family="ui-monospace,Menlo,monospace" font-size="28" font-weight="800" fill="' + GOLD + '" stroke="' + INK + '" stroke-width="1.2">}</text>' +
        /* body blob */
        '<ellipse cx="48" cy="48" rx="26" ry="24" fill="' + PURPLE2 + '" stroke="' + INK + '" stroke-width="2.2"/>' +
        '<ellipse cx="48" cy="48" rx="20" ry="18" fill="' + PURPLE + '"/>' +
        /* horns / crown tips */
        '<polygon points="30,22 34,8 40,22" fill="' + GOLD + '" stroke="' + INK + '" stroke-width="1.6"/>' +
        '<polygon points="56,22 62,8 66,22" fill="' + GOLD + '" stroke="' + INK + '" stroke-width="1.6"/>' +
        /* mischievous face */
        bossFace(48, 46, o.expr, 1.6) +
        /* tiny arms */
        '<circle cx="22" cy="55" r="5" fill="' + PURPLE + '" stroke="' + INK + '" stroke-width="1.5"/>' +
        '<circle cx="74" cy="55" r="5" fill="' + PURPLE + '" stroke="' + INK + '" stroke-width="1.5"/>' +
      '</g>';
    return svg(96, o.size, o.size, body, 'chibi--boss chibi--boss1 ' + o.className);
  }

  function portraitBoss1(o) {
    var body =
      '<rect width="64" height="64" fill="none"/>' +
      '<text x="2" y="42" font-family="ui-monospace,Menlo,monospace" font-size="26" font-weight="800" fill="' + GOLD + '" stroke="' + INK + '" stroke-width="1.2">{</text>' +
      '<text x="50" y="42" font-family="ui-monospace,Menlo,monospace" font-size="26" font-weight="800" fill="' + GOLD + '" stroke="' + INK + '" stroke-width="1.2">}</text>' +
      '<ellipse cx="32" cy="36" rx="22" ry="20" fill="' + PURPLE2 + '" stroke="' + INK + '" stroke-width="2"/>' +
      '<ellipse cx="32" cy="36" rx="16" ry="14" fill="' + PURPLE + '"/>' +
      '<polygon points="16,20 20,6 26,20" fill="' + GOLD + '" stroke="' + INK + '" stroke-width="1.5"/>' +
      '<polygon points="38,20 44,6 48,20" fill="' + GOLD + '" stroke="' + INK + '" stroke-width="1.5"/>' +
      bossFace(32, 34, o.expr, 1.35);
    return svg(64, o.size, o.size, body, 'chibi--portrait chibi--boss1 ' + o.className);
  }

  /* CH.2 平台 — JVM gear golem */
  function boss2(opts) {
    var o = opt(opts);
    o.size = opts && opts.size ? opts.size : (o.portrait ? 80 : 96);
    if (o.portrait) return portraitBoss2(o);
    var body =
      shadow(48, 90, 28, 4) +
      '<g class="chibi-wobble">' +
        '<ellipse cx="48" cy="52" rx="40" ry="38" fill="#3d8bfd" opacity=".12"/>' +
        /* outer gear */
        '<path d="M48 12 L54 18 L64 16 L66 26 L76 30 L72 40 L80 48 L72 56 L76 66 L66 70 L64 80 L54 78 L48 86 L42 78 L32 80 L30 70 L20 66 L24 56 L16 48 L24 40 L20 30 L30 26 L32 16 L42 18 Z" fill="#5a6a7a" stroke="' + INK + '" stroke-width="2"/>' +
        '<circle cx="48" cy="48" r="22" fill="#7a8a9a" stroke="' + INK + '" stroke-width="2"/>' +
        '<circle cx="48" cy="48" r="16" fill="#c5d0da" stroke="' + INK + '" stroke-width="1.8"/>' +
        /* face plate */
        '<circle cx="48" cy="48" r="13" fill="' + SKIN + '" stroke="' + INK + '" stroke-width="1.8"/>' +
        /* crown bolt */
        '<rect x="44" y="10" width="8" height="10" rx="2" fill="' + GOLD + '" stroke="' + INK + '" stroke-width="1.5"/>' +
        bossFace(48, 47, o.expr, 1.35) +
      '</g>';
    return svg(96, o.size, o.size, body, 'chibi--boss chibi--boss2 ' + o.className);
  }

  function portraitBoss2(o) {
    var body =
      '<rect width="64" height="64" fill="none"/>' +
      '<circle cx="32" cy="34" r="24" fill="#7a8a9a" stroke="' + INK + '" stroke-width="2"/>' +
      '<circle cx="32" cy="34" r="16" fill="#c5d0da" stroke="' + INK + '" stroke-width="1.8"/>' +
      '<circle cx="32" cy="34" r="13" fill="' + SKIN + '" stroke="' + INK + '" stroke-width="1.8"/>' +
      '<rect x="28" y="6" width="8" height="10" rx="2" fill="' + GOLD + '" stroke="' + INK + '" stroke-width="1.4"/>' +
      bossFace(32, 33, o.expr, 1.25);
    return svg(64, o.size, o.size, body, 'chibi--portrait chibi--boss2 ' + o.className);
  }

  /* CH.3 生态 — leaf / spring sprite */
  function boss3(opts) {
    var o = opt(opts);
    o.size = opts && opts.size ? opts.size : (o.portrait ? 80 : 96);
    if (o.portrait) return portraitBoss3(o);
    var body =
      shadow(48, 90, 28, 4) +
      '<g class="chibi-wobble">' +
        '<ellipse cx="48" cy="52" rx="40" ry="38" fill="' + GREEN + '" opacity=".12"/>' +
        /* leaf body */
        '<ellipse cx="48" cy="50" rx="28" ry="26" fill="#3cb371" stroke="' + INK + '" stroke-width="2.2"/>' +
        '<ellipse cx="48" cy="50" rx="20" ry="18" fill="#6dd39a"/>' +
        '<path d="M48 28 Q52 50 48 72" fill="none" stroke="' + INK + '" stroke-width="1.6" opacity=".35"/>' +
        /* leaf crown */
        '<path d="M30 24 Q24 10 36 16 Z" fill="#2a9d5c" stroke="' + INK + '" stroke-width="1.5"/>' +
        '<path d="M48 20 Q48 4 56 16 Z" fill="#2a9d5c" stroke="' + INK + '" stroke-width="1.5"/>' +
        '<path d="M62 24 Q72 10 60 18 Z" fill="#2a9d5c" stroke="' + INK + '" stroke-width="1.5"/>' +
        /* spring coil accent */
        '<path d="M70 40 Q78 44 70 48 Q78 52 70 56" fill="none" stroke="' + GOLD + '" stroke-width="2.4" stroke-linecap="round"/>' +
        bossFace(48, 48, o.expr, 1.55) +
        '<circle cx="24" cy="58" r="5" fill="#2a9d5c" stroke="' + INK + '" stroke-width="1.5"/>' +
        '<circle cx="72" cy="58" r="5" fill="#2a9d5c" stroke="' + INK + '" stroke-width="1.5"/>' +
      '</g>';
    return svg(96, o.size, o.size, body, 'chibi--boss chibi--boss3 ' + o.className);
  }

  function portraitBoss3(o) {
    var body =
      '<rect width="64" height="64" fill="none"/>' +
      '<ellipse cx="32" cy="36" rx="24" ry="22" fill="#3cb371" stroke="' + INK + '" stroke-width="2"/>' +
      '<ellipse cx="32" cy="36" rx="17" ry="15" fill="#6dd39a"/>' +
      '<path d="M18 20 Q14 6 24 14 Z" fill="#2a9d5c" stroke="' + INK + '" stroke-width="1.4"/>' +
      '<path d="M32 16 Q32 2 40 12 Z" fill="#2a9d5c" stroke="' + INK + '" stroke-width="1.4"/>' +
      '<path d="M44 20 Q52 6 48 16 Z" fill="#2a9d5c" stroke="' + INK + '" stroke-width="1.4"/>' +
      bossFace(32, 34, o.expr, 1.3);
    return svg(64, o.size, o.size, body, 'chibi--portrait chibi--boss3 ' + o.className);
  }

  function boss(opts) { return boss1(opts); }

  /* props kept cute for drop-in */
  function shelf() {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="36" viewBox="0 0 22 36" aria-hidden="true" focusable="false" class="chibi chibi--shelf">' +
      '<rect x="1" y="1" width="20" height="34" rx="2" fill="#6b4a2e" stroke="' + INK + '" stroke-width="1.6"/>' +
      '<rect x="3" y="4" width="5" height="12" rx="1" fill="' + HOT + '"/>' +
      '<rect x="9" y="4" width="5" height="12" rx="1" fill="' + GOLD + '"/>' +
      '<rect x="15" y="4" width="4" height="12" rx="1" fill="' + BLUE + '"/>' +
      '<rect x="3" y="20" width="6" height="12" rx="1" fill="' + GREEN + '"/>' +
      '<rect x="10" y="20" width="8" height="12" rx="1" fill="' + PURPLE + '"/>' +
      '</svg>';
  }

  function anvil() {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="18" viewBox="0 0 28 18" aria-hidden="true" focusable="false" class="chibi chibi--anvil">' +
      '<rect x="2" y="2" width="24" height="8" rx="2" fill="' + GRAY2 + '" stroke="' + INK + '" stroke-width="1.5"/>' +
      '<rect x="8" y="10" width="12" height="6" rx="1" fill="#2a2a2a" stroke="' + INK + '" stroke-width="1.4"/>' +
      '<rect x="18" y="0" width="4" height="10" fill="#6b4a2e" stroke="' + INK + '" stroke-width="1"/>' +
      '<rect x="16" y="0" width="8" height="4" rx="1" fill="#888" stroke="' + INK + '" stroke-width="1"/>' +
      '</svg>';
  }

  function tree() {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40" aria-hidden="true" focusable="false" class="chibi chibi--tree">' +
      '<rect x="13" y="24" width="6" height="14" rx="1" fill="#6b4a2e" stroke="' + INK + '" stroke-width="1.3"/>' +
      '<ellipse cx="16" cy="18" rx="11" ry="10" fill="#2a7a45" stroke="' + INK + '" stroke-width="1.6"/>' +
      '<ellipse cx="16" cy="10" rx="8" ry="7" fill="#3a9a55" stroke="' + INK + '" stroke-width="1.5"/>' +
      '</svg>';
  }

  function rock() {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="16" viewBox="0 0 24 16" aria-hidden="true" focusable="false" class="chibi chibi--rock">' +
      '<ellipse cx="12" cy="10" rx="10" ry="5" fill="#8a8174" stroke="' + INK + '" stroke-width="1.5"/>' +
      '<ellipse cx="12" cy="8" rx="7" ry="4" fill="#a39a8c"/>' +
      '</svg>';
  }

  var FN = {
    player: player, mentor: mentor, lib: lib, librarian: lib,
    smith: smith, guard: guard, cat: cat,
    boss: boss, boss1: boss1, boss2: boss2, boss3: boss3,
    shelf: shelf, anvil: anvil, tree: tree, rock: rock
  };

  function portrait(id, expr) {
    var key = id === 'librarian' ? 'lib' : id;
    var fn = FN[key];
    if (!fn) return mentor({ portrait: true, expr: expr });
    return fn({ portrait: true, expr: expr || 'normal', size: 64 });
  }

  /* Static SVG strings matching 变鼠's SVG.player / SVG.mentor / … drop-in */
  function buildDropIn() {
    return {
      player: player(),
      mentor: mentor(),
      lib: lib(),
      shelf: shelf(),
      smith: smith(),
      anvil: anvil(),
      guard: guard(),
      cat: cat(),
      boss: boss1(),
      boss1: boss1(),
      boss2: boss2(),
      boss3: boss3(),
      tree: tree(),
      rock: rock()
    };
  }

  var API = {
    version: 'chibi-1',
    player: player,
    mentor: mentor,
    lib: lib,
    librarian: lib,
    smith: smith,
    guard: guard,
    cat: cat,
    boss: boss,
    boss1: boss1,
    boss2: boss2,
    boss3: boss3,
    shelf: shelf,
    anvil: anvil,
    tree: tree,
    rock: rock,
    portrait: portrait,
    dropIn: buildDropIn,
    /* id (quest-data) → sprite key (SVG object) */
    ID_TO_SPRITE: {
      mentor: 'mentor',
      librarian: 'lib',
      smith: 'smith',
      guard: 'guard',
      cat: 'cat'
    },
    /* mismatches to document */
    MISMATCH: {
      librarian: 'NPC id is "librarian" but SVG/sprite key is "lib" (unchanged from 变鼠).',
      boss: '变鼠 uses a single SVG.boss for all chapters. This pack adds boss1/boss2/boss3; SVG.boss === boss1 for drop-in. Wire chapter-themed bosses in renderNodes.',
      player_name: 'Always 「冒险者」 — portraits do not embed the name.'
    }
  };

  root.TN_CHIBI = API;
  root.TN_CHIBI_SVG = buildDropIn();
})(typeof window !== 'undefined' ? window : this);
