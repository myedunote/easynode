const createHtmlDocument = (body, styles = '') => `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
  <meta name="color-scheme" content="dark">
  <style>
    * { box-sizing: border-box; }
    html, body { width: 100%; height: 100%; margin: 0; overflow: hidden; }
    body { background: #070a12; }
    ${ styles }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: 1ms !important; animation-iteration-count: 1 !important; }
    }
  </style>
</head>
<body>${ body }</body>
</html>`

export const TERMINAL_HTML_THEMES = [
  {
    id: 'builtin-html:orbital-grid',
    name: '轨道矩阵',
    description: '悬浮轨道与微光网格，层次清晰。',
    accent: ['#38bdf8', '#a78bfa', '#020617',],
    html: createHtmlDocument(
      '<div class="grid"></div><div class="orbit one"><i></i></div><div class="orbit two"><i></i></div><div class="core"></div>',
      `
        body { background: radial-gradient(circle at 76% 48%, #172554 0%, #070b16 32%, #03050a 76%); perspective: 700px; }
        .grid { position: absolute; left: -20%; right: -20%; bottom: -42%; height: 88%; transform: rotateX(66deg); transform-origin: center top; background-image: linear-gradient(rgba(56,189,248,.13) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,.13) 1px, transparent 1px); background-size: 48px 48px; mask-image: linear-gradient(to bottom, #000, transparent 82%); animation: grid-move 18s linear infinite; }
        .orbit { position: absolute; left: 76%; top: 48%; border: 1px solid rgba(125,211,252,.2); border-radius: 50%; transform: translate(-50%, -50%) rotate(-18deg); }
        .orbit.one { width: min(52vw, 620px); aspect-ratio: 1; animation: spin 34s linear infinite; }
        .orbit.two { width: min(34vw, 410px); aspect-ratio: 1; border-color: rgba(196,181,253,.22); animation: spin-reverse 24s linear infinite; }
        .orbit i { position: absolute; left: 50%; top: -4px; width: 8px; height: 8px; border-radius: 50%; background: #7dd3fc; box-shadow: 0 0 16px 5px rgba(56,189,248,.7); }
        .orbit.two i { background: #c4b5fd; box-shadow: 0 0 14px 4px rgba(167,139,250,.7); }
        .core { position: absolute; left: 76%; top: 48%; width: 70px; height: 70px; transform: translate(-50%, -50%); border-radius: 50%; background: radial-gradient(circle, rgba(224,242,254,.82), rgba(56,189,248,.26) 24%, rgba(99,102,241,.1) 52%, transparent 72%); animation: pulse 5s ease-in-out infinite; }
        @keyframes grid-move { to { background-position: 0 96px, 96px 0; } }
        @keyframes spin { to { transform: translate(-50%, -50%) rotate(342deg); } }
        @keyframes spin-reverse { to { transform: translate(-50%, -50%) rotate(-378deg); } }
        @keyframes pulse { 50% { transform: translate(-50%, -50%) scale(1.2); opacity: .68; } }
      `
    )
  },
  {
    id: 'builtin-html:signal-field',
    name: '信号场',
    description: '精细扫描线与电路脉冲，科技感更强。',
    accent: ['#22c55e', '#06b6d4', '#04110e',],
    html: createHtmlDocument(
      '<div class="circuit"></div><div class="scan"></div><div class="beacon a"></div><div class="beacon b"></div>',
      `
        body { background: radial-gradient(circle at 18% 18%, #082f2b 0%, #061512 32%, #020807 78%); }
        .circuit { position: absolute; inset: 0; opacity: .28; background-image: linear-gradient(rgba(34,197,94,.13) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,.13) 1px, transparent 1px), repeating-linear-gradient(45deg, transparent 0 78px, rgba(6,182,212,.09) 79px 80px, transparent 81px 158px); background-size: 42px 42px, 42px 42px, auto; mask-image: radial-gradient(circle at 64% 48%, #000 0%, transparent 76%); animation: circuit-drift 28s linear infinite; }
        .scan { position: absolute; left: 0; right: 0; height: 18%; top: -20%; background: linear-gradient(to bottom, transparent, rgba(34,197,94,.035) 40%, rgba(103,232,249,.2) 50%, rgba(34,197,94,.035) 60%, transparent); animation: scan 9s linear infinite; }
        .beacon { position: absolute; width: 9px; height: 9px; border: 1px solid #5eead4; border-radius: 50%; box-shadow: 0 0 18px rgba(45,212,191,.7); }
        .beacon::after { content: ''; position: absolute; inset: -1px; border: 1px solid rgba(45,212,191,.65); border-radius: inherit; animation: ping 3.6s ease-out infinite; }
        .beacon.a { left: 22%; top: 32%; }
        .beacon.b { right: 18%; bottom: 24%; animation-delay: -1.8s; }
        @keyframes scan { to { transform: translateY(700%); } }
        @keyframes ping { to { transform: scale(8); opacity: 0; } }
        @keyframes circuit-drift { to { background-position: 42px 42px, 42px 42px, 158px 0; } }
      `
    )
  },
  {
    id: 'builtin-html:neon-rain',
    name: '夜雨霓光',
    description: '低对比雨幕从文字后方掠过，深色且克制。',
    accent: ['#38bdf8', '#f472b6', '#050816',],
    html: createHtmlDocument(
      '<div class="city"></div><div class="rain far"></div><div class="rain near"></div><div class="wash"></div>',
      `
        body { background: linear-gradient(135deg, #03050b, #08111f 54%, #0d1020); }
        .city { position: absolute; right: 0; bottom: 0; width: 46%; height: 58%; opacity: .22; background: repeating-linear-gradient(90deg, transparent 0 24px, rgba(56,189,248,.18) 25px 26px), repeating-linear-gradient(0deg, #050816 0 31px, rgba(244,114,182,.14) 32px 33px); clip-path: polygon(0 26%, 12% 26%, 12% 8%, 28% 8%, 28% 34%, 45% 34%, 45% 0, 63% 0, 63% 19%, 82% 19%, 82% 42%, 100% 42%, 100% 100%, 0 100%); }
        .rain { position: absolute; inset: -35%; transform: rotate(12deg); background-image: repeating-linear-gradient(90deg, transparent 0 29px, rgba(125,211,252,.16) 30px, transparent 31px 61px); }
        .rain.far { animation: rain 7s linear infinite; opacity: .42; }
        .rain.near { background-size: 83px 100%; opacity: .24; animation: rain 4.6s linear infinite reverse; }
        .wash { position: absolute; inset: 0; background: radial-gradient(circle at 88% 78%, rgba(236,72,153,.15), transparent 24%), radial-gradient(circle at 72% 34%, rgba(14,165,233,.13), transparent 30%); animation: wash 12s ease-in-out infinite alternate; }
        @keyframes rain { to { transform: rotate(12deg) translateX(122px); } }
        @keyframes wash { to { opacity: .58; filter: hue-rotate(18deg); } }
      `
    )
  },
  {
    id: 'builtin-html:deep-current',
    name: '深海涌流',
    description: '暗蓝流线集中在底部，保留主要文字区域。',
    accent: ['#22d3ee', '#2563eb', '#020617',],
    html: createHtmlDocument(
      '<div class="depth"></div><div class="wave a"></div><div class="wave b"></div><div class="wave c"></div>',
      `
        body { background: linear-gradient(165deg, #020617 0%, #071426 52%, #062b3a 100%); }
        .depth { position: absolute; inset: 0; opacity: .24; background: repeating-radial-gradient(ellipse at 76% 112%, transparent 0 34px, rgba(34,211,238,.15) 35px 36px, transparent 37px 68px); animation: depth 18s ease-in-out infinite alternate; }
        .wave { position: absolute; left: -18%; bottom: -28%; width: 136%; height: 52%; border: 1px solid rgba(103,232,249,.22); border-radius: 46% 54% 0 0 / 28% 34% 0 0; transform-origin: center bottom; }
        .wave.a { background: rgba(14,116,144,.12); animation: swell 15s ease-in-out infinite alternate; }
        .wave.b { bottom: -35%; border-color: rgba(96,165,250,.2); transform: rotate(-3deg); animation: swell-b 19s ease-in-out infinite alternate; }
        .wave.c { bottom: -42%; border-color: rgba(129,140,248,.16); transform: rotate(4deg); animation: swell-c 23s ease-in-out infinite alternate; }
        @keyframes depth { to { transform: translate(-3%, -2%) scale(1.04); } }
        @keyframes swell { to { transform: translateY(-9%) rotate(2deg) scaleX(1.04); } }
        @keyframes swell-b { to { transform: translate(5%, -12%) rotate(-1deg); } }
        @keyframes swell-c { to { transform: translate(-4%, -8%) rotate(1deg); } }
      `
    )
  },
  {
    id: 'builtin-html:ember-trace',
    name: '熔金余晖',
    description: '暖色脉冲沿边缘游走，中部保持低干扰。',
    accent: ['#f59e0b', '#fb7185', '#120806',],
    html: createHtmlDocument(
      '<div class="embers"></div><div class="arc one"></div><div class="arc two"></div>',
      `
        body { background: radial-gradient(circle at 100% 100%, #3b160b 0%, #160b0a 34%, #070506 76%); }
        .embers { position: absolute; inset: 0; opacity: .24; background-image: radial-gradient(circle, #fbbf24 0 1px, transparent 1.8px), radial-gradient(circle, #fb7185 0 1px, transparent 1.7px); background-size: 91px 83px, 137px 129px; animation: embers 26s linear infinite; mask-image: linear-gradient(105deg, transparent 0 38%, #000 78%, transparent 100%); }
        .arc { position: absolute; right: -18%; bottom: -44%; width: 62%; aspect-ratio: 1; border: 1px solid rgba(251,191,36,.24); border-radius: 50%; box-shadow: 0 0 34px rgba(245,158,11,.08); }
        .arc.one { animation: arc 14s ease-in-out infinite alternate; }
        .arc.two { right: -8%; bottom: -58%; width: 78%; border-color: rgba(251,113,133,.16); animation: arc 20s ease-in-out infinite alternate-reverse; }
        @keyframes embers { to { background-position: 91px -83px, -137px -129px; } }
        @keyframes arc { to { transform: scale(1.08) translate(-3%, -4%); opacity: .55; } }
      `
    )
  },
  {
    id: 'builtin-html:frosted-morning',
    name: '晨雾玻璃',
    description: '低饱和明亮冷灰，适合深色前景终端主题。',
    accent: ['#dbeafe', '#93c5fd', '#64748b',],
    html: createHtmlDocument(
      '<div class="pane a"></div><div class="pane b"></div><div class="mist"></div>',
      `
        body { background: linear-gradient(145deg, #dbe4ea 0%, #b8c9d6 48%, #879eaf 100%); }
        .pane { position: absolute; border: 1px solid rgba(255,255,255,.38); background: rgba(255,255,255,.1); box-shadow: 0 20px 60px rgba(51,65,85,.12); backdrop-filter: blur(14px); }
        .pane.a { width: 48%; height: 72%; right: -10%; top: -18%; transform: rotate(14deg); animation: pane-a 18s ease-in-out infinite alternate; }
        .pane.b { width: 38%; height: 62%; left: -12%; bottom: -24%; transform: rotate(-11deg); animation: pane-b 22s ease-in-out infinite alternate; }
        .mist { position: absolute; inset: -20%; background: radial-gradient(circle at 72% 26%, rgba(255,255,255,.55), transparent 24%), radial-gradient(circle at 20% 78%, rgba(186,230,253,.45), transparent 28%); filter: blur(30px); animation: mist 16s ease-in-out infinite alternate; }
        @keyframes pane-a { to { transform: translate(-5%, 7%) rotate(10deg); } }
        @keyframes pane-b { to { transform: translate(8%, -6%) rotate(-7deg); } }
        @keyframes mist { to { transform: translate(4%, -3%) scale(1.05); opacity: .72; } }
      `
    )
  },
  {
    id: 'builtin-html:porcelain-ripple',
    name: '青瓷微澜',
    description: '柔和青灰水纹在底部舒展，清爽而安静。',
    accent: ['#d9efea', '#8fb9af', '#527871',],
    html: createHtmlDocument(
      '<div class="wash"></div><div class="ripple one"></div><div class="ripple two"></div><div class="ripple three"></div>',
      `
        body { background: linear-gradient(148deg, #dcebe7 0%, #b8d1ca 52%, #86aaa2 100%); }
        .wash { position: absolute; inset: -18%; background: radial-gradient(circle at 18% 12%, rgba(255,255,255,.42), transparent 26%), radial-gradient(circle at 84% 92%, rgba(45,111,102,.14), transparent 34%); filter: blur(24px); animation: wash 24s ease-in-out infinite alternate; }
        .ripple { position: absolute; right: -12%; bottom: -46%; width: 68%; aspect-ratio: 1; border: 1px solid rgba(49,105,98,.2); border-radius: 50%; }
        .ripple.one { animation: ripple 26s ease-in-out infinite alternate; }
        .ripple.two { right: -20%; bottom: -58%; width: 86%; border-color: rgba(255,255,255,.26); animation: ripple 32s ease-in-out infinite alternate-reverse; }
        .ripple.three { right: 6%; bottom: -52%; width: 60%; border-color: rgba(49,105,98,.12); animation: ripple 38s ease-in-out infinite alternate; }
        @keyframes wash { to { transform: translate(3%, 2%) scale(1.04); opacity: .78; } }
        @keyframes ripple { to { transform: translate(-4%, -3%) scale(1.06); opacity: .58; } }
      `
    )
  },
  {
    id: 'builtin-html:lavender-dawn',
    name: '雾紫晨曦',
    description: '低饱和雾紫光带沿边缘缓慢呼吸。',
    accent: ['#eee9f3', '#c4b8cf', '#756c82',],
    html: createHtmlDocument(
      '<div class="veil left"></div><div class="veil right"></div><div class="halo"></div>',
      `
        body { background: linear-gradient(150deg, #e8e4ec 0%, #ccc3d5 52%, #9b93aa 100%); }
        .veil { position: absolute; width: 52%; height: 120%; top: -10%; border-radius: 50%; filter: blur(34px); opacity: .24; }
        .veil.left { left: -30%; background: rgba(255,255,255,.72); animation: veil-left 28s ease-in-out infinite alternate; }
        .veil.right { right: -34%; background: rgba(107,91,128,.42); animation: veil-right 34s ease-in-out infinite alternate; }
        .halo { position: absolute; right: 8%; bottom: -42%; width: 54%; aspect-ratio: 1; border: 1px solid rgba(255,255,255,.3); border-radius: 50%; box-shadow: 0 0 70px rgba(119,99,142,.1); animation: halo 30s ease-in-out infinite alternate; }
        @keyframes veil-left { to { transform: translate(10%, 3%) scale(1.04); opacity: .34; } }
        @keyframes veil-right { to { transform: translate(-9%, -3%) scale(.98); opacity: .17; } }
        @keyframes halo { to { transform: translate(-3%, -4%) scale(1.08); opacity: .58; } }
      `
    )
  },
  {
    id: 'builtin-html:paper-breeze',
    name: '纸上微风',
    description: '柔和纸白与稀疏等高线，动效几乎不可察觉。',
    accent: ['#eeeee9', '#c9cfcc', '#77827e',],
    html: createHtmlDocument(
      '<div class="contours"></div><div class="shade"></div><div class="gleam"></div>',
      `
        body { background: linear-gradient(145deg, #eeeee9 0%, #d7dbd8 54%, #b8c2be 100%); }
        .contours { position: absolute; inset: -12%; opacity: .16; background: repeating-radial-gradient(ellipse at 88% 92%, transparent 0 29px, rgba(71,85,80,.34) 30px, transparent 31px 61px); mask-image: linear-gradient(115deg, transparent 0 30%, #000 72%, transparent 100%); animation: contours 42s ease-in-out infinite alternate; }
        .shade { position: absolute; left: -18%; bottom: -38%; width: 62%; height: 72%; border-radius: 50%; background: rgba(91,111,103,.1); filter: blur(38px); animation: shade 32s ease-in-out infinite alternate; }
        .gleam { position: absolute; inset: -20%; background: linear-gradient(112deg, transparent 32%, rgba(255,255,255,.22) 48%, transparent 64%); animation: gleam 36s ease-in-out infinite alternate; }
        @keyframes contours { to { transform: translate(-2%, -2%) scale(1.025); } }
        @keyframes shade { to { transform: translate(7%, -4%) scale(1.05); opacity: .62; } }
        @keyframes gleam { to { transform: translateX(8%); opacity: .62; } }
      `
    )
  },
  {
    id: 'builtin-html:cloud-blueprint',
    name: '云端蓝图',
    description: '明亮蓝灰网格缓慢漂移，线条避开视觉中心。',
    accent: ['#e0f2fe', '#7dd3fc', '#475569',],
    html: createHtmlDocument(
      '<div class="grid"></div><div class="cloud one"></div><div class="cloud two"></div>',
      `
        body { background: linear-gradient(155deg, #d7e8ef 0%, #a9c6d3 50%, #7896a8 100%); }
        .grid { position: absolute; inset: 0; opacity: .2; background-image: linear-gradient(rgba(30,64,175,.22) 1px, transparent 1px), linear-gradient(90deg, rgba(30,64,175,.22) 1px, transparent 1px); background-size: 54px 54px; mask-image: linear-gradient(110deg, transparent 0 24%, #000 58%, transparent 100%); animation: grid 30s linear infinite; }
        .cloud { position: absolute; border-radius: 50%; background: rgba(255,255,255,.24); filter: blur(22px); }
        .cloud.one { width: 34%; height: 28%; right: -6%; top: 8%; animation: cloud 18s ease-in-out infinite alternate; }
        .cloud.two { width: 42%; height: 32%; left: -12%; bottom: 2%; opacity: .55; animation: cloud 24s ease-in-out infinite alternate-reverse; }
        @keyframes grid { to { background-position: 108px 54px, 54px 108px; } }
        @keyframes cloud { to { transform: translate(12%, 16%) scale(1.12); opacity: .42; } }
      `
    )
  },
]

export const DEFAULT_TERMINAL_HTML_THEME_ID = TERMINAL_HTML_THEMES[0].id

export const DEFAULT_CUSTOM_HTML_THEME_SOURCE = `<style>
  body { background: radial-gradient(circle at 30% 20%, #164e63, #07111d 48%, #020617); }
  .glow { position: absolute; inset: 18%; border-radius: 50%; background: #22d3ee; filter: blur(90px); opacity: .22; animation: float 12s ease-in-out infinite alternate; }
  @keyframes float { to { transform: translate(24%, 18%) scale(1.25); } }
</style>
<div class="glow"></div>`

export function validateCustomHtmlThemeSource(source) {
  const value = String(source || '')
  if (!value.trim()) return 'HTML 内容不能为空'
  if (value.length > 30000) return 'HTML 内容不能超过 30000 个字符'
  const forbiddenPatterns = [
    /<\s*\/?\s*(?:script|iframe|object|embed|link|base|meta|form)\b/i,
    /\bon[a-z]+\s*=/i,
    /\bjavascript\s*:/i,
    /@import\b/i,
    /url\s*\(/i,
    /\b(?:src|href|action)\s*=\s*["']?\s*(?:https?:|\/\/)/i,
  ]
  return forbiddenPatterns.some(pattern => pattern.test(value))
    ? '不能包含脚本、嵌套页面、表单或远程资源'
    : null
}

export function createSandboxedCustomHtmlTheme(source) {
  return createHtmlDocument(String(source || ''))
}

export function getTerminalHtmlThemes(customThemes = []) {
  const custom = customThemes.map(theme => ({
    ...theme,
    description: '自定义 HTML 主题',
    accent: ['#22d3ee', '#818cf8', '#0f172a',],
    html: createSandboxedCustomHtmlTheme(theme.html),
    source: theme.html,
    builtin: false
  }))
  return [
    ...custom,
    ...TERMINAL_HTML_THEMES.map(theme => ({ ...theme, builtin: true })),
  ]
}

export function getTerminalHtmlTheme(id, customThemes = []) {
  return getTerminalHtmlThemes(customThemes).find(theme => theme.id === id) || { ...TERMINAL_HTML_THEMES[0], builtin: true }
}
