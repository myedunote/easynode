<template>
  <div class="highlight_settings">
    <div class="highlight_toolbar">
      <div>
        <div class="setting_title">内容高亮</div>
        <div class="setting_description">按文本语义增强时间、错误、链接等输出；关闭时不会改写终端内容。</div>
      </div>
      <el-switch v-model="enabled" @change="saveSwitches" />
    </div>

    <div class="highlight_toolbar compact">
      <span>调试日志</span>
      <el-switch v-model="debugMode" :disabled="!enabled" @change="saveSwitches" />
    </div>

    <div class="rule_header">
      <div>
        <strong>高亮规则</strong>
        <span>{{ rules.length }}/{{ MAX_HIGHLIGHT_RULES }}</span>
      </div>
      <div class="rule_actions">
        <el-button size="small" @click="restoreDefaults">恢复默认</el-button>
        <el-button size="small" @click="exportRules">导出</el-button>
        <el-button size="small" @click="importInput?.click()">导入</el-button>
        <el-button
          type="primary"
          size="small"
          :disabled="rules.length >= MAX_HIGHLIGHT_RULES"
          @click="createRule"
        >
          新建规则
        </el-button>
        <input
          ref="importInput"
          class="hidden_input"
          type="file"
          accept="application/json,.json"
          @change="importRules"
        >
      </div>
    </div>

    <div class="rule_list">
      <div v-for="rule in rules" :key="rule.id" class="rule_item">
        <div class="rule_swatch" :style="swatchStyle(rule)" />
        <div class="rule_summary">
          <div class="rule_name">{{ rule.title }}</div>
          <code>{{ rule.pattern }}</code>
        </div>
        <el-tag size="small" effect="plain">{{ scopeLabel(rule.scope) }}</el-tag>
        <el-switch v-model="rule.enabled" size="small" @change="saveRules" />
        <el-button link type="primary" @click="editRule(rule)">编辑</el-button>
        <el-button v-if="isBuiltinRule(rule)" link @click="restoreBuiltinRule(rule)">恢复</el-button>
        <el-button
          v-else
          link
          type="danger"
          @click="removeRule(rule)"
        >
          删除
        </el-button>
      </div>
    </div>

    <div class="preview_header">
      <strong>实时预览</strong>
      <span>主题色槽会自动使用当前终端主题</span>
    </div>
    <div ref="previewRef" class="highlight_preview" />

    <el-dialog
      v-model="showEditor"
      :title="editingIndex < 0 ? '新建高亮规则' : '编辑高亮规则'"
      width="min(620px, 94vw)"
      append-to-body
      :close-on-click-modal="false"
    >
      <el-form v-if="editingRule" label-position="top">
        <div class="editor_grid">
          <el-form-item label="名称">
            <el-input v-model="editingRule.title" maxlength="60" />
          </el-form-item>
          <el-form-item label="作用范围">
            <el-radio-group v-model="editingRule.scope">
              <el-radio-button value="match">匹配项</el-radio-button>
              <el-radio-button value="lineTail">匹配至行尾</el-radio-button>
              <el-radio-button value="line">完整行</el-radio-button>
            </el-radio-group>
          </el-form-item>
        </div>
        <el-form-item label="正则表达式">
          <el-input
            v-model="editingRule.pattern"
            type="textarea"
            :rows="3"
            :maxlength="MAX_HIGHLIGHT_PATTERN_LENGTH"
            show-word-limit
          />
        </el-form-item>
        <div class="editor_grid">
          <el-form-item label="正则 flags">
            <el-input v-model="editingRule.flags" maxlength="4" placeholder="gi" />
          </el-form-item>
          <el-form-item label="优先级">
            <el-input-number v-model="editingRule.priority" :min="-1000" :max="1000" />
          </el-form-item>
        </div>

        <div class="editor_grid">
          <el-form-item label="前景色">
            <div class="color_control">
              <el-select :model-value="colorMode(editingRule.style.foreground)" @change="value => changeColorMode('foreground', value)">
                <el-option label="不设置" value="none" />
                <el-option label="跟随主题" value="theme" />
                <el-option label="固定颜色" value="fixed" />
              </el-select>
              <el-select v-if="editingRule.style.foreground?.source === 'theme'" v-model="editingRule.style.foreground.token">
                <el-option
                  v-for="token in ANSI_THEME_TOKENS"
                  :key="token"
                  :label="token"
                  :value="token"
                />
              </el-select>
              <el-color-picker v-else-if="editingRule.style.foreground?.source === 'fixed'" v-model="editingRule.style.foreground.value" show-alpha />
            </div>
          </el-form-item>
          <el-form-item label="背景色">
            <div class="color_control">
              <el-select :model-value="colorMode(editingRule.style.background)" @change="value => changeColorMode('background', value)">
                <el-option label="不设置" value="none" />
                <el-option label="跟随主题" value="theme" />
                <el-option label="固定颜色" value="fixed" />
              </el-select>
              <el-select v-if="editingRule.style.background?.source === 'theme'" v-model="editingRule.style.background.token">
                <el-option
                  v-for="token in ANSI_THEME_TOKENS"
                  :key="token"
                  :label="token"
                  :value="token"
                />
              </el-select>
              <el-color-picker v-else-if="editingRule.style.background?.source === 'fixed'" v-model="editingRule.style.background.value" show-alpha />
            </div>
          </el-form-item>
        </div>
        <el-form-item label="文字样式">
          <el-checkbox v-model="editingRule.style.bold">粗体</el-checkbox>
          <el-checkbox v-model="editingRule.style.italic">斜体</el-checkbox>
          <el-checkbox v-model="editingRule.style.underline">下划线</el-checkbox>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditor = false">取消</el-button>
        <el-button type="primary" @click="saveEditingRule">保存规则</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { getCurrentInstance, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import {
  ANSI_THEME_TOKENS,
  BUILTIN_HIGHLIGHT_RULE_IDS,
  DEFAULT_HIGHLIGHT_RULES,
  MAX_HIGHLIGHT_PATTERN_LENGTH,
  MAX_HIGHLIGHT_RULES,
  resolveHighlightRules,
  serializeHighlightRules,
  TerminalHighlighter
} from '@/utils/highlighter'
import { resolveTerminalTheme } from '@/utils/terminal-settings'

const { proxy: { $store, $message, $messageBox } } = getCurrentInstance()
const previewRef = ref(null)
const importInput = ref(null)
const enabled = ref(false)
const debugMode = ref(false)
const rules = ref([])
const showEditor = ref(false)
const editingRule = ref(null)
const editingIndex = ref(-1)
let previewTerminal
let previewFitAddon
let previewResizeObserver
let previewRenderFrame

const clone = value => JSON.parse(JSON.stringify(value))

const loadSettings = () => {
  const highlighting = $store.terminalSettings.highlighting
  enabled.value = highlighting.enabled
  debugMode.value = highlighting.debugMode
  rules.value = resolveHighlightRules(highlighting)
}

const saveSwitches = async() => {
  try {
    await $store.setTerminalHighlighting({ enabled: enabled.value, debugMode: debugMode.value })
    schedulePreview()
  } catch {
    loadSettings()
  }
}

const saveRules = async() => {
  try {
    await $store.setTerminalHighlighting(serializeHighlightRules(rules.value))
    schedulePreview()
  } catch {
    loadSettings()
  }
}

const createRule = () => {
  editingIndex.value = -1
  editingRule.value = {
    id: `rule_${ Date.now() }`,
    title: '新规则',
    pattern: 'keyword',
    flags: 'gi',
    scope: 'match',
    priority: 0,
    enabled: true,
    style: {
      foreground: { source: 'theme', token: 'yellow' },
      background: null,
      bold: false,
      italic: false,
      underline: false
    }
  }
  showEditor.value = true
}

const editRule = (rule) => {
  editingIndex.value = rules.value.findIndex(item => item.id === rule.id)
  editingRule.value = clone(rule)
  showEditor.value = true
}

const saveEditingRule = async() => {
  const rule = editingRule.value
  if (!rule.title.trim() || !rule.pattern.trim()) return $message.warning('请填写规则名称和正则表达式')
  if (!/^(?!.*(.).*\1)[gimu]*$/.test(rule.flags)) return $message.warning('flags 仅支持不重复的 g、i、m、u')
  try {
    new RegExp(rule.pattern, rule.flags)
  } catch (error) {
    return $message.error(`正则表达式无效：${ error.message }`)
  }
  if (editingIndex.value < 0) rules.value.push(clone(rule))
  else rules.value.splice(editingIndex.value, 1, clone(rule))
  await saveRules()
  showEditor.value = false
}

const removeRule = async(rule) => {
  try {
    await $messageBox.confirm(`确认删除“${ rule.title }”？`, '删除高亮规则', { type: 'warning' })
    rules.value = rules.value.filter(item => item.id !== rule.id)
    await saveRules()
  } catch (error) {
    if (error !== 'cancel') $message.error('删除规则失败')
  }
}

const isBuiltinRule = rule => BUILTIN_HIGHLIGHT_RULE_IDS.includes(rule.id)
const scopeLabel = scope => ({ match: '匹配项', lineTail: '至行尾', line: '整行' }[scope] || '匹配项')

const restoreBuiltinRule = async(rule) => {
  const defaultRule = DEFAULT_HIGHLIGHT_RULES.find(item => item.id === rule.id)
  if (!defaultRule) return
  const index = rules.value.findIndex(item => item.id === rule.id)
  rules.value.splice(index, 1, clone(defaultRule))
  await saveRules()
}

const restoreDefaults = async() => {
  try {
    await $messageBox.confirm('恢复 EasyNode 默认高亮规则？', '恢复默认', { type: 'warning' })
    rules.value = clone(DEFAULT_HIGHLIGHT_RULES)
    await $store.setTerminalHighlighting({ builtinOverrides: [], customRules: [] })
    schedulePreview()
  } catch (error) {
    if (error !== 'cancel') $message.error('恢复默认规则失败')
  }
}

const exportRules = () => {
  const payload = {
    format: 'easynode-terminal-highlight/v2',
    highlighting: {
      enabled: enabled.value,
      debugMode: debugMode.value,
      presetId: $store.terminalSettings.highlighting.presetId,
      presetVersion: $store.terminalSettings.highlighting.presetVersion,
      rules: clone(rules.value)
    }
  }
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2),], { type: 'application/json' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `easynode-highlight-${ new Date().toISOString().slice(0, 10) }.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

const importRules = async(event) => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  try {
    const payload = JSON.parse(await file.text())
    const supportedFormats = ['easynode-terminal-highlight/v1', 'easynode-terminal-highlight/v2',]
    if (!supportedFormats.includes(payload.format) || !Array.isArray(payload.highlighting?.rules)) throw new Error('文件格式不匹配')
    if (payload.highlighting.rules.length > MAX_HIGHLIGHT_RULES) throw new Error(`规则不能超过 ${ MAX_HIGHLIGHT_RULES } 条`)
    const defaultPriorities = new Map(DEFAULT_HIGHLIGHT_RULES.map(rule => [rule.id, rule.priority,]))
    rules.value = clone(payload.highlighting.rules).map(rule => ({
      ...rule,
      scope: payload.format.endsWith('/v1') && rule.scope === 'line' ? 'lineTail' : rule.scope,
      priority: Number.isInteger(rule.priority) ? rule.priority : (defaultPriorities.get(rule.id) || 0)
    }))
    enabled.value = payload.highlighting.enabled === true
    debugMode.value = payload.highlighting.debugMode === true
    await $store.setTerminalHighlighting({
      enabled: enabled.value,
      debugMode: debugMode.value,
      ...serializeHighlightRules(rules.value)
    })
    schedulePreview()
    $message.success('高亮规则已导入')
  } catch (error) {
    loadSettings()
    $message.error(`导入失败：${ error.message }`)
  }
}

const colorMode = color => color?.source || 'none'
const changeColorMode = (field, mode) => {
  if (mode === 'none') editingRule.value.style[field] = null
  if (mode === 'theme') editingRule.value.style[field] = { source: 'theme', token: field === 'background' ? 'black' : 'yellow' }
  if (mode === 'fixed') editingRule.value.style[field] = { source: 'fixed', value: field === 'background' ? '#1e293b' : '#facc15' }
}

const swatchStyle = rule => {
  const foreground = rule.style.foreground
  if (!foreground) return { background: 'var(--el-fill-color)' }
  if (foreground.source === 'fixed') return { background: foreground.value }
  return { background: resolveTerminalTheme($store.effectiveTerminalSettings)[foreground.token] || '#94a3b8' }
}

const renderPreview = () => {
  if (!previewTerminal || !previewRef.value?.clientWidth || !previewRef.value?.clientHeight) return
  previewTerminal.options.theme = resolveTerminalTheme($store.effectiveTerminalSettings)
  previewTerminal.options.fontFamily = $store.effectiveTerminalSettings.appearance.font.family
  previewTerminal.options.fontSize = Math.min($store.effectiveTerminalSettings.appearance.font.size, 15)
  previewFitAddon?.fit()
  const highlighter = new TerminalHighlighter(previewTerminal, {
    enabled: enabled.value,
    debugMode: false,
    customRules: rules.value
  })
  const text = [
    '[2026-08-30 14:32:08] INFO service connected to 10.0.0.8:22',
    '[2026-08-30 14:32:09] WARNING memory usage reached 82%',
    '[2026-08-30 14:32:10] ERROR request failed after 1200ms',
    'Deployment completed successfully · https://example.com/logs',
  ].join('\r\n')
  previewTerminal.reset()
  previewTerminal.write(highlighter.highlightText(text))
  previewTerminal.blur()
}

const schedulePreview = () => {
  if (previewRenderFrame) cancelAnimationFrame(previewRenderFrame)
  nextTick(() => {
    previewRenderFrame = requestAnimationFrame(() => {
      previewRenderFrame = null
      renderPreview()
    })
  })
}

watch(() => $store.effectiveTerminalSettings.appearance, schedulePreview, { deep: true })
watch(rules, schedulePreview, { deep: true })
watch(enabled, schedulePreview)

onMounted(() => {
  loadSettings()
  previewTerminal = new Terminal({
    convertEol: true,
    disableStdin: true,
    cursorBlink: false,
    allowTransparency: true,
    theme: resolveTerminalTheme($store.effectiveTerminalSettings),
    fontFamily: $store.effectiveTerminalSettings.appearance.font.family,
    fontSize: Math.min($store.effectiveTerminalSettings.appearance.font.size, 15)
  })
  previewFitAddon = new FitAddon()
  previewTerminal.loadAddon(previewFitAddon)
  previewTerminal.open(previewRef.value)
  previewResizeObserver = new ResizeObserver(schedulePreview)
  previewResizeObserver.observe(previewRef.value)
  schedulePreview()
})

onBeforeUnmount(() => {
  if (previewRenderFrame) cancelAnimationFrame(previewRenderFrame)
  previewResizeObserver?.disconnect()
  previewTerminal?.dispose()
})
</script>

<style lang="scss" scoped>
.highlight_settings {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.highlight_toolbar,
.rule_header,
.preview_header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.highlight_toolbar {
  padding: 14px 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 9px;
  background: var(--el-fill-color-extra-light);

  &.compact { padding: 10px 16px; }
}

.setting_title { font-weight: 600; }
.setting_description,
.preview_header span,
.rule_header span { color: var(--el-text-color-secondary); font-size: 12px; }
.rule_header > div { display: flex; align-items: center; gap: 10px; }
.rule_actions { flex-wrap: wrap; justify-content: flex-end; }
.hidden_input { display: none; }

.rule_list {
  max-height: 300px;
  overflow: auto;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 9px;
}

.rule_item {
  min-height: 58px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  &:last-child { border-bottom: 0; }
}

.rule_swatch { width: 10px; height: 34px; flex: 0 0 10px; border-radius: 5px; }
.rule_summary { min-width: 0; flex: 1; }
.rule_name { margin-bottom: 4px; font-size: 13px; font-weight: 600; }
.rule_summary code { display: block; overflow: hidden; color: var(--el-text-color-secondary); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }

.highlight_preview {
  height: 136px;
  overflow: hidden;
  border: 1px solid var(--el-border-color);
  border-radius: 9px;
  background: #10151d;
  :deep(.xterm) { height: 100%; padding: 10px; }
}

.editor_grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.color_control { width: 100%; display: flex; align-items: center; gap: 8px; }
.color_control .el-select { flex: 1; }

@media (max-width: 720px) {
  .rule_header,
  .highlight_toolbar { align-items: flex-start; }
  .rule_header { flex-direction: column; }
  .rule_item { flex-wrap: wrap; }
  .rule_summary { flex-basis: calc(100% - 30px); }
  .editor_grid { grid-template-columns: 1fr; gap: 0; }
}
</style>
