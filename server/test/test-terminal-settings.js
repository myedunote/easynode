import assert from 'node:assert/strict'
import fsp from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { PassThrough } from 'node:stream'
import {
  DEFAULT_TERMINAL_SETTINGS,
  migrateTerminalSettings,
  TERMINAL_HTML_THEME_IDS,
  terminalSettingsSchema
} from '../app/utils/terminal-settings.js'
import {
  cleanupTerminalBackgroundAssets,
  detectTerminalBackgroundType,
  validateTerminalBackgroundFile
} from '../app/utils/terminal-background-assets.js'
import { createMultipartUpload } from '../app/middlewares/multipart-upload.js'

const clone = value => JSON.parse(JSON.stringify(value))
const legacyErrorPattern = '\\b(?:errors?|err|fail(?:ed|ure)?|fatal|critical|denied|refused|broken|crash(?:ed)?|exception|timeout|abort(?:ed)?|reject(?:ed)?|forbidden|unauthorized|conflict|corrupt(?:ed)?|missing|not found|unreachable|disconnect(?:ed)?|kill(?:ed)?|terminate(?:d)?|dead|died|panic|alarm|alert|emergency|severe|cannot|unable|impossible|blocked|locked|disaster|malformed|malicious|virus|breach|hack(?:ed)?|attack|exploit|vulnerability|damaged|destroyed|overload|overflow|outage|down|offline|inaccessible|unavailable|suspended|revoked|expired|expires|blacklisted|infected|compromised|hijacked|suspicious|illegal|loss|death|bad)\\b'

const defaults = migrateTerminalSettings(null)
assert.deepEqual(defaults, DEFAULT_TERMINAL_SETTINGS)
assert.equal(defaults.highlighting.enabled, false)
assert.deepEqual(defaults.appearance.customHtmlThemes, [])
assert.equal(defaults.appearance.background.assetId, null)

const migrated = migrateTerminalSettings({
  themeName: 'Afterglow',
  background: 'https://example.com/unsafe.png',
  autoReconnect: false,
  autoExecuteScript: true,
  autoShowContextMenu: false,
  keywordHighlight: true,
  highlightDebugMode: true,
  customHighlightRules: {
    rule1: {
      title: '旧错误规则',
      pattern: { source: legacyErrorPattern },
      flags: 'gi',
      fullLine: true,
      displayColor: '#ff0000',
      backgroundColor: null,
      bold: true,
      enabled: true
    }
  }
})

assert.equal(migrated.appearance.activeThemeId, 'builtin:Cobalt_Neon')
assert.equal(migrated.appearance.background.mode, 'theme')
assert.deepEqual(migrated.behavior, {
  autoReconnect: false,
  autoExecuteScript: true,
  autoShowContextMenu: false,
  statusBarEnabled: true
})
assert.equal(migrated.highlighting.enabled, true)
assert.equal(migrated.highlighting.builtinOverrides[0].id, 'error')
assert.equal(migrated.highlighting.builtinOverrides[0].scope, 'lineTail')
assert.equal(migrated.highlighting.builtinOverrides[0].pattern, legacyErrorPattern)
assert.equal(migrated.highlighting.builtinOverrides[0].pattern.length > 512, true)
assert.deepEqual(migrated.highlighting.builtinOverrides[0].style.foreground, {
  source: 'fixed',
  value: '#ff0000'
})

const migratedV2StatusBar = clone(DEFAULT_TERMINAL_SETTINGS)
migratedV2StatusBar.version = 2
delete migratedV2StatusBar.behavior.statusBarEnabled
const migratedV2Settings = migrateTerminalSettings(migratedV2StatusBar)
assert.equal(migratedV2Settings.version, 3)
assert.equal(migratedV2Settings.behavior.statusBarEnabled, true)

const disabledStatusBar = clone(DEFAULT_TERMINAL_SETTINGS)
disabledStatusBar.behavior.statusBarEnabled = false
assert.equal(terminalSettingsSchema.safeParse(disabledStatusBar).success, true)

const migratedWithInvalidRule = migrateTerminalSettings({
  keywordHighlight: true,
  customHighlightRules: {
    invalid: { title: 'Invalid', pattern: { source: '(' }, flags: 'gi', displayColor: 'not-a-color' }
  }
})
assert.equal(migratedWithInvalidRule.highlighting.enabled, true)
assert.deepEqual(migratedWithInvalidRule.highlighting.builtinOverrides, [])
assert.deepEqual(migratedWithInvalidRule.highlighting.customRules, [])

const htmlBackground = clone(DEFAULT_TERMINAL_SETTINGS)
htmlBackground.appearance.background.mode = 'html'
htmlBackground.appearance.background.htmlThemeId = TERMINAL_HTML_THEME_IDS[1]
assert.equal(terminalSettingsSchema.safeParse(htmlBackground).success, true)

const invalidHtmlBackground = clone(DEFAULT_TERMINAL_SETTINGS)
invalidHtmlBackground.appearance.background.mode = 'html'
invalidHtmlBackground.appearance.background.htmlThemeId = 'builtin-html:remote-theme'
assert.equal(terminalSettingsSchema.safeParse(invalidHtmlBackground).success, false)

const customHtmlBackground = clone(DEFAULT_TERMINAL_SETTINGS)
customHtmlBackground.appearance.customHtmlThemes = [{
  id: 'custom-html:00000000-0000-4000-8000-000000000001',
  name: 'Local glow',
  html: '<style>.glow { animation: pulse 2s infinite; }</style><div class="glow"></div>'
}]
customHtmlBackground.appearance.background.mode = 'html'
customHtmlBackground.appearance.background.htmlThemeId = customHtmlBackground.appearance.customHtmlThemes[0].id
assert.equal(terminalSettingsSchema.safeParse(customHtmlBackground).success, true)

const unsafeCustomHtml = clone(customHtmlBackground)
unsafeCustomHtml.appearance.customHtmlThemes[0].html = '<script src="https://example.com/theme.js"></script>'
assert.equal(terminalSettingsSchema.safeParse(unsafeCustomHtml).success, false)

const imageBackground = clone(DEFAULT_TERMINAL_SETTINGS)
imageBackground.appearance.background.mode = 'image'
imageBackground.appearance.background.assetId = '00000000-0000-4000-8000-000000000001'
assert.equal(terminalSettingsSchema.safeParse(imageBackground).success, true)

const migratedLegacyV2Background = migrateTerminalSettings({
  ...clone(DEFAULT_TERMINAL_SETTINGS),
  appearance: {
    ...clone(DEFAULT_TERMINAL_SETTINGS).appearance,
    background: {
      mode: 'image',
      gradientId: null,
      assetId: '00000000-0000-4000-8000-000000000001',
      fit: 'cover',
      position: 'center',
      overlay: { tone: 'dark', opacity: 0.8 }
    }
  }
})
assert.equal(migratedLegacyV2Background.appearance.background.mode, 'image')
assert.equal(migratedLegacyV2Background.appearance.background.htmlThemeId, TERMINAL_HTML_THEME_IDS[0])
assert.equal(migratedLegacyV2Background.appearance.background.fit, 'cover')

const duplicateThemes = clone(DEFAULT_TERMINAL_SETTINGS)
duplicateThemes.appearance.customThemes = [
  { id: 'custom:00000000-0000-4000-8000-000000000001', name: 'Ocean', colors: {} },
  { id: 'custom:00000000-0000-4000-8000-000000000002', name: 'ocean', colors: {} }
]
assert.equal(terminalSettingsSchema.safeParse(duplicateThemes).success, false)

const invalidRule = clone(DEFAULT_TERMINAL_SETTINGS)
invalidRule.highlighting.customRules = [{
  id: 'bad',
  title: 'Bad regex',
  pattern: '(',
  flags: 'gi',
  scope: 'match',
  enabled: true,
  style: { foreground: null, background: null, bold: false, italic: false, underline: false }
}]
assert.equal(terminalSettingsSchema.safeParse(invalidRule).success, false)

const invalidFixedColor = clone(DEFAULT_TERMINAL_SETTINGS)
invalidFixedColor.highlighting.customRules = [{
  id: 'invalid_color',
  title: 'Invalid color',
  pattern: 'color',
  flags: 'gi',
  scope: 'match',
  priority: 0,
  enabled: true,
  style: { foreground: { source: 'fixed', value: '#12345' }, background: null, bold: false, italic: false, underline: false }
}]
assert.equal(terminalSettingsSchema.safeParse(invalidFixedColor).success, false)

const migratedEarlyV2Highlighting = migrateTerminalSettings({
  ...clone(DEFAULT_TERMINAL_SETTINGS),
  highlighting: {
    enabled: true,
    debugMode: false,
    rules: [{
      id: 'error',
      title: '错误日志',
      pattern: legacyErrorPattern,
      flags: 'gi',
      scope: 'line',
      enabled: true,
      style: { foreground: { source: 'theme', token: 'brightRed' }, background: null, bold: true, italic: false, underline: false }
    }]
  }
})
assert.equal(migratedEarlyV2Highlighting.highlighting.builtinOverrides[0].scope, 'lineTail')
assert.equal(migratedEarlyV2Highlighting.highlighting.builtinOverrides[0].priority, 100)

assert.equal(detectTerminalBackgroundType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), 'image/png')
assert.equal(detectTerminalBackgroundType(Buffer.from([0xff, 0xd8, 0xff, 0x00])), 'image/jpeg')
assert.equal(detectTerminalBackgroundType(Buffer.from('RIFF0000WEBP')), 'image/webp')
assert.equal(detectTerminalBackgroundType(Buffer.from('not-an-image')), null)

const assetTestDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'easynode-terminal-background-'))
try {
  const fakePngPath = path.join(assetTestDir, 'fake.png')
  await fsp.writeFile(fakePngPath, 'not-an-image')
  await assert.rejects(
    validateTerminalBackgroundFile({
      filepath: fakePngPath,
      originalFilename: 'fake.png',
      mimetype: 'image/png',
      size: 12
    }),
    /文件签名/
  )

  const activeAssetId = '00000000-0000-4000-8000-000000000001'
  const orphanAssetId = '00000000-0000-4000-8000-000000000002'
  const activeAssetPath = path.join(assetTestDir, `${ activeAssetId }.png`)
  const orphanAssetPath = path.join(assetTestDir, `${ orphanAssetId }.png`)
  await Promise.all([
    fsp.writeFile(activeAssetPath, 'active'),
    fsp.writeFile(orphanAssetPath, 'orphan')
  ])
  const expiredTime = new Date(Date.now() - 25 * 60 * 60 * 1000)
  await Promise.all([
    fsp.utimes(activeAssetPath, expiredTime, expiredTime),
    fsp.utimes(orphanAssetPath, expiredTime, expiredTime)
  ])
  await cleanupTerminalBackgroundAssets({ keepAssetId: activeAssetId, assetDir: assetTestDir })
  await fsp.access(activeAssetPath)
  await assert.rejects(fsp.access(orphanAssetPath), error => error.code === 'ENOENT')
} finally {
  await fsp.rm(assetTestDir, { recursive: true, force: true })
}

function createMultipartContext(parts) {
  const boundary = '----easynode-upload-test'
  const body = parts.flatMap(({ field, filename, type = 'image/png', content }) => [
    `--${ boundary }`,
    `Content-Disposition: form-data; name="${ field }"; filename="${ filename }"`,
    `Content-Type: ${ type }`,
    '',
    content
  ]).concat([`--${ boundary }--`, '']).join('\r\n')
  const req = new PassThrough()
  req.headers = {
    'content-type': `multipart/form-data; boundary=${ boundary }`,
    'content-length': Buffer.byteLength(body)
  }
  const response = {}
  const ctx = {
    method: 'POST',
    req,
    request: {},
    state: {},
    is: value => value === 'multipart' ? 'multipart/form-data' : false,
    res: { fail: error => { response.error = error } }
  }
  return { body, ctx, response }
}

const parseTestUpload = createMultipartUpload({ maxFileSize: 1024 })
const validUpload = createMultipartContext([
  { field: 'file', filename: 'background.png', content: 'valid-upload' }
])
let validTempPath
const validUploadPromise = parseTestUpload(validUpload.ctx, async() => {
  validTempPath = validUpload.ctx.state.multipartUpload.file.filepath
  await fsp.access(validTempPath)
})
validUpload.ctx.req.end(validUpload.body)
await validUploadPromise
await assert.rejects(fsp.access(validTempPath), error => error.code === 'ENOENT')

const invalidUpload = createMultipartContext([
  { field: 'file', filename: 'background.png', content: 'expected-upload' },
  { field: 'file', filename: 'duplicate.png', content: 'duplicate-upload' },
  { field: 'unexpected', filename: 'extra.png', content: 'unexpected-upload' }
])
let invalidNextCalled = false
const invalidUploadPromise = parseTestUpload(invalidUpload.ctx, async() => { invalidNextCalled = true })
invalidUpload.ctx.req.end(invalidUpload.body)
await invalidUploadPromise
assert.equal(invalidNextCalled, false)
assert.equal(invalidUpload.response.error.status, 422)
const invalidTempPaths = Object.values(invalidUpload.ctx.request.files).flatMap(file => Array.isArray(file) ? file : [file]).map(file => file.filepath)
for (const filePath of invalidTempPaths) {
  await assert.rejects(fsp.access(filePath), error => error.code === 'ENOENT')
}

assert.throws(() => createMultipartUpload({ maxFileSize: 0 }), /大小限制无效/)

console.log('terminal settings tests passed')
