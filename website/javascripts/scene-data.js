/* tech-notes · 章节场景数据 + 绘制小工具（移植自 tn-ui/scene 原型 themes.js / scene.js）
 * 只定义 window.TN_SCENE_THEMES / TN_WORLD_MAP / TN_SCENE_KIT；不读 URL 参数、不读写存储、不发网络请求。 */
window.TN_SCENE_THEMES = {
  "basics:1": {
    id: "basics:1", topic: "basics", chapter: 1,
    name: "零基础入门", land: "新手村",
    theme: "meadow", label: "草地村",
    nodes: [
      {x:12,y:78},{x:28,y:66},{x:44,y:56},{x:60,y:44},{x:74,y:34}
    ],
    bossAt: {x:84,y:24},
    gateAt: {x:88,y:20},
    nodesPortrait: [{x:20,y:86},{x:62,y:74},{x:26,y:62},{x:66,y:50},{x:30,y:38}],
    bossAtPortrait: {x:70,y:28},
    gateAtPortrait: {x:86,y:22},
    props: [
      {k:"skyline-meadow",x:50,y:24,layer:"bg"},
      {k:"cloud",x:18,y:12,layer:"bg"},{k:"cloud",x:55,y:9,layer:"bg"},{k:"cloud",x:78,y:14,layer:"bg"},
      {k:"tree",x:6,y:50,layer:"mid"},{k:"tree",x:20,y:46,layer:"mid"},{k:"bonsai",x:52,y:36,layer:"mid"},
      {k:"house",x:8,y:40,layer:"mid"},{k:"house",x:58,y:28,layer:"mid"},
      {k:"solar",x:16,y:36,layer:"mid"},{k:"dish",x:68,y:30,layer:"mid"},
      {k:"drone",x:42,y:22,layer:"mid"},{k:"server",x:34,y:48,layer:"mid"},
      {k:"well",x:38,y:66,layer:"mid"},{k:"robotpet",x:48,y:62,layer:"mid"},
      {k:"flower",x:22,y:68,layer:"mid"},{k:"flower",x:68,y:38,layer:"mid"},
      {k:"bush",x:8,y:90,layer:"fg"},{k:"bush",x:92,y:92,layer:"fg"},
      {k:"tuft",x:18,y:94,layer:"fg"},{k:"tuft",x:78,y:95,layer:"fg"},{k:"tuft",x:40,y:92,layer:"fg"}
    ]
  },
  "basics:2": {
    id: "basics:2", topic: "basics", chapter: 2,
    name: "计算机基础", land: "新手村",
    theme: "circuit", label: "电路镇",
    nodes: [
      {x:10,y:78},{x:24,y:68},{x:38,y:58},{x:52,y:50},{x:64,y:42},{x:74,y:34},{x:82,y:28}
    ],
    bossAt: {x:86,y:28},
    gateAt: {x:88,y:20},
    nodesPortrait: [{x:22,y:88},{x:64,y:78},{x:26,y:66},{x:66,y:56},{x:28,y:46},{x:62,y:36},{x:34,y:28}],
    bossAtPortrait: {x:68,y:22},
    gateAtPortrait: {x:86,y:22},
    props: [
      {k:"skyline-circuit",x:50,y:22,layer:"bg"},
      {k:"cloud",x:20,y:11,layer:"bg"},{k:"cloud",x:62,y:8,layer:"bg"},
      {k:"server",x:8,y:42,layer:"mid"},{k:"server",x:48,y:32,layer:"mid"},{k:"server",x:22,y:56,layer:"mid"},{k:"server",x:70,y:50,layer:"mid"},
      {k:"gear",x:20,y:52,layer:"mid"},{k:"gear",x:58,y:58,layer:"mid"},
      {k:"chip",x:34,y:66,layer:"mid"},{k:"antenna",x:80,y:40,layer:"mid"},
      {k:"cable",x:30,y:72,layer:"mid"},{k:"cable",x:62,y:48,layer:"mid"},
      {k:"drone",x:40,y:24,layer:"mid"},{k:"dish",x:86,y:36,layer:"mid"},
      {k:"bush",x:6,y:92,layer:"fg"},{k:"tuft",x:22,y:94,layer:"fg"},{k:"tuft",x:86,y:93,layer:"fg"}
    ]
  },
  "basics:3": {
    id: "basics:3", topic: "basics", chapter: 3,
    name: "编程入门", land: "新手村",
    theme: "forge", label: "锻炉林",
    nodes: [
      {x:12,y:78},{x:28,y:66},{x:44,y:54},{x:58,y:44},{x:72,y:34},{x:82,y:28}
    ],
    bossAt: {x:86,y:28},
    gateAt: {x:88,y:20},
    nodesPortrait: [{x:22,y:86},{x:64,y:74},{x:26,y:60},{x:66,y:48},{x:32,y:36},{x:62,y:28}],
    bossAtPortrait: {x:70,y:22},
    gateAtPortrait: {x:86,y:22},
    props: [
      {k:"skyline-forge",x:50,y:22,layer:"bg"},
      {k:"cloud",x:24,y:11,layer:"bg"},{k:"cloud",x:68,y:9,layer:"bg"},
      {k:"tree",x:5,y:50,layer:"mid"},{k:"tree",x:18,y:44,layer:"mid"},{k:"tree",x:52,y:58,layer:"mid"},{k:"tree",x:78,y:46,layer:"mid"},
      {k:"forge",x:10,y:38,layer:"mid"},{k:"anvil",x:30,y:72,layer:"mid"},{k:"cabin",x:58,y:30,layer:"mid"},
      {k:"firefly",x:28,y:40,layer:"mid"},{k:"firefly",x:55,y:36,layer:"mid"},{k:"firefly",x:72,y:44,layer:"mid"},
      {k:"bush",x:10,y:92,layer:"fg"},{k:"tuft",x:80,y:94,layer:"fg"}
    ]
  },
  "java:1": {
    id: "java:1", topic: "java", chapter: 1,
    name: "语言", land: "Java",
    theme: "castle", label: "语法城堡",
    nodes: [
      {x:14,y:76},{x:32,y:62},{x:50,y:50},{x:66,y:38}
    ],
    bossAt: {x:80,y:28},
    gateAt: {x:88,y:20},
    nodesPortrait: [{x:22,y:86},{x:62,y:72},{x:28,y:58},{x:64,y:44},{x:34,y:32}],
    bossAtPortrait: {x:68,y:26},
    gateAtPortrait: {x:86,y:22},
    props: [
      {k:"skyline-castle",x:50,y:20,layer:"bg"},
      {k:"cloud",x:18,y:11,layer:"bg"},{k:"cloud",x:70,y:9,layer:"bg"},
      {k:"castle",x:48,y:24,layer:"mid"},{k:"drone",x:36,y:20,layer:"mid"},{k:"dish",x:62,y:28,layer:"mid"},{k:"tree",x:6,y:50,layer:"mid"},{k:"tree",x:22,y:62,layer:"mid"},
      {k:"banner",x:36,y:56,layer:"mid"},{k:"flower",x:18,y:72,layer:"mid"},{k:"flower",x:56,y:58,layer:"mid"},
      {k:"rock",x:74,y:52,layer:"mid"},
      {k:"bush",x:8,y:92,layer:"fg"},{k:"tuft",x:88,y:94,layer:"fg"}
    ]
  },
  "java:2": {
    id: "java:2", topic: "java", chapter: 2,
    name: "平台", land: "Java",
    theme: "harbor", label: "平台港",
    nodes: [
      {x:12,y:74},{x:28,y:60},{x:44,y:50},{x:60,y:40}
    ],
    bossAt: {x:76,y:28},
    gateAt: {x:88,y:20},
    nodesPortrait: [{x:22,y:84},{x:62,y:70},{x:28,y:56},{x:64,y:42},{x:34,y:30}],
    bossAtPortrait: {x:68,y:24},
    gateAtPortrait: {x:86,y:22},
    props: [
      {k:"skyline-harbor",x:50,y:22,layer:"bg"},
      {k:"cloud",x:28,y:10,layer:"bg"},{k:"cloud",x:66,y:12,layer:"bg"},
      {k:"water",x:50,y:88,layer:"bg"},
      {k:"boat",x:18,y:82,layer:"mid"},{k:"crane",x:8,y:40,layer:"mid"},
      {k:"warehouse",x:50,y:54,layer:"mid"},{k:"chimney",x:70,y:46,layer:"mid"},
      {k:"crate",x:36,y:70,layer:"mid"},{k:"crate",x:58,y:64,layer:"mid"},
      {k:"bush",x:90,y:78,layer:"fg"},{k:"tuft",x:6,y:76,layer:"fg"}
    ]
  },
  "java:3": {
    id: "java:3", topic: "java", chapter: 3,
    name: "生态", land: "Java",
    theme: "market", label: "生态市集",
    nodes: [
      {x:14,y:76},{x:30,y:62},{x:48,y:50},{x:66,y:38}
    ],
    bossAt: {x:80,y:26},
    gateAt: {x:88,y:20},
    nodesPortrait: [{x:22,y:86},{x:62,y:72},{x:28,y:56},{x:64,y:42},{x:34,y:30}],
    bossAtPortrait: {x:68,y:24},
    gateAtPortrait: {x:86,y:22},
    props: [
      {k:"skyline-market",x:50,y:20,layer:"bg"},
      {k:"cloud",x:16,y:11,layer:"bg"},{k:"cloud",x:72,y:8,layer:"bg"},
      {k:"stall",x:8,y:48,layer:"mid"},{k:"stall",x:22,y:42,layer:"mid"},{k:"stall",x:54,y:56,layer:"mid"},
      {k:"tower",x:58,y:26,layer:"mid"},{k:"lamp",x:36,y:64,layer:"mid"},{k:"lamp",x:62,y:50,layer:"mid"},
      {k:"cart",x:40,y:72,layer:"mid"},
      {k:"bush",x:10,y:92,layer:"fg"},{k:"tuft",x:85,y:94,layer:"fg"}
    ]
  }
};

window.TN_WORLD_MAP = {
  /* holographic star-chart platforms (%, canvas-relative) */
  lands: [
    {
      id: "basics", name: "新手村", subtitle: "基础大陆",
      icon: "village",
      x: 8, y: 38, w: 34, h: 42,
      xP: 8, yP: 48, wP: 84, hP: 40,
      tone: "#166534", glow: "#4ade80",
      chapters: [
        { key: "basics:1", name: "零基础入门", x: 18, y: 72, xP: 26, yP: 78 },
        { key: "basics:2", name: "计算机基础", x: 34, y: 56, xP: 58, yP: 66 },
        { key: "basics:3", name: "编程入门", x: 22, y: 42, xP: 38, yP: 54 }
      ]
    },
    {
      id: "java", name: "Java", subtitle: "语法群岛",
      icon: "coffee",
      x: 44, y: 18, w: 30, h: 38,
      xP: 10, yP: 12, wP: 70, hP: 34,
      tone: "#0c4a6e", glow: "#38bdf8",
      chapters: [
        { key: "java:1", name: "语言", x: 56, y: 52, xP: 26, yP: 34 },
        { key: "java:2", name: "平台", x: 70, y: 40, xP: 54, yP: 28 },
        { key: "java:3", name: "生态", x: 60, y: 28, xP: 40, yP: 20 }
      ]
    },
    {
      id: "ms", name: "微服务", subtitle: "即将启航",
      icon: "gears",
      x: 78, y: 10, w: 18, h: 24,
      xP: 58, yP: 2, wP: 38, hP: 14,
      tone: "#1e293b", glow: "#94a3b8", locked: true,
      chapters: []
    },
    {
      id: "ai", name: "AI", subtitle: "迷雾之外",
      icon: "brain",
      x: 76, y: 58, w: 18, h: 24,
      xP: 58, yP: 82, wP: 36, hP: 14,
      tone: "#2e1065", glow: "#c084fc", locked: true,
      chapters: []
    }
  ],
  route: [
    {x:18,y:72},{x:34,y:56},{x:22,y:42},{x:56,y:52},{x:70,y:40},{x:60,y:28}
  ],
  routePortrait: [
    {x:26,y:78},{x:58,y:66},{x:38,y:54},{x:26,y:34},{x:54,y:28},{x:40,y:20}
  ]
};

(function () {
  "use strict";
  function pathThrough(pts) {
    if (!pts || pts.length < 2) return "";
    function fmt(n) { return (Math.round(n * 100) / 100); }
    var d = "M " + fmt(pts[0].x) + " " + fmt(pts[0].y);
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i];
      var p1 = pts[i];
      var p2 = pts[i + 1];
      var p3 = pts[i + 2] || p2;
      var cp1x = p1.x + (p2.x - p0.x) / 6;
      var cp1y = p1.y + (p2.y - p0.y) / 6;
      var cp2x = p2.x - (p3.x - p1.x) / 6;
      var cp2y = p2.y - (p3.y - p1.y) / 6;
      d += " C " + fmt(cp1x) + " " + fmt(cp1y) + ", " + fmt(cp2x) + " " + fmt(cp2y) + ", " + fmt(p2.x) + " " + fmt(p2.y);
    }
    return d;
  }

  function propSvg(k) {
    var ink = "#2b2118";
    switch (k) {
      case "tree":
        return '<svg width="44" height="56" viewBox="0 0 44 56"><ellipse class="spr-shadow" cx="22" cy="52" rx="12" ry="3" fill="#000" opacity=".18"/><rect x="18" y="36" width="8" height="16" fill="#6b4423" stroke="'+ink+'" stroke-width="2"/><ellipse cx="22" cy="24" rx="18" ry="20" fill="#4caf50" stroke="'+ink+'" stroke-width="2"/><ellipse cx="22" cy="16" rx="12" ry="12" fill="#66bb6a" stroke="'+ink+'" stroke-width="1.5"/><circle class="led led-a" cx="14" cy="20" r="2.2" fill="#67e8f9"/><circle class="led led-b" cx="28" cy="14" r="2.2" fill="#a78bfa"/><circle class="led led-a" cx="24" cy="26" r="2" fill="#f472b6"/></svg>';
      case "house":
        return '<svg width="56" height="52" viewBox="0 0 56 52"><ellipse class="spr-shadow" cx="28" cy="50" rx="18" ry="3" fill="#000" opacity=".16"/><polygon points="28,6 52,22 4,22" fill="#fb923c" stroke="'+ink+'" stroke-width="2"/><rect x="10" y="22" width="36" height="22" fill="#f0f9ff" stroke="'+ink+'" stroke-width="2"/><rect x="22" y="30" width="12" height="14" fill="#64748b" stroke="'+ink+'" stroke-width="1.5"/><rect class="win-glow" x="14" y="28" width="7" height="7" rx="1" fill="#67e8f9" stroke="'+ink+'" stroke-width="1"/><rect x="16" y="12" width="10" height="5" rx="1" fill="#22d3ee" stroke="'+ink+'" stroke-width="1"/><line x1="42" y1="8" x2="42" y2="20" stroke="'+ink+'" stroke-width="2"/><circle class="led led-a" cx="42" cy="6" r="3" fill="#a78bfa" stroke="'+ink+'" stroke-width="1"/></svg>';
      case "flower":
        return '<svg width="20" height="24" viewBox="0 0 20 24"><line x1="10" y1="12" x2="10" y2="24" stroke="#2e7d32" stroke-width="2"/><circle cx="10" cy="8" r="5" fill="#ff8a65" stroke="'+ink+'" stroke-width="1.5"/><circle cx="10" cy="8" r="2" fill="#ffd54a"/></svg>';
      case "rock":
        return '<svg width="36" height="22" viewBox="0 0 36 22"><ellipse class="spr-shadow" cx="18" cy="20" rx="14" ry="2.5" fill="#000" opacity=".15"/><ellipse cx="18" cy="12" rx="16" ry="8" fill="#9e9e9e" stroke="'+ink+'" stroke-width="2"/></svg>';
      case "well":
        return '<svg width="36" height="32" viewBox="0 0 36 32"><ellipse class="spr-shadow" cx="18" cy="30" rx="14" ry="2.5" fill="#000" opacity=".15"/><ellipse cx="18" cy="22" rx="14" ry="6" fill="#90a4ae" stroke="'+ink+'" stroke-width="2"/><rect x="6" y="10" width="24" height="12" fill="#b0bec5" stroke="'+ink+'" stroke-width="2"/><rect x="16" y="2" width="4" height="10" fill="#6b4423"/></svg>';
      case "cloud":
        return '<svg width="80" height="36" viewBox="0 0 80 36"><ellipse cx="30" cy="22" rx="22" ry="12" fill="#fff" opacity=".9"/><ellipse cx="50" cy="18" rx="20" ry="14" fill="#fff" opacity=".9"/><ellipse cx="40" cy="24" rx="16" ry="10" fill="#fff"/></svg>';
      case "bush":
        return '<svg width="56" height="32" viewBox="0 0 56 32"><ellipse class="spr-shadow" cx="28" cy="30" rx="20" ry="3" fill="#000" opacity=".18"/><ellipse cx="18" cy="18" rx="14" ry="12" fill="#43a047" stroke="'+ink+'" stroke-width="2"/><ellipse cx="36" cy="16" rx="16" ry="13" fill="#66bb6a" stroke="'+ink+'" stroke-width="2"/></svg>';
      case "tuft":
        return '<svg width="28" height="18" viewBox="0 0 28 18"><path d="M4 16 Q8 4 10 16 M12 16 Q16 2 18 16 M18 16 Q22 6 24 16" fill="none" stroke="#2e7d32" stroke-width="2.2" stroke-linecap="round"/></svg>';
      case "gear":
        return '<svg width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="10" fill="#26a69a" stroke="'+ink+'" stroke-width="2"/><circle cx="20" cy="20" r="4" fill="#004d40"/><g stroke="'+ink+'" stroke-width="3" stroke-linecap="round"><line x1="20" y1="4" x2="20" y2="10"/><line x1="20" y1="30" x2="20" y2="36"/><line x1="4" y1="20" x2="10" y2="20"/><line x1="30" y1="20" x2="36" y2="20"/></g></svg>';
      case "chip":
        return '<svg width="40" height="28" viewBox="0 0 40 28"><rect x="8" y="6" width="24" height="16" rx="2" fill="#66bb6a" stroke="'+ink+'" stroke-width="2"/><g stroke="'+ink+'" stroke-width="1.5"><line x1="4" y1="10" x2="8" y2="10"/><line x1="4" y1="18" x2="8" y2="18"/><line x1="32" y1="10" x2="36" y2="10"/><line x1="32" y1="18" x2="36" y2="18"/></g></svg>';
      case "server":
        return '<svg width="48" height="52" viewBox="0 0 48 52"><ellipse class="spr-shadow" cx="24" cy="50" rx="16" ry="2.5" fill="#000" opacity=".16"/><rect x="8" y="10" width="32" height="38" rx="3" fill="#37474f" stroke="'+ink+'" stroke-width="2"/><rect x="12" y="16" width="24" height="8" rx="1" fill="#263238"/><rect x="12" y="28" width="24" height="8" rx="1" fill="#263238"/><circle class="led led-a" cx="16" cy="20" r="2" fill="#69f0ae"/><circle class="led led-b" cx="22" cy="20" r="2" fill="#40c4ff"/><circle class="led led-a" cx="16" cy="32" r="2" fill="#69f0ae"/><circle class="led led-b" cx="22" cy="32" r="2" fill="#ffab40"/><rect x="18" y="4" width="12" height="8" fill="#546e7a" stroke="'+ink+'" stroke-width="1.5"/></svg>';
      case "cable":
        return '<svg width="54" height="22" viewBox="0 0 54 22"><path d="M2 12 Q14 2 28 12 T52 10" fill="none" stroke="#26a69a" stroke-width="3"/><path d="M2 16 Q16 8 30 16 T52 14" fill="none" stroke="#00897b" stroke-width="2" opacity=".7"/></svg>';
      case "antenna":
        return '<svg width="24" height="48" viewBox="0 0 24 48"><line x1="12" y1="4" x2="12" y2="44" stroke="'+ink+'" stroke-width="3"/><circle class="led led-a" cx="12" cy="6" r="4" fill="#e85d04" stroke="'+ink+'" stroke-width="1.5"/></svg>';
      case "anvil":
        return '<svg width="44" height="28" viewBox="0 0 44 28"><rect x="4" y="10" width="36" height="10" fill="#607d8b" stroke="'+ink+'" stroke-width="2"/><rect x="14" y="20" width="16" height="6" fill="#455a64" stroke="'+ink+'" stroke-width="1.5"/></svg>';
      case "forge":
        return '<svg width="50" height="44" viewBox="0 0 50 44"><rect x="8" y="16" width="34" height="24" fill="#5d4037" stroke="'+ink+'" stroke-width="2"/><path d="M14 16 Q25 2 36 16" fill="#e85d04" stroke="'+ink+'" stroke-width="2"/><rect class="win-glow" x="20" y="26" width="10" height="14" fill="#ffcc80"/></svg>';
      case "cabin":
        return '<svg width="50" height="42" viewBox="0 0 50 42"><polygon points="25,4 46,20 4,20" fill="#8d6e63" stroke="'+ink+'" stroke-width="2"/><rect x="10" y="20" width="30" height="18" fill="#a1887f" stroke="'+ink+'" stroke-width="2"/><rect class="win-glow" x="16" y="26" width="8" height="8" fill="#ffe08a"/></svg>';
      case "castle":
        return '<svg width="72" height="64" viewBox="0 0 72 64"><ellipse class="spr-shadow" cx="36" cy="62" rx="24" ry="3" fill="#000" opacity=".16"/><rect x="12" y="24" width="48" height="36" fill="#eceff1" stroke="'+ink+'" stroke-width="2"/><rect x="8" y="12" width="12" height="48" fill="#cfd8dc" stroke="'+ink+'" stroke-width="2"/><rect x="52" y="12" width="12" height="48" fill="#cfd8dc" stroke="'+ink+'" stroke-width="2"/><polygon points="14,12 8,4 20,4" fill="#e85d04"/><polygon points="58,12 52,4 64,4" fill="#e85d04"/><rect x="30" y="40" width="12" height="20" fill="#5d4037"/><rect class="win-glow" x="18" y="32" width="8" height="8" fill="#ffe08a"/><rect class="win-glow" x="46" y="32" width="8" height="8" fill="#ffe08a"/></svg>';
      case "banner":
        return '<svg width="28" height="40" viewBox="0 0 28 40"><line x1="6" y1="2" x2="6" y2="38" stroke="'+ink+'" stroke-width="2"/><path d="M6 4 H24 L20 14 L24 24 H6Z" fill="#e85d04" stroke="'+ink+'" stroke-width="1.5"/></svg>';
      case "boat":
        return '<svg width="48" height="24" viewBox="0 0 48 24"><path d="M4 12 L44 12 L36 22 H12Z" fill="#6d4c41" stroke="'+ink+'" stroke-width="2"/><line x1="24" y1="2" x2="24" y2="12" stroke="'+ink+'" stroke-width="2"/><path d="M24 2 L36 12 H24Z" fill="#e85d04"/></svg>';
      case "crane":
        return '<svg width="40" height="56" viewBox="0 0 40 56"><rect x="16" y="8" width="6" height="44" fill="#90a4ae" stroke="'+ink+'" stroke-width="2"/><line x1="19" y1="12" x2="36" y2="12" stroke="'+ink+'" stroke-width="3"/><rect x="32" y="12" width="4" height="14" fill="#e85d04"/></svg>';
      case "warehouse":
        return '<svg width="56" height="40" viewBox="0 0 56 40"><rect x="4" y="14" width="48" height="24" fill="#78909c" stroke="'+ink+'" stroke-width="2"/><polygon points="28,4 52,14 4,14" fill="#546e7a" stroke="'+ink+'" stroke-width="2"/><rect class="win-glow" x="12" y="22" width="10" height="8" fill="#ffe08a"/></svg>';
      case "chimney":
        return '<svg width="28" height="48" viewBox="0 0 28 48"><rect x="8" y="12" width="12" height="32" fill="#8d6e63" stroke="'+ink+'" stroke-width="2"/><ellipse cx="14" cy="10" rx="8" ry="4" fill="#b0bec5" opacity=".7"/></svg>';
      case "crate":
        return '<svg width="28" height="24" viewBox="0 0 28 24"><rect x="2" y="4" width="24" height="18" fill="#c4a574" stroke="'+ink+'" stroke-width="2"/><line x1="2" y1="4" x2="26" y2="22" stroke="'+ink+'" stroke-width="1.5"/><line x1="26" y1="4" x2="2" y2="22" stroke="'+ink+'" stroke-width="1.5"/></svg>';
      case "stall":
        return '<svg width="48" height="40" viewBox="0 0 48 40"><rect x="6" y="18" width="36" height="18" fill="#ffcc80" stroke="'+ink+'" stroke-width="2"/><polygon points="24,4 44,18 4,18" fill="#e85d04" stroke="'+ink+'" stroke-width="2"/><rect class="win-glow" x="18" y="24" width="12" height="8" fill="#fff3e0"/></svg>';
      case "tower":
        return '<svg width="36" height="64" viewBox="0 0 36 64"><rect x="8" y="16" width="20" height="44" fill="#90a4ae" stroke="'+ink+'" stroke-width="2"/><polygon points="18,4 30,16 6,16" fill="#e85d04" stroke="'+ink+'" stroke-width="2"/><rect class="win-glow" x="14" y="28" width="8" height="8" fill="#ffe08a"/></svg>';
      case "lamp":
        return '<svg width="20" height="40" viewBox="0 0 20 40"><line x1="10" y1="14" x2="10" y2="40" stroke="'+ink+'" stroke-width="2"/><circle class="win-glow" cx="10" cy="10" r="6" fill="#ffd54a" stroke="'+ink+'" stroke-width="1.5"/></svg>';
      case "cart":
        return '<svg width="44" height="28" viewBox="0 0 44 28"><rect x="4" y="8" width="30" height="12" fill="#a1887f" stroke="'+ink+'" stroke-width="2"/><circle cx="12" cy="22" r="5" fill="#5d4037"/><circle cx="28" cy="22" r="5" fill="#5d4037"/></svg>';
      case "skyline-meadow":
        return '<svg width="100%" height="80" viewBox="0 0 400 80" preserveAspectRatio="none"><path d="M0 80 L0 50 Q40 30 80 48 T160 40 T240 52 T320 36 T400 50 L400 80Z" fill="currentColor" opacity=".22"/></svg>';
      case "skyline-circuit":
        return '<svg class="skyline-neon" width="100%" height="100" viewBox="0 0 400 100" preserveAspectRatio="none" aria-hidden="true">'
          + '<defs><linearGradient id="neonBuild" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#134e4a"/><stop offset="100%" stop-color="#0f766e"/></linearGradient>'
          + '<linearGradient id="neonGlow" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#5eead4" stop-opacity=".9"/><stop offset="100%" stop-color="#2dd4bf" stop-opacity=".2"/></linearGradient></defs>'
          + '<g fill="url(#neonBuild)" stroke="#042f2e" stroke-width="1.2">'
          + '<path d="M0 100 V58 H18 V42 H28 V58 H40 V100Z"/>'
          + '<path d="M48 100 V48 H58 V28 H72 V48 H84 V36 H96 V100Z"/>'
          + '<path d="M104 100 V55 H130 V40 H150 V55 H168 V100Z"/>'
          + '<path d="M176 100 V38 H188 V18 H204 V38 H218 V50 H236 V100Z"/>'
          + '<path d="M244 100 V52 H260 V30 H278 V52 H294 V42 H310 V100Z"/>'
          + '<path d="M318 100 V46 H340 V34 H356 V46 H372 V56 H400 V100Z"/>'
          + '</g>'
          + '<g fill="#5eead4" opacity=".85">'
          + '<rect x="22" y="48" width="3" height="3"/><rect x="22" y="56" width="3" height="3"/>'
          + '<rect x="62" y="34" width="3" height="3"/><rect x="68" y="40" width="3" height="3"/><rect x="62" y="46" width="3" height="3"/>'
          + '<rect x="118" y="48" width="3" height="3"/><rect x="136" y="48" width="3" height="3"/><rect x="154" y="48" width="3" height="3"/>'
          + '<rect x="192" y="24" width="3" height="3"/><rect x="198" y="30" width="3" height="3"/><rect x="192" y="42" width="3" height="3"/>'
          + '<rect x="266" y="36" width="3" height="3"/><rect x="272" y="44" width="3" height="3"/><rect x="298" y="48" width="3" height="3"/>'
          + '<rect x="330" y="52" width="3" height="3"/><rect x="348" y="40" width="3" height="3"/><rect x="364" y="52" width="3" height="3"/>'
          + '</g>'
          + '<path d="M0 100 H400" stroke="url(#neonGlow)" stroke-width="3" fill="none" opacity=".7"/>'
          + '</svg>';
      case "skyline-forge":
        return '<svg width="100%" height="80" viewBox="0 0 400 80" preserveAspectRatio="none"><path d="M0 80 L0 55 Q50 20 100 50 T200 30 T300 48 T400 35 L400 80Z" fill="currentColor" opacity=".25"/></svg>';
      case "skyline-castle":
        return '<svg width="100%" height="90" viewBox="0 0 400 90" preserveAspectRatio="none" aria-hidden="true"><g fill="currentColor" opacity=".28">'
          + '<path d="M40 90 V55 H55 V40 H70 V55 H85 V90Z"/>'
          + '<path d="M120 90 V48 H140 V22 H160 V48 H180 V90Z"/>'
          + '<path d="M200 90 V40 H220 V18 H235 V8 H245 V18 H260 V40 H280 V90Z"/>'
          + '<path d="M300 90 V52 H320 V30 H340 V52 H360 V90Z"/>'
          + '</g>'
          + '<g fill="#e85d04" opacity=".7"><rect x="228" y="10" width="3" height="10"/><rect x="248" y="10" width="3" height="10"/><rect x="148" y="14" width="3" height="10"/></g>'
          + '</svg>';
      case "skyline-harbor":
        return '<svg width="100%" height="70" viewBox="0 0 400 70" preserveAspectRatio="none"><g fill="currentColor" opacity=".26"><rect x="30" y="30" width="60" height="40"/><rect x="110" y="20" width="40" height="50"/><rect x="170" y="35" width="80" height="35"/><rect x="280" y="25" width="50" height="45"/></g></svg>';
      case "skyline-market":
        return '<svg width="100%" height="80" viewBox="0 0 400 80" preserveAspectRatio="none"><g fill="currentColor" opacity=".24"><rect x="40" y="35" width="50" height="45"/><rect x="110" y="20" width="30" height="60"/><rect x="160" y="40" width="70" height="40"/><rect x="250" y="25" width="40" height="55"/><rect x="310" y="38" width="55" height="42"/></g></svg>';
      case "drone":
        return '<svg width="40" height="28" viewBox="0 0 40 28"><ellipse cx="20" cy="16" rx="10" ry="6" fill="#e0f2fe" stroke="'+ink+'" stroke-width="1.8"/><circle class="led led-a" cx="20" cy="16" r="2.5" fill="#22d3ee"/><line x1="4" y1="10" x2="12" y2="14" stroke="#a78bfa" stroke-width="2" stroke-linecap="round"/><line x1="36" y1="10" x2="28" y2="14" stroke="#a78bfa" stroke-width="2" stroke-linecap="round"/><circle cx="4" cy="10" r="3" fill="#67e8f9" opacity=".85"/><circle cx="36" cy="10" r="3" fill="#67e8f9" opacity=".85"/></svg>';
      case "dish":
        return '<svg width="40" height="36" viewBox="0 0 40 36"><ellipse class="spr-shadow" cx="20" cy="34" rx="10" ry="2" fill="#000" opacity=".15"/><path d="M8 22 Q20 6 32 22" fill="#e0f2fe" stroke="'+ink+'" stroke-width="2"/><line x1="20" y1="14" x2="20" y2="30" stroke="'+ink+'" stroke-width="2"/><circle class="led led-a" cx="20" cy="12" r="3" fill="#22d3ee" stroke="'+ink+'" stroke-width="1"/></svg>';
      case "solar":
        return '<svg width="36" height="28" viewBox="0 0 36 28"><rect x="4" y="8" width="28" height="14" rx="2" fill="#0ea5e9" stroke="'+ink+'" stroke-width="1.8"/><line x1="4" y1="15" x2="32" y2="15" stroke="#fff" stroke-width="1" opacity=".5"/><line x1="18" y1="8" x2="18" y2="22" stroke="#fff" stroke-width="1" opacity=".5"/><rect x="14" y="22" width="8" height="4" fill="#64748b" stroke="'+ink+'" stroke-width="1"/></svg>';
      case "bonsai":
        return '<svg width="36" height="40" viewBox="0 0 36 40"><ellipse class="spr-shadow" cx="18" cy="38" rx="10" ry="2" fill="#000" opacity=".15"/><rect x="10" y="28" width="16" height="8" rx="2" fill="#64748b" stroke="'+ink+'" stroke-width="1.5"/><circle class="led led-a" cx="14" cy="32" r="1.5" fill="#22d3ee"/><rect x="16" y="18" width="4" height="10" fill="#94a3b8"/><ellipse cx="18" cy="14" rx="12" ry="10" fill="#4ade80" stroke="'+ink+'" stroke-width="1.5"/><circle class="led led-b" cx="12" cy="12" r="2" fill="#a78bfa"/><circle class="led led-a" cx="22" cy="10" r="2" fill="#67e8f9"/></svg>';
      case "robotpet":
        return '<svg width="36" height="28" viewBox="0 0 36 28"><ellipse class="spr-shadow" cx="18" cy="26" rx="10" ry="2" fill="#000" opacity=".15"/><ellipse cx="18" cy="16" rx="12" ry="9" fill="#e0f2fe" stroke="'+ink+'" stroke-width="1.8"/><circle cx="14" cy="14" r="2.2" fill="#22d3ee"/><circle cx="22" cy="14" r="2.2" fill="#22d3ee"/><rect x="15" y="18" width="6" height="2" rx="1" fill="#a78bfa"/><circle class="led led-a" cx="28" cy="10" r="2" fill="#f472b6"/><line x1="6" y1="12" x2="2" y2="8" stroke="'+ink+'" stroke-width="1.5"/></svg>';
      case "water":
      case "firefly":
        return "";
      default:
        return "";
    }
  }

  function landIcon(kind) {
    if (kind === "village") return "🏠";
    if (kind === "coffee") return "☕";
    if (kind === "gears") return "⚙️";
    if (kind === "brain") return "🧠";
    return "📍";
  }
  function planetSvg(locked) {
    /* cute rounded floating platform / planet — neon rim via CSS vars */
    if (locked) {
      return '<svg class="wmap-planet" viewBox="0 0 100 100" aria-hidden="true">'
        + '<ellipse class="wmap-planet__halo" cx="50" cy="72" rx="40" ry="10"/>'
        + '<ellipse class="wmap-planet__wire" cx="50" cy="48" rx="34" ry="28"/>'
        + '<ellipse class="wmap-planet__ring" cx="50" cy="52" rx="42" ry="12"/>'
        + '<line class="wmap-planet__wire" x1="16" y1="48" x2="84" y2="48"/>'
        + '<line class="wmap-planet__wire" x1="50" y1="20" x2="50" y2="76"/>'
        + '<path class="wmap-planet__wire" d="M22 36 Q50 28 78 36" fill="none"/>'
        + '<path class="wmap-planet__wire" d="M22 60 Q50 68 78 60" fill="none"/>'
        + "</svg>";
    }
    return '<svg class="wmap-planet" viewBox="0 0 100 100" aria-hidden="true">'
      + '<ellipse class="wmap-planet__halo" cx="50" cy="78" rx="42" ry="12"/>'
      + '<ellipse class="wmap-planet__ring" cx="50" cy="58" rx="44" ry="14"/>'
      + '<ellipse class="wmap-planet__body" cx="50" cy="48" rx="34" ry="28"/>'
      + '<ellipse class="wmap-planet__shine" cx="38" cy="36" rx="14" ry="9"/>'
      + "</svg>";
  }
  window.TN_SCENE_KIT = { pathThrough: pathThrough, propSvg: propSvg, landIcon: landIcon, planetSvg: planetSvg };
})();
