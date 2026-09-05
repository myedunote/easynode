import { z } from 'zod'

const colorPattern = /^(?:#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})|rgba?\(\s*[\d.]+%?\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?(?:\s*,\s*[\d.]+%?)?\s*\)|transparent)$/i
const builtinThemeIdPattern = /^builtin:[A-Za-z0-9_.+-]+$/
const customThemeIdPattern = /^custom:[0-9a-f-]{36}$/i
const customHtmlThemeIdPattern = /^custom-html:[0-9a-f-]{36}$/i
export const HIGHLIGHT_PRESET_ID = 'builtin:standard'
export const HIGHLIGHT_PRESET_VERSION = 2
export const MAX_HIGHLIGHT_RULES = 50
export const MAX_HIGHLIGHT_PATTERN_LENGTH = 4096
export const BUILTIN_HIGHLIGHT_RULE_IDS = [
  'error', 'warning', 'success', 'info', 'network', 'link', 'datetime', 'measurement'
]
const legacyHighlightRuleIdMap = {
  rule1: 'error',
  rule2: 'warning',
  rule3: 'success',
  rule4: 'info',
  rule5: 'network',
  rule6: 'link',
  rule7: 'datetime',
  rule8: 'measurement'
}
export const TERMINAL_HTML_THEME_IDS = [
  'builtin-html:orbital-grid',
  'builtin-html:signal-field',
  'builtin-html:neon-rain',
  'builtin-html:deep-current',
  'builtin-html:ember-trace',
  'builtin-html:frosted-morning',
  'builtin-html:porcelain-ripple',
  'builtin-html:lavender-dawn',
  'builtin-html:paper-breeze',
  'builtin-html:cloud-blueprint'
]
const htmlThemeIdSchema = z.enum(TERMINAL_HTML_THEME_IDS)
const backgroundAssetIdSchema = z.string().uuid()

const customHtmlThemeSchema = z.strictObject({
  id: z.string().regex(customHtmlThemeIdPattern),
  name: z.string().trim().min(1).max(40),
  html: z.string().min(1).max(30000)
}).superRefine((theme, ctx) => {
  const forbiddenPatterns = [
    /<\s*\/?\s*(?:script|iframe|object|embed|link|base|meta|form)\b/i,
    /\bon[a-z]+\s*=/i,
    /\bjavascript\s*:/i,
    /@import\b/i,
    /url\s*\(/i,
    /\b(?:src|href|action)\s*=\s*["']?\s*(?:https?:|\/\/)/i
  ]
  if (forbiddenPatterns.some(pattern => pattern.test(theme.html))) {
    ctx.addIssue({ code: 'custom', path: ['html'], message: 'HTML 主题不能包含脚本、嵌套页面、表单或远程资源' })
  }
})

const colorSchema = z.string().max(64).regex(colorPattern, '颜色格式无效')
const nullableColorSchema = colorSchema.nullable()
const themeTokenSchema = z.enum([
  'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white',
  'brightBlack', 'brightRed', 'brightGreen', 'brightYellow',
  'brightBlue', 'brightMagenta', 'brightCyan', 'brightWhite'
])

const themeColorsSchema = z.strictObject({
  foreground: colorSchema.optional(),
  background: colorSchema.optional(),
  cursor: colorSchema.optional(),
  cursorAccent: colorSchema.optional(),
  selectionBackground: colorSchema.optional(),
  selectionForeground: colorSchema.optional(),
  selectionInactiveBackground: colorSchema.optional(),
  black: colorSchema.optional(),
  red: colorSchema.optional(),
  green: colorSchema.optional(),
  yellow: colorSchema.optional(),
  blue: colorSchema.optional(),
  magenta: colorSchema.optional(),
  cyan: colorSchema.optional(),
  white: colorSchema.optional(),
  brightBlack: colorSchema.optional(),
  brightRed: colorSchema.optional(),
  brightGreen: colorSchema.optional(),
  brightYellow: colorSchema.optional(),
  brightBlue: colorSchema.optional(),
  brightMagenta: colorSchema.optional(),
  brightCyan: colorSchema.optional(),
  brightWhite: colorSchema.optional()
})

const ruleColorSchema = z.union([
  z.strictObject({ source: z.literal('theme'), token: themeTokenSchema }),
  z.strictObject({ source: z.literal('fixed'), value: colorSchema })
]).nullable()

export const highlightRuleSchema = z.strictObject({
  id: z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/),
  title: z.string().min(1).max(60),
  pattern: z.string().min(1).max(MAX_HIGHLIGHT_PATTERN_LENGTH),
  flags: z.string().max(4).regex(/^(?!.*(.).*\1)[gimu]*$/),
  scope: z.enum(['match', 'line', 'lineTail']),
  priority: z.number().int().min(-1000).max(1000).default(0),
  enabled: z.boolean(),
  style: z.strictObject({
    foreground: ruleColorSchema,
    background: ruleColorSchema,
    bold: z.boolean(),
    italic: z.boolean(),
    underline: z.boolean()
  })
}).superRefine((rule, ctx) => {
  try {
    new RegExp(rule.pattern, rule.flags)
  } catch {
    ctx.addIssue({ code: 'custom', path: ['pattern'], message: '正则表达式无效' })
  }
})

export const terminalSettingsSchema = z.strictObject({
  version: z.literal(3),
  appearance: z.strictObject({
    activeThemeId: z.string().refine(
      value => builtinThemeIdPattern.test(value) || customThemeIdPattern.test(value),
      '主题 ID 无效'
    ),
    customThemes: z.array(z.strictObject({
      id: z.string().regex(customThemeIdPattern),
      name: z.string().trim().min(1).max(40),
      colors: themeColorsSchema
    })).max(50),
    customHtmlThemes: z.array(customHtmlThemeSchema).max(20),
    font: z.strictObject({
      family: z.string().trim().min(1).max(160),
      size: z.number().int().min(6).max(30)
    }),
    overrides: z.strictObject({
      foreground: nullableColorSchema,
      cursor: nullableColorSchema,
      selectionBackground: nullableColorSchema
    }),
    background: z.strictObject({
      mode: z.enum(['theme', 'html', 'image']),
      htmlThemeId: z.union([htmlThemeIdSchema, z.string().regex(customHtmlThemeIdPattern)]).nullable(),
      assetId: backgroundAssetIdSchema.nullable(),
      fit: z.enum(['cover', 'contain', 'fill']),
      position: z.enum(['center', 'top', 'bottom', 'left', 'right']),
      overlay: z.strictObject({
        tone: z.enum(['auto', 'light', 'dark']),
        opacity: z.number().min(0).max(1)
      })
    })
  }),
  highlighting: z.strictObject({
    enabled: z.boolean(),
    debugMode: z.boolean(),
    presetId: z.literal(HIGHLIGHT_PRESET_ID),
    presetVersion: z.literal(HIGHLIGHT_PRESET_VERSION),
    builtinOverrides: z.array(highlightRuleSchema).max(BUILTIN_HIGHLIGHT_RULE_IDS.length),
    customRules: z.array(highlightRuleSchema).max(MAX_HIGHLIGHT_RULES)
  }),
  behavior: z.strictObject({
    autoReconnect: z.boolean(),
    autoExecuteScript: z.boolean(),
    autoShowContextMenu: z.boolean(),
    statusBarEnabled: z.boolean()
  })
}).superRefine((settings, ctx) => {
  const ids = new Set()
  const names = new Set()
  settings.appearance.customThemes.forEach((theme, index) => {
    const normalizedName = theme.name.toLocaleLowerCase()
    if (ids.has(theme.id)) ctx.addIssue({ code: 'custom', path: ['appearance', 'customThemes', index, 'id'], message: '主题 ID 重复' })
    if (names.has(normalizedName)) ctx.addIssue({ code: 'custom', path: ['appearance', 'customThemes', index, 'name'], message: '主题名称重复' })
    ids.add(theme.id)
    names.add(normalizedName)
  })

  const { activeThemeId, background } = settings.appearance
  if (activeThemeId.startsWith('custom:') && !ids.has(activeThemeId)) {
    ctx.addIssue({ code: 'custom', path: ['appearance', 'activeThemeId'], message: '自定义主题不存在' })
  }
  const htmlThemeIds = new Set(TERMINAL_HTML_THEME_IDS)
  const htmlThemeNames = new Set()
  settings.appearance.customHtmlThemes.forEach((theme, index) => {
    const normalizedName = theme.name.toLocaleLowerCase()
    if (htmlThemeIds.has(theme.id)) ctx.addIssue({ code: 'custom', path: ['appearance', 'customHtmlThemes', index, 'id'], message: 'HTML 主题 ID 重复' })
    if (htmlThemeNames.has(normalizedName)) ctx.addIssue({ code: 'custom', path: ['appearance', 'customHtmlThemes', index, 'name'], message: 'HTML 主题名称重复' })
    htmlThemeIds.add(theme.id)
    htmlThemeNames.add(normalizedName)
  })
  if (background.mode === 'html' && (!background.htmlThemeId || !htmlThemeIds.has(background.htmlThemeId))) {
    ctx.addIssue({ code: 'custom', path: ['appearance', 'background', 'htmlThemeId'], message: 'HTML 背景主题不存在' })
  }
  if (background.mode === 'image' && !background.assetId) {
    ctx.addIssue({ code: 'custom', path: ['appearance', 'background', 'assetId'], message: '请选择背景图片' })
  }

  const builtinRuleIds = new Set(BUILTIN_HIGHLIGHT_RULE_IDS)
  const ruleIds = new Set()
  settings.highlighting.builtinOverrides.forEach((rule, index) => {
    if (!builtinRuleIds.has(rule.id)) {
      ctx.addIssue({ code: 'custom', path: ['highlighting', 'builtinOverrides', index, 'id'], message: '内置规则 ID 无效' })
    }
    if (ruleIds.has(rule.id)) {
      ctx.addIssue({ code: 'custom', path: ['highlighting', 'builtinOverrides', index, 'id'], message: '高亮规则 ID 重复' })
    }
    ruleIds.add(rule.id)
  })
  settings.highlighting.customRules.forEach((rule, index) => {
    if (builtinRuleIds.has(rule.id)) {
      ctx.addIssue({ code: 'custom', path: ['highlighting', 'customRules', index, 'id'], message: '自定义规则不能使用内置规则 ID' })
    }
    if (ruleIds.has(rule.id)) {
      ctx.addIssue({ code: 'custom', path: ['highlighting', 'customRules', index, 'id'], message: '高亮规则 ID 重复' })
    }
    ruleIds.add(rule.id)
  })
  if (ruleIds.size > MAX_HIGHLIGHT_RULES) {
    ctx.addIssue({ code: 'custom', path: ['highlighting'], message: `高亮规则不能超过 ${ MAX_HIGHLIGHT_RULES } 条` })
  }
})

export const DEFAULT_TERMINAL_SETTINGS = Object.freeze({
  version: 3,
  appearance: {
    activeThemeId: 'builtin:Cobalt_Neon',
    customThemes: [],
    customHtmlThemes: [],
    font: { family: 'monospace', size: 16 },
    overrides: { foreground: null, cursor: null, selectionBackground: null },
    background: {
      mode: 'theme',
      htmlThemeId: 'builtin-html:orbital-grid',
      assetId: null,
      fit: 'cover',
      position: 'center',
      overlay: { tone: 'auto', opacity: 0.35 }
    }
  },
  highlighting: {
    enabled: false,
    debugMode: false,
    presetId: HIGHLIGHT_PRESET_ID,
    presetVersion: HIGHLIGHT_PRESET_VERSION,
    builtinOverrides: [],
    customRules: []
  },
  behavior: {
    autoReconnect: true,
    autoExecuteScript: false,
    autoShowContextMenu: true,
    statusBarEnabled: true
  }
})

function cloneDefaults() {
  return structuredClone(DEFAULT_TERMINAL_SETTINGS)
}

const builtinRulePriorities = {
  error: 100,
  warning: 80,
  success: 70,
  info: 60,
  network: 50,
  link: 45,
  datetime: 40,
  measurement: 35
}

function warnDroppedHighlightRule(id, reason) {
  console.warn(`终端高亮规则“${ id }”迁移失败：${ reason }`)
}

function migrateLegacyRule(id, rule = {}, currentV2 = false) {
  const pattern = typeof rule.pattern === 'string'
    ? rule.pattern
    : rule.pattern?.source
  if (!pattern) return null
  if (String(pattern).length > MAX_HIGHLIGHT_PATTERN_LENGTH) {
    warnDroppedHighlightRule(id, `正则长度超过 ${ MAX_HIGHLIGHT_PATTERN_LENGTH } 字符`)
    return null
  }

  const mappedId = legacyHighlightRuleIdMap[id] || id
  const normalizedId = String(mappedId).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 64) || 'rule'

  if (currentV2) {
    return {
      ...rule,
      id: normalizedId,
      title: String(rule.title || id).slice(0, 60),
      pattern: String(pattern),
      flags: typeof rule.flags === 'string' ? rule.flags : 'gi',
      scope: rule.scope === 'line' ? 'lineTail' : (rule.scope || 'match'),
      priority: Number.isInteger(rule.priority) ? rule.priority : (builtinRulePriorities[normalizedId] || 0)
    }
  }

  const foreground = rule.displayColor
    ? { source: 'fixed', value: rule.displayColor }
    : null
  const background = rule.backgroundColor
    ? { source: 'fixed', value: rule.backgroundColor }
    : null

  return {
    id: normalizedId,
    title: String(rule.title || id).slice(0, 60),
    pattern: String(pattern),
    flags: typeof rule.flags === 'string' ? rule.flags : (rule.pattern?.flags || 'gi'),
    scope: rule.fullLine ? 'lineTail' : 'match',
    priority: builtinRulePriorities[normalizedId] || 0,
    enabled: rule.enabled !== false,
    style: {
      foreground,
      background,
      bold: Boolean(rule.bold),
      italic: Boolean(rule.italic),
      underline: Boolean(rule.underline)
    }
  }
}

function migrateRuleList(entries, currentV2 = false) {
  const usedIds = new Set()
  return entries.slice(0, MAX_HIGHLIGHT_RULES).map(([id, rule], index) => {
    const migratedRule = migrateLegacyRule(id, rule, currentV2)
    if (!migratedRule) return null
    const baseId = migratedRule.id.slice(0, 56)
    let suffix = index
    while (usedIds.has(migratedRule.id)) {
      migratedRule.id = `${ baseId }_${ suffix }`
      suffix += 1
    }
    const parsedRule = highlightRuleSchema.safeParse(migratedRule)
    if (!parsedRule.success) {
      warnDroppedHighlightRule(id, formatTerminalSettingsError(parsedRule.error))
      return null
    }
    usedIds.add(parsedRule.data.id)
    return parsedRule.data
  }).filter(Boolean)
}

function createHighlightingSettings({ enabled = false, debugMode = false, rules = [] } = {}) {
  const builtinIds = new Set(BUILTIN_HIGHLIGHT_RULE_IDS)
  return {
    enabled,
    debugMode,
    presetId: HIGHLIGHT_PRESET_ID,
    presetVersion: HIGHLIGHT_PRESET_VERSION,
    builtinOverrides: rules.filter(rule => builtinIds.has(rule.id)),
    customRules: rules.filter(rule => !builtinIds.has(rule.id))
  }
}

function normalizeV2Highlighting(highlighting = {}) {
  if (highlighting.presetId === HIGHLIGHT_PRESET_ID) {
    return {
      enabled: highlighting.enabled === true,
      debugMode: highlighting.debugMode === true,
      presetId: HIGHLIGHT_PRESET_ID,
      presetVersion: HIGHLIGHT_PRESET_VERSION,
      builtinOverrides: Array.isArray(highlighting.builtinOverrides) ? highlighting.builtinOverrides : [],
      customRules: Array.isArray(highlighting.customRules) ? highlighting.customRules : []
    }
  }
  const rules = Array.isArray(highlighting.rules)
    ? migrateRuleList(highlighting.rules.map(rule => [rule.id, rule]), true)
    : []
  return createHighlightingSettings({
    enabled: highlighting.enabled === true,
    debugMode: highlighting.debugMode === true,
    rules
  })
}

export function migrateTerminalSettings(record) {
  if (!record) return cloneDefaults()
  if ([2, 3].includes(record.version)) {
    const settings = { ...record }
    delete settings._id
    delete settings.createTime
    delete settings.updateTime
    const background = settings.appearance?.background
    const defaultBackground = cloneDefaults().appearance.background
    const customHtmlThemes = Array.isArray(settings.appearance?.customHtmlThemes)
      ? settings.appearance.customHtmlThemes
      : []
    const availableHtmlThemeIds = new Set([
      ...TERMINAL_HTML_THEME_IDS,
      ...customHtmlThemes.map(theme => theme.id)
    ])
    const htmlThemeId = availableHtmlThemeIds.has(background?.htmlThemeId)
      ? background.htmlThemeId
      : defaultBackground.htmlThemeId
    const mode = ['theme', 'html', 'image'].includes(background?.mode) ? background.mode : 'theme'
    const assetId = z.string().uuid().safeParse(background?.assetId).success ? background.assetId : null
    const normalizedMode = mode === 'image' && !assetId ? 'theme' : mode
    settings.appearance = {
      ...settings.appearance,
      customHtmlThemes,
      background: {
        mode: normalizedMode,
        htmlThemeId,
        assetId,
        fit: ['cover', 'contain', 'fill'].includes(background?.fit) ? background.fit : defaultBackground.fit,
        position: ['center', 'top', 'bottom', 'left', 'right'].includes(background?.position) ? background.position : defaultBackground.position,
        overlay: background?.overlay || defaultBackground.overlay
      }
    }
    settings.highlighting = normalizeV2Highlighting(settings.highlighting)
    settings.version = 3
    settings.behavior = {
      ...cloneDefaults().behavior,
      ...settings.behavior
    }
    return terminalSettingsSchema.parse(settings)
  }

  const settings = cloneDefaults()
  for (const key of ['autoReconnect', 'autoExecuteScript', 'autoShowContextMenu']) {
    if (typeof record[key] === 'boolean') settings.behavior[key] = record[key]
  }
  if (typeof record.keywordHighlight === 'boolean') settings.highlighting.enabled = record.keywordHighlight
  if (typeof record.highlightDebugMode === 'boolean') settings.highlighting.debugMode = record.highlightDebugMode
  if (record.customHighlightRules && typeof record.customHighlightRules === 'object') {
    const migratedRules = migrateRuleList(Object.entries(record.customHighlightRules))
    settings.highlighting = createHighlightingSettings({
      enabled: settings.highlighting.enabled,
      debugMode: settings.highlighting.debugMode,
      rules: migratedRules
    })
  }
  return terminalSettingsSchema.parse(settings)
}

export function formatTerminalSettingsError(error) {
  if (!(error instanceof z.ZodError)) return error.message || '终端配置无效'
  return error.issues.map(issue => `${ issue.path.join('.') || 'config' }: ${ issue.message }`).join('；')
}
