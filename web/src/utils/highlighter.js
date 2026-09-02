const themeForegroundCodes = {
  black: 30,
  red: 31,
  green: 32,
  yellow: 33,
  blue: 34,
  magenta: 35,
  cyan: 36,
  white: 37,
  brightBlack: 90,
  brightRed: 91,
  brightGreen: 92,
  brightYellow: 93,
  brightBlue: 94,
  brightMagenta: 95,
  brightCyan: 96,
  brightWhite: 97
}

export const ANSI_THEME_TOKENS = Object.keys(themeForegroundCodes)
export const HIGHLIGHT_PRESET_ID = 'builtin:standard'
export const HIGHLIGHT_PRESET_VERSION = 2
export const MAX_HIGHLIGHT_RULES = 50
export const MAX_HIGHLIGHT_PATTERN_LENGTH = 4096

const themeColor = token => ({ source: 'theme', token })

export const DEFAULT_HIGHLIGHT_RULES = [
  {
    id: 'error',
    title: '错误日志',
    pattern: /\b(?:errors?|err|fail(?:ed|ure)?|fatal|critical|denied|refused|broken|crash(?:ed)?|exception|timeout|abort(?:ed)?|reject(?:ed)?|forbidden|unauthorized|conflict|corrupt(?:ed)?|missing|not found|unreachable|disconnect(?:ed)?|kill(?:ed)?|terminate(?:d)?|dead|died|panic|alarm|alert|emergency|severe|cannot|unable|impossible|blocked|locked|disaster|malformed|malicious|virus|breach|hack(?:ed)?|attack|exploit|vulnerability|damaged|destroyed|overload|overflow|outage|down|offline|inaccessible|unavailable|suspended|revoked|expired|expires|blacklisted|infected|compromised|hijacked|suspicious|illegal|loss|death|bad)\b/.source,
    flags: 'gi',
    scope: 'lineTail',
    priority: 100,
    enabled: true,
    style: { foreground: themeColor('red'), background: null, bold: true, italic: false, underline: false }
  },
  {
    id: 'warning',
    title: '警告日志',
    pattern: /\b(?:warn(?:ing)?s?|deprecated|caution|retry|retrying|retried|skipped|ignored|pause(?:d)?|delay(?:ed)?|slow|slower|outdated|obsolete|insecure|vulnerable|risky|unstable|experimental|beta|alpha|preview|temporary|temp|pending|throttle(?:d)?|restrict(?:ed)?|downgrade(?:d)?|fallback|backup|migration|maintenance|partial|limited|degraded|reduced|minor|notice|advisory|reminder|important|security|urgent|attention|required|mandatory|danger|risk|permission)\b/.source,
    flags: 'gi',
    scope: 'match',
    priority: 80,
    enabled: true,
    style: { foreground: themeColor('yellow'), background: null, bold: false, italic: true, underline: false }
  },
  {
    id: 'success',
    title: '成功状态',
    pattern: /\b(?:success(?:ful)?|successfully|complete(?:d)?|completed|finish(?:ed)?|finished|ok(?:ay)?|ready|active|running|begin|launch(?:ed)?|launched|connect(?:ed)?|connected|online|available|enabled|valid|verified|confirmed|approved|passed|accepted|resolved|fixed|repaired|restored|recovered|upgraded|updated|installed|deployed|built|compiled|loaded|mounted|synchronized|synced|healthy|stable|secure|safe|protected|authenticated|authorized|granted|allowed|permitted|working|alive|opened|succeeded|established)\b/.source,
    flags: 'gi',
    scope: 'match',
    priority: 70,
    enabled: true,
    style: { foreground: themeColor('green'), background: null, bold: false, italic: false, underline: false }
  },
  {
    id: 'info',
    title: '信息日志',
    pattern: /\b(?:info|information|notification|message|msg|debug|trace|verbose|status|report|summary|loading|connecting|processing|monitoring|checking|scanning|analyzing|parsing|building|compiling|initializing|setup|preparing|progress|executing|stopped|stopping|resumed|resuming|restarted|restarting|closed|queued|removed|sleeping|zombie)\b/.source,
    flags: 'gi',
    scope: 'match',
    priority: 60,
    enabled: true,
    style: { foreground: themeColor('cyan'), background: null, bold: false, italic: false, underline: false }
  },
  {
    id: 'network',
    title: 'IP 地址和端口',
    pattern: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)(?::[1-9]\d{0,4})?\b|(?:(?:[0-9a-fA-F]{1,4}:)*)?::(?:[0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{0,4}|(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}/.source,
    flags: 'gi',
    scope: 'match',
    priority: 50,
    enabled: true,
    style: { foreground: themeColor('magenta'), background: null, bold: false, italic: false, underline: false }
  },
  {
    id: 'link',
    title: 'URL、邮箱和路径',
    pattern: /(?:https?|ftp|ftps|ssh|telnet|ws|wss):\/\/[^\s]+|file:\/\/[^\s]+|mailto:[^\s]+|www\.[^\s]+\.[a-z]{2,}[^\s]*|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|(?<=^|\s)(?:[/~]|\.\.?\/)[a-zA-Z0-9_\-./]+|(?<=^|\s)[A-Z]:\\[a-zA-Z0-9_\-.\\\s]+/.source,
    flags: 'gi',
    scope: 'match',
    priority: 45,
    enabled: true,
    style: { foreground: themeColor('blue'), background: null, bold: false, italic: false, underline: true }
  },
  {
    id: 'datetime',
    title: '日期时间',
    pattern: /\b\d{4}[-/]\d{1,2}[-/]\d{1,2}(?:[Tt\s]\d{1,2}:\d{1,2}(?::\d{1,2})?(?:\.\d+)?[Zz]?)?\b|\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b|\b(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?(?:\.\d+)?(?:\s?[AaPp][Mm])?\b|\[\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}(?:\.\d+)?\]|\b\d{10,13}\b/.source,
    flags: 'gi',
    scope: 'match',
    priority: 40,
    enabled: true,
    style: { foreground: themeColor('brightBlack'), background: null, bold: false, italic: false, underline: false }
  },
  {
    id: 'measurement',
    title: '数值与单位',
    pattern: /\b\d+(?:\.\d+)?\s*(?:TiB|GiB|MiB|KiB|TB|GB|MB|KB|Tbps|Gbps|Mbps|Kbps|bps|ns|μs|ms|min|hrs?|°C|°F|Hz|KHz|MHz|GHz|THz|mV|kV|mA|kA|mW|kW|MW|GW|fps|rpm|RPM|dpi|ppi|px|bits?|bytes?|cores?|threads?)\b|\b(?:\d+(?:\.\d+)?|100(?:\.0+)?)\s*%|\b\d+(?:\.\d+)?\s*(?:ops[/]s|req[/]s|qps|tps|rps|iops|IOPS|pps|PPS)\b|\b\d+(?:\.\d+)?\s+(?:milliseconds?|seconds?|minutes?|hours?|days?|weeks?|months?|years?)\b/.source,
    flags: 'gi',
    scope: 'match',
    priority: 35,
    enabled: true,
    style: { foreground: themeColor('magenta'), background: null, bold: false, italic: false, underline: false }
  },
]

export const BUILTIN_HIGHLIGHT_RULE_IDS = DEFAULT_HIGHLIGHT_RULES.map(rule => rule.id)

const clone = value => JSON.parse(JSON.stringify(value))

export function createDefaultHighlightingSettings() {
  return {
    enabled: false,
    debugMode: false,
    presetId: HIGHLIGHT_PRESET_ID,
    presetVersion: HIGHLIGHT_PRESET_VERSION,
    builtinOverrides: [],
    customRules: []
  }
}

export function resolveHighlightRules(highlighting = {}) {
  if (Array.isArray(highlighting.rules)) return clone(highlighting.rules)

  const overrides = new Map((highlighting.builtinOverrides || []).map(rule => [rule.id, rule,]))
  const builtins = DEFAULT_HIGHLIGHT_RULES.map(rule => clone(overrides.get(rule.id) || rule))
  const customRules = (highlighting.customRules || [])
    .filter(rule => !BUILTIN_HIGHLIGHT_RULE_IDS.includes(rule.id))
    .map(clone)
  return [...builtins, ...customRules,].slice(0, MAX_HIGHLIGHT_RULES)
}

export function serializeHighlightRules(rules = []) {
  const defaults = new Map(DEFAULT_HIGHLIGHT_RULES.map(rule => [rule.id, rule,]))
  const builtinOverrides = []
  const customRules = []

  rules.forEach((rule) => {
    const defaultRule = defaults.get(rule.id)
    if (!defaultRule) {
      customRules.push(clone(rule))
    } else if (JSON.stringify(rule) !== JSON.stringify(defaultRule)) {
      builtinOverrides.push(clone(rule))
    }
  })

  return { builtinOverrides, customRules }
}

function colorToRgb(value) {
  if (!value || value === 'transparent') return null
  const hex = value.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i)?.[1]
  if (hex) {
    const normalized = hex.length <= 4
      ? hex.slice(0, 3).split('').map(char => char + char).join('')
      : hex.slice(0, 6)
    return [0, 2, 4,].map(index => parseInt(normalized.slice(index, index + 2), 16))
  }
  const rgb = value.match(/^rgba?\(\s*([\d.]+%?)\s*,\s*([\d.]+%?)\s*,\s*([\d.]+%?)/i)
  return rgb ? rgb.slice(1, 4).map((channel) => {
    const value = Number.parseFloat(channel)
    const normalized = channel.endsWith('%') ? value * 2.55 : value
    return Math.max(0, Math.min(255, Math.round(normalized)))
  }) : null
}

function colorAnsi(color, background = false) {
  if (!color) return ''
  if (color.source === 'theme') {
    const foregroundCode = themeForegroundCodes[color.token]
    if (!foregroundCode) return ''
    return `\x1b[${ background ? foregroundCode + 10 : foregroundCode }m`
  }
  const rgb = colorToRgb(color.value)
  if (!rgb) return ''
  return `\x1b[${ background ? 48 : 38 };2;${ rgb.join(';') }m`
}

function styleAnsi(style = {}) {
  return [
    colorAnsi(style.foreground),
    colorAnsi(style.background, true),
    style.bold ? '\x1b[1m' : '',
    style.italic ? '\x1b[3m' : '',
    style.underline ? '\x1b[4m' : '',
  ].join('')
}

function readExtendedColor(tokens, index) {
  const mode = Number(tokens[index + 1])
  if (mode === 5 && tokens[index + 2] !== undefined) {
    return { value: tokens.slice(index, index + 3).join(';'), end: index + 2 }
  }
  if (mode === 2 && tokens[index + 4] !== undefined) {
    return { value: tokens.slice(index, index + 5).join(';'), end: index + 4 }
  }
  return { value: tokens[index], end: index }
}

class SgrState {

  constructor() {
    this.values = new Map()
  }

  clear() {
    this.values.clear()
  }

  apply(sequence) {
    const match = sequence.match(/^\x1b\[([0-9:;]*)m$/)
    if (!match) return false
    const tokens = match[1] === '' ? ['0',] : match[1].split(';')

    for (let index = 0; index < tokens.length; index += 1) {
      const token = tokens[index] || '0'
      const code = Number(token.split(':')[0])
      if (!Number.isFinite(code)) continue
      if (code === 0) this.clear()
      else if (code === 1) this.values.set('bold', token)
      else if (code === 2) this.values.set('dim', token)
      else if (code === 22) {
        this.values.delete('bold')
        this.values.delete('dim')
      } else if (code === 3 || code === 20) this.values.set('italic', token)
      else if (code === 23) this.values.delete('italic')
      else if (code === 4 || code === 21) this.values.set('underline', token)
      else if (code === 24) this.values.delete('underline')
      else if (code === 5 || code === 6) this.values.set('blink', token)
      else if (code === 25) this.values.delete('blink')
      else if (code === 7) this.values.set('inverse', token)
      else if (code === 27) this.values.delete('inverse')
      else if (code === 8) this.values.set('hidden', token)
      else if (code === 28) this.values.delete('hidden')
      else if (code === 9) this.values.set('strike', token)
      else if (code === 29) this.values.delete('strike')
      else if ((code >= 30 && code <= 37) || (code >= 90 && code <= 97)) this.values.set('foreground', token)
      else if (code === 38) {
        const color = token.includes(':') ? { value: token, end: index } : readExtendedColor(tokens, index)
        this.values.set('foreground', color.value)
        index = color.end
      } else if (code === 39) this.values.delete('foreground')
      else if ((code >= 40 && code <= 47) || (code >= 100 && code <= 107)) this.values.set('background', token)
      else if (code === 48) {
        const color = token.includes(':') ? { value: token, end: index } : readExtendedColor(tokens, index)
        this.values.set('background', color.value)
        index = color.end
      } else if (code === 49) this.values.delete('background')
      else if (code === 58) {
        const color = token.includes(':') ? { value: token, end: index } : readExtendedColor(tokens, index)
        this.values.set('underlineColor', color.value)
        index = color.end
      } else if (code === 59) this.values.delete('underlineColor')
    }
    return true
  }

  restore() {
    const values = [...this.values.values(),]
    return values.length ? `\x1b[${ values.join(';') }m` : ''
  }
}

function compileRule(rule, index) {
  if (rule.enabled === false || !styleAnsi(rule.style)) return null
  const flags = rule.flags.includes('g') ? rule.flags : `${ rule.flags }g`
  try {
    return { rule, index, expression: new RegExp(rule.pattern, flags) }
  } catch (error) {
    console.warn(`跳过无效的终端高亮规则 ${ rule.id }:`, error.message)
    return null
  }
}

function expandMatchScope(text, match, scope) {
  if (scope === 'match') return { start: match.index, end: match.index + match[0].length }
  const lineStart = text.lastIndexOf('\n', match.index - 1) + 1
  const newlineIndex = text.indexOf('\n', match.index + match[0].length)
  let lineEnd = newlineIndex < 0 ? text.length : newlineIndex
  if (lineEnd > lineStart && text[lineEnd - 1] === '\r') lineEnd -= 1
  return {
    start: scope === 'lineTail' ? match.index : lineStart,
    end: lineEnd
  }
}

function rangesOverlap(left, right) {
  return left.start < right.end && right.start < left.end
}

function splitIncompleteAnsiTail(text) {
  const escapeIndex = text.lastIndexOf('\x1b')
  if (escapeIndex < 0) return { complete: text, carry: '' }
  const tail = text.slice(escapeIndex)
  const introducer = tail[1]
  let isIncomplete = tail.length === 1

  if (introducer === '[') {
    // CSI 的结束字节只需要出现在序列前缀末尾，后面可以继续跟普通文本。
    isIncomplete = !/^\x1b\[[0-?]*[ -/]*[@-~]/.test(tail)
  } else if (introducer === ']') {
    isIncomplete = !/^\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/.test(tail)
  } else if (['P', 'X', '^', '_',].includes(introducer)) {
    isIncomplete = !/^\x1b(?:P|X|\^|_)[\s\S]*?\x1b\\/.test(tail)
  } else if (tail.length >= 2) {
    // 两字节 ESC 序列，或者不认识的扩展序列，交给 xterm 原样处理。
    isIncomplete = false
  }

  return isIncomplete
    ? { complete: text.slice(0, escapeIndex), carry: tail }
    : { complete: text, carry: '' }
}

export class TerminalHighlighter {

  static ANSI_FULL = /\x1b\[[0-?]*[ -/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1bP[\s\S]*?\x1b\\|\x1bX[\s\S]*?\x1b\\|\x1b\^[\s\S]*?\x1b\\|\x1b_[\s\S]*?\x1b\\|\x1b(?:[@-Z\\-_]|[78=><])/g

  constructor(_terminal, options = {}) {
    this.enabled = options.enabled === true
    this.debugMode = options.debugMode === true
    this.sgrState = new SgrState()
    this.ansiCarry = ''
    this.updateCustomRules(options.customRules)
  }

  updateCustomRules(customRules) {
    this.rules = clone(customRules || DEFAULT_HIGHLIGHT_RULES)
    this.compiledRules = this.rules.map(compileRule).filter(Boolean)
  }

  setEnabled(enabled) {
    this.enabled = enabled === true
  }

  setDebugMode(enabled) {
    this.debugMode = enabled === true
  }

  resetStreamState() {
    this.sgrState.clear()
    this.ansiCarry = ''
  }

  highlightText(text) {
    if (!text) return text
    const { complete, carry } = splitIncompleteAnsiTail(`${ this.ansiCarry }${ text }`)
    this.ansiCarry = carry
    if (!complete) return ''
    if (!this.enabled || !/[\p{L}\p{N}]/u.test(complete) || complete.length > 65536) {
      this.trackAnsiState(complete)
      return complete
    }

    try {
      const { parts, plainText } = this.parseParts(complete)
      const matches = this.findMatches(plainText)
      if (!matches.length) {
        parts.forEach(part => part.type === 'ansi' && this.sgrState.apply(part.content))
        return complete
      }
      const output = this.renderParts(parts, matches)
      if (this.debugMode) console.debug('终端内容高亮命中', { input: complete, output, matches })
      return output
    } catch (error) {
      if (this.debugMode) console.warn('终端内容高亮失败，已旁路原始输出:', error)
      this.trackAnsiState(complete)
      return complete
    }
  }

  trackAnsiState(text) {
    text.replace(TerminalHighlighter.ANSI_FULL, (sequence) => {
      this.sgrState.apply(sequence)
      return sequence
    })
  }

  parseParts(text) {
    const parts = []
    let plainText = ''
    let lastIndex = 0
    text.replace(TerminalHighlighter.ANSI_FULL, (sequence, offset) => {
      if (offset > lastIndex) {
        const content = text.slice(lastIndex, offset)
        parts.push({ type: 'text', content })
        plainText += content
      }
      parts.push({ type: 'ansi', content: sequence })
      lastIndex = offset + sequence.length
      return sequence
    })
    if (lastIndex < text.length) {
      const content = text.slice(lastIndex)
      parts.push({ type: 'text', content })
      plainText += content
    }
    return { parts, plainText }
  }

  findMatches(text) {
    const candidates = []
    const dedupe = new Set()

    for (const { rule, index, expression } of this.compiledRules) {
      expression.lastIndex = 0
      let match
      while ((match = expression.exec(text)) !== null && candidates.length < 2000) {
        if (!match[0]) {
          expression.lastIndex += 1
          continue
        }
        const range = expandMatchScope(text, match, rule.scope)
        const key = `${ rule.id }:${ range.start }:${ range.end }`
        if (range.end > range.start && !dedupe.has(key)) {
          dedupe.add(key)
          candidates.push({
            ...range,
            rule,
            order: index,
            priority: Number.isInteger(rule.priority) ? rule.priority : 0
          })
        }
      }
    }

    candidates.sort((left, right) =>
      right.priority - left.priority
      || left.order - right.order
      || left.start - right.start
      || right.end - left.end)

    const accepted = []
    for (const candidate of candidates) {
      if (accepted.some(match => rangesOverlap(match, candidate))) continue
      accepted.push(candidate)
    }
    return accepted.sort((left, right) => left.start - right.start)
  }

  renderParts(parts, matches) {
    let output = ''
    let plainIndex = 0
    let matchIndex = 0
    let activeMatch = null

    const closeMatch = () => {
      if (!activeMatch) return
      output += `\x1b[0m${ this.sgrState.restore() }`
      activeMatch = null
      matchIndex += 1
    }

    const syncMatch = (allowOpen = true) => {
      if (activeMatch && plainIndex >= activeMatch.end) closeMatch()
      const nextMatch = matches[matchIndex]
      if (allowOpen && !activeMatch && nextMatch?.start === plainIndex) {
        activeMatch = nextMatch
        output += styleAnsi(activeMatch.rule.style)
      }
    }

    for (const part of parts) {
      if (part.type === 'ansi') {
        syncMatch(false)
        output += part.content
        const isSgr = this.sgrState.apply(part.content)
        if (activeMatch && isSgr) output += styleAnsi(activeMatch.rule.style)
        else syncMatch()
        continue
      }

      syncMatch()
      let offset = 0
      while (offset < part.content.length) {
        syncMatch()
        const nextBoundary = activeMatch
          ? activeMatch.end
          : (matches[matchIndex]?.start ?? Number.POSITIVE_INFINITY)
        const available = part.content.length - offset
        const length = Math.min(available, Math.max(0, nextBoundary - plainIndex))
        if (length === 0) {
          syncMatch()
          continue
        }
        output += part.content.slice(offset, offset + length)
        offset += length
        plainIndex += length
      }
    }
    syncMatch()
    if (activeMatch) closeMatch()
    return output
  }
}
