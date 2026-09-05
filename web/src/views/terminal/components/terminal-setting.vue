<template>
  <div ref="workbenchRef" class="appearance_workbench">
    <div class="workbench_actions">
      <div class="draft_status">
        <span class="draft_status_dot" :class="{ dirty }" />
        <div>
          <strong>{{ dirty ? '正在预览未保存的外观' : '外观配置已同步' }}</strong>
          <span>修改会立即应用到当前终端，只有点击保存才会持久化。</span>
        </div>
      </div>
      <div class="action_buttons">
        <el-button :disabled="!dirty || saving" @click="resetDraft">取消修改</el-button>
        <el-button
          type="primary"
          :loading="saving"
          :disabled="!dirty"
          @click="saveAppearance"
        >
          保存外观
        </el-button>
      </div>
    </div>

    <el-tabs v-model="activeAppearanceSection" class="appearance_tabs" @tab-change="handleAppearanceSectionChange">
      <el-tab-pane name="theme">
        <template #label>
          <span class="appearance_tab_label"><el-icon><Brush /></el-icon>终端主题</span>
        </template>
        <section class="setting_section">
          <div class="section_header">
            <div>
              <h3>主题库</h3>
              <p>主题持续控制文字、光标、选区和 ANSI 16 色；启用工作区背景时，仅主题背景色会被覆盖。</p>
            </div>
            <el-button
              type="primary"
              plain
              :disabled="customThemes.length >= 50"
              @click="createCustomTheme"
            >
              新建主题
            </el-button>
          </div>

          <el-input
            v-model="themeSearch"
            class="theme_search"
            clearable
            placeholder="搜索主题名称"
          />
          <div class="theme_library">
            <div
              v-for="theme in filteredThemes"
              :key="theme.id"
              :class="['theme_card', { active: draftAppearance.activeThemeId === theme.id }]"
              role="button"
              tabindex="0"
              @click="selectTheme(theme.id)"
              @keydown.enter.self.prevent="selectTheme(theme.id)"
              @keydown.space.self.prevent="selectTheme(theme.id)"
            >
              <span
                class="theme_card_preview"
                :style="{ background: theme.colors.background || '#111827', color: theme.colors.foreground || '#f8fafc' }"
              >
                <i :style="{ background: theme.colors.red || '#ef4444' }" />
                <i :style="{ background: theme.colors.green || '#22c55e' }" />
                <i :style="{ background: theme.colors.blue || '#3b82f6' }" />
                <b>~/</b>
              </span>
              <span class="theme_card_body">
                <span class="theme_card_name">{{ theme.name }}</span>
                <small>{{ theme.builtin ? '内置主题' : '自定义主题' }}</small>
              </span>
              <span class="theme_card_trailing">
                <el-icon v-if="draftAppearance.activeThemeId === theme.id" class="selected_icon"><Check /></el-icon>
                <span v-if="!theme.builtin" class="theme_card_actions" @click.stop>
                  <el-button link type="primary" @click="editCustomTheme(theme)">编辑</el-button>
                  <el-button link type="danger" @click="deleteCustomTheme(theme)">删除</el-button>
                </span>
              </span>
            </div>
          </div>
        </section>
      </el-tab-pane>

      <el-tab-pane name="font">
        <template #label>
          <span class="appearance_tab_label"><el-icon><EditPen /></el-icon>字体与颜色</span>
        </template>
        <section class="setting_section compact_section">
          <div class="section_header">
            <div>
              <h3>基础样式</h3>
              <p>覆盖值留空时自动跟随当前终端主题。</p>
            </div>
          </div>

          <el-form label-position="top" class="appearance_form">
            <div class="form_block">
              <div class="form_block_title">字体</div>
              <div class="form_grid font_grid">
                <el-form-item label="字体族">
                  <el-select v-model="draftAppearance.font.family">
                    <el-option
                      v-for="font in commonFonts"
                      :key="font.value"
                      :label="font.label"
                      :value="font.value"
                    />
                  </el-select>
                </el-form-item>
                <el-form-item label="字号">
                  <el-input-number
                    v-model="draftAppearance.font.size"
                    :min="6"
                    :max="30"
                    controls-position="right"
                  />
                </el-form-item>
              </div>
            </div>

            <div class="form_block">
              <div class="form_block_title">主题覆盖</div>
              <div class="form_grid color_grid">
                <el-form-item label="默认前景色">
                  <div class="override_color">
                    <el-color-picker v-model="draftAppearance.overrides.foreground" show-alpha />
                    <span>{{ draftAppearance.overrides.foreground || '跟随主题' }}</span>
                    <el-button link @click="draftAppearance.overrides.foreground = null">重置</el-button>
                  </div>
                </el-form-item>
                <el-form-item label="光标色">
                  <div class="override_color">
                    <el-color-picker v-model="draftAppearance.overrides.cursor" show-alpha />
                    <span>{{ draftAppearance.overrides.cursor || '跟随主题' }}</span>
                    <el-button link @click="draftAppearance.overrides.cursor = null">重置</el-button>
                  </div>
                </el-form-item>
                <el-form-item label="选区背景色">
                  <div class="override_color">
                    <el-color-picker v-model="draftAppearance.overrides.selectionBackground" show-alpha />
                    <span>{{ draftAppearance.overrides.selectionBackground || '跟随主题' }}</span>
                    <el-button link @click="draftAppearance.overrides.selectionBackground = null">重置</el-button>
                  </div>
                </el-form-item>
              </div>
            </div>
          </el-form>
        </section>
      </el-tab-pane>

      <el-tab-pane name="background">
        <template #label>
          <span class="appearance_tab_label"><el-icon><Picture /></el-icon>工作区背景</span>
        </template>
        <section class="setting_section">
          <div class="section_header">
            <div>
              <h3>工作区背景</h3>
              <p>背景在普通标签、分屏和单窗口模式中连续铺设，不影响工具栏、AI 与 SFTP。</p>
            </div>
          </div>

          <div class="background_mode_grid">
            <button
              type="button"
              :class="['background_mode_card', { active: draftAppearance.background.mode === 'theme' }]"
              @click="selectBackgroundMode('theme')"
            >
              <span class="mode_visual theme_mode_visual" :style="terminalThemeBackgroundStyle">
                <i v-for="color in terminalThemeAccentColors" :key="color" :style="{ background: color }" />
              </span>
              <span class="mode_copy">
                <strong>主题底色</strong>
                <small>保持纯净，直接使用终端主题背景色。</small>
              </span>
              <el-icon v-if="draftAppearance.background.mode === 'theme'" class="selected_icon"><Check /></el-icon>
            </button>

            <button
              type="button"
              :class="['background_mode_card', { active: draftAppearance.background.mode === 'html' }]"
              @click="selectBackgroundMode('html')"
            >
              <span class="mode_visual html_mode_visual">
                <iframe
                  :srcdoc="selectedHtmlTheme.html"
                  sandbox=""
                  tabindex="-1"
                  title=""
                  aria-hidden="true"
                />
              </span>
              <span class="mode_copy">
                <strong>HTML 动态主题</strong>
                <small>使用内置、隔离且无网络依赖的动态背景。</small>
              </span>
              <el-icon v-if="draftAppearance.background.mode === 'html'" class="selected_icon"><Check /></el-icon>
            </button>

            <button
              type="button"
              :class="['background_mode_card', { active: draftAppearance.background.mode === 'image' }]"
              @click="selectImageMode"
            >
              <span class="mode_visual image_mode_visual" :style="imageBackgroundStyle">
                <el-icon v-if="!imagePreviewSource"><PictureFilled /></el-icon>
              </span>
              <span class="mode_copy">
                <strong>本地图片</strong>
                <small>PNG、JPEG 或 WebP，保存外观时才上传。</small>
              </span>
              <el-icon v-if="draftAppearance.background.mode === 'image'" class="selected_icon"><Check /></el-icon>
            </button>
          </div>
          <input
            ref="imageInputRef"
            class="hidden_file_input"
            type="file"
            accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
            @change="handleImageSelected"
          >

          <div v-if="draftAppearance.background.mode !== 'theme'" class="overlay_panel">
            <div class="overlay_copy">
              <strong>可读性遮罩</strong>
              <span>在工作区背景与终端文字之间增加遮罩，降低背景干扰。</span>
            </div>
            <div class="overlay_controls">
              <el-radio-group v-model="draftAppearance.background.overlay.tone" size="small">
                <el-radio-button value="auto">自动</el-radio-button>
                <el-radio-button value="dark">深色</el-radio-button>
                <el-radio-button value="light">浅色</el-radio-button>
              </el-radio-group>
              <div class="overlay_slider">
                <span>强度</span>
                <el-slider v-model="overlayPercent" :min="0" :max="85" />
                <b>{{ overlayPercent }}%</b>
              </div>
            </div>
          </div>

          <template v-if="draftAppearance.background.mode === 'html'">
            <div class="subsection_heading">
              <div>
                <h4>选择 HTML 主题</h4>
                <p>主题仅包含本地 HTML 与 CSS，并在沙箱中运行。</p>
              </div>
              <el-button
                type="primary"
                plain
                :disabled="customHtmlThemes.length >= 20"
                @click="createCustomHtmlTheme"
              >
                新建动态主题
              </el-button>
            </div>
            <div class="html_theme_grid">
              <div
                v-for="theme in allHtmlThemes"
                :key="theme.id"
                :class="['html_theme_card', { active: draftAppearance.background.htmlThemeId === theme.id }]"
                role="button"
                tabindex="0"
                @click="selectHtmlTheme(theme.id)"
                @keydown.enter.self.prevent="selectHtmlTheme(theme.id)"
                @keydown.space.self.prevent="selectHtmlTheme(theme.id)"
              >
                <span class="html_theme_visual">
                  <iframe
                    :srcdoc="theme.html"
                    sandbox=""
                    tabindex="-1"
                    title=""
                    aria-hidden="true"
                    loading="lazy"
                  />
                </span>
                <span class="html_theme_info">
                  <span>
                    <strong>{{ theme.name }}</strong>
                    <small>{{ theme.description }}</small>
                  </span>
                  <span class="html_theme_palette">
                    <i v-for="color in theme.accent" :key="color" :style="{ background: color }" />
                  </span>
                </span>
                <span v-if="!theme.builtin" class="html_theme_actions" @click.stop>
                  <el-button link type="primary" @click="editCustomHtmlTheme(theme)">编辑</el-button>
                  <el-button link type="danger" @click="deleteCustomHtmlTheme(theme)">删除</el-button>
                </span>
                <el-icon v-if="draftAppearance.background.htmlThemeId === theme.id" class="selected_icon"><Check /></el-icon>
              </div>
            </div>
          </template>

          <div v-if="draftAppearance.background.mode === 'image'" class="image_options_panel">
            <div class="image_options_preview" :style="imageBackgroundStyle" />
            <div class="image_options_body">
              <div>
                <strong>{{ pendingImageFile?.name || (draftAppearance.background.assetId ? '当前背景图片' : '尚未选择图片') }}</strong>
                <span>图片只应用于终端工作区，不覆盖工具栏、AI、SFTP 与状态区。</span>
              </div>
              <div class="image_option_fields">
                <label>
                  <span>适应方式</span>
                  <el-select v-model="draftAppearance.background.fit">
                    <el-option label="裁切铺满" value="cover" />
                    <el-option label="完整显示" value="contain" />
                    <el-option label="拉伸填充" value="fill" />
                  </el-select>
                </label>
                <label>
                  <span>对齐位置</span>
                  <el-select v-model="draftAppearance.background.position">
                    <el-option label="居中" value="center" />
                    <el-option label="顶部" value="top" />
                    <el-option label="底部" value="bottom" />
                    <el-option label="左侧" value="left" />
                    <el-option label="右侧" value="right" />
                  </el-select>
                </label>
              </div>
              <div class="image_option_actions">
                <el-button type="primary" plain @click="openImagePicker">{{ imagePreviewSource ? '更换图片' : '选择图片' }}</el-button>
                <el-button v-if="imagePreviewSource" @click="removeImageBackground">移除图片</el-button>
              </div>
            </div>
          </div>
        </section>
      </el-tab-pane>
    </el-tabs>

    <el-dialog
      v-model="showThemeEditor"
      :title="editingThemeIsNew ? '新建自定义主题' : '编辑自定义主题'"
      width="min(760px, 94vw)"
      append-to-body
      :close-on-click-modal="false"
      @closed="handleThemeEditorClosed"
    >
      <el-form v-if="editingTheme" label-position="top">
        <el-form-item label="主题名称">
          <el-input v-model="editingTheme.name" maxlength="40" show-word-limit />
        </el-form-item>
        <p class="editor_tip">颜色调整会立即同步到真实终端；关闭编辑器会恢复进入前的状态。</p>
        <div class="theme_color_editor">
          <label v-for="field in THEME_COLOR_FIELDS" :key="field">
            <span>{{ colorFieldLabels[field] || field }}</span>
            <el-color-picker v-model="editingTheme.colors[field]" show-alpha />
            <code>{{ editingTheme.colors[field] }}</code>
          </label>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="showThemeEditor = false">取消</el-button>
        <el-button type="primary" @click="saveCustomTheme">确认主题</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="showHtmlThemeEditor"
      :title="editingHtmlThemeIsNew ? '新建 HTML 动态主题' : '编辑 HTML 动态主题'"
      class="html_theme_editor_dialog"
      width="min(920px, 94vw)"
      append-to-body
      :close-on-click-modal="false"
      @closed="handleHtmlThemeEditorClosed"
    >
      <el-form v-if="editingHtmlTheme" label-position="top">
        <el-form-item label="主题名称">
          <el-input v-model="editingHtmlTheme.name" maxlength="40" show-word-limit />
        </el-form-item>
        <div class="html_editor_grid">
          <el-form-item label="HTML / CSS 源码">
            <el-input
              v-model="editingHtmlTheme.html"
              type="textarea"
              :rows="13"
              maxlength="30000"
              resize="vertical"
              spellcheck="false"
            />
          </el-form-item>
          <div class="html_editor_preview">
            <span>实时效果</span>
            <iframe
              :srcdoc="editingHtmlThemePreview"
              sandbox=""
              tabindex="-1"
              title="HTML 主题实时效果"
            />
          </div>
        </div>
        <p class="editor_tip html_editor_tip">允许本地 HTML、CSS 与动画；不允许脚本、嵌套页面、表单和任何远程资源。</p>
      </el-form>
      <template #footer>
        <el-button @click="showHtmlThemeEditor = false">取消</el-button>
        <el-button type="primary" @click="saveCustomHtmlTheme">确认主题</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { Brush, Check, EditPen, Picture, PictureFilled } from '@element-plus/icons-vue'
import {
  cloneTerminalSettings,
  createCustomHtmlThemeId,
  createCustomThemeId,
  DEFAULT_THEME_ID,
  EASY_NODE_CUSTOM_THEME_COLORS,
  getBuiltinThemes,
  resolveThemeEntity,
  THEME_COLOR_FIELDS
} from '@/utils/terminal-settings'
import {
  createSandboxedCustomHtmlTheme,
  DEFAULT_CUSTOM_HTML_THEME_SOURCE,
  DEFAULT_TERMINAL_HTML_THEME_ID,
  getTerminalHtmlThemes,
  getTerminalHtmlTheme,
  validateCustomHtmlThemeSource
} from '@/utils/terminal-html-themes'

const { proxy: { $api, $store, $message, $messageBox } } = getCurrentInstance()
const commonFonts = [
  { label: 'monospace', value: 'monospace' },
  { label: 'Courier New', value: 'Courier New, Courier, monospace' },
  { label: 'Consolas', value: 'Consolas, monospace' },
  { label: 'Monaco', value: 'Monaco, monospace' },
  { label: 'Menlo', value: 'Menlo, monospace' },
  { label: 'Cascadia Code', value: 'Cascadia Code, monospace' },
]
const colorFieldLabels = {
  foreground: '默认前景', background: '默认背景', cursor: '光标', cursorAccent: '光标文字',
  selectionBackground: '选区背景', selectionForeground: '选区文字', selectionInactiveBackground: '非活动选区'
}

const cloneAppearance = appearance => JSON.parse(JSON.stringify(appearance))
const builtinThemes = getBuiltinThemes()
const originalAppearance = ref(cloneTerminalSettings($store.terminalSettings).appearance)
const draftAppearance = ref(cloneTerminalSettings($store.terminalSettings).appearance)
const activeAppearanceSection = ref('theme')
const themeSearch = ref('')
const saving = ref(false)
const showThemeEditor = ref(false)
const editingTheme = ref(null)
const editingThemeIsNew = ref(false)
const themeEditorCommitted = ref(false)
let themeEditorAppearanceSnapshot = null
const showHtmlThemeEditor = ref(false)
const editingHtmlTheme = ref(null)
const editingHtmlThemeIsNew = ref(false)
const htmlThemeEditorCommitted = ref(false)
const imageInputRef = ref(null)
const workbenchRef = ref(null)
const pendingImageFile = ref(null)
const pendingImageUrl = ref('')
const savedImageUrl = ref('')
let htmlThemeEditorAppearanceSnapshot = null
let imageLoadSequence = 0

const customThemes = computed(() => draftAppearance.value.customThemes)
const customHtmlThemes = computed(() => draftAppearance.value.customHtmlThemes)
const allHtmlThemes = computed(() => getTerminalHtmlThemes(customHtmlThemes.value))
const allThemes = computed(() => [...customThemes.value.map(theme => ({ ...theme, builtin: false })), ...builtinThemes,])
const filteredThemes = computed(() => {
  const query = themeSearch.value.trim().toLocaleLowerCase()
  return query
    ? allThemes.value.filter(theme => theme.name.toLocaleLowerCase().includes(query))
    : allThemes.value
})
const draftSettings = computed(() => ({ version: 3, appearance: draftAppearance.value }))
const selectedTerminalTheme = computed(() => resolveThemeEntity(draftSettings.value))
const selectedHtmlTheme = computed(() => getTerminalHtmlTheme(
  draftAppearance.value.background.htmlThemeId || DEFAULT_TERMINAL_HTML_THEME_ID,
  customHtmlThemes.value
))
const terminalThemeBackgroundStyle = computed(() => ({
  background: selectedTerminalTheme.value.colors.background || '#10151d'
}))
const terminalThemeAccentColors = computed(() => [
  selectedTerminalTheme.value.colors.red || '#fb7185',
  selectedTerminalTheme.value.colors.green || '#86efac',
  selectedTerminalTheme.value.colors.blue || '#7dd3fc',
])
const dirty = computed(() => JSON.stringify(draftAppearance.value) !== JSON.stringify(originalAppearance.value))
const overlayPercent = computed({
  get: () => Math.round(draftAppearance.value.background.overlay.opacity * 100),
  set: value => { draftAppearance.value.background.overlay.opacity = value / 100 }
})
const editingHtmlThemePreview = computed(() => createSandboxedCustomHtmlTheme(editingHtmlTheme.value?.html || ''))
const imagePreviewSource = computed(() => pendingImageUrl.value || savedImageUrl.value)
const imageBackgroundStyle = computed(() => ({
  backgroundColor: selectedTerminalTheme.value.colors.background || '#10151d',
  backgroundImage: imagePreviewSource.value ? `url("${ imagePreviewSource.value }")` : 'none',
  backgroundPosition: draftAppearance.value.background.position,
  backgroundRepeat: 'no-repeat',
  backgroundSize: draftAppearance.value.background.fit === 'fill'
    ? '100% 100%'
    : draftAppearance.value.background.fit
}))

const handleAppearanceSectionChange = () => {
  nextTick(() => {
    workbenchRef.value?.closest('.terminal_setting_scroll')?.scrollTo({ top: 0 })
  })
}

const selectTheme = id => {
  draftAppearance.value.activeThemeId = id
  draftAppearance.value.overrides = { foreground: null, cursor: null, selectionBackground: null }
  draftAppearance.value.background.mode = 'theme'
}

const prepareThemeEditor = () => {
  themeEditorAppearanceSnapshot = cloneAppearance(draftAppearance.value)
  themeEditorCommitted.value = false
}

const createCustomTheme = () => {
  prepareThemeEditor()
  const theme = {
    id: createCustomThemeId(),
    name: `EasyNode 自定义 ${ customThemes.value.length + 1 }`,
    colors: cloneAppearance(EASY_NODE_CUSTOM_THEME_COLORS)
  }
  draftAppearance.value.customThemes.unshift(theme)
  selectTheme(theme.id)
  editingTheme.value = theme
  editingThemeIsNew.value = true
  showThemeEditor.value = true
}

const editCustomTheme = theme => {
  prepareThemeEditor()
  editingTheme.value = customThemes.value.find(item => item.id === theme.id)
  editingThemeIsNew.value = false
  selectTheme(theme.id)
  showThemeEditor.value = true
}

const saveCustomTheme = () => {
  const name = editingTheme.value?.name.trim()
  if (!name) return $message.warning('请输入主题名称')
  if (THEME_COLOR_FIELDS.some(field => !editingTheme.value.colors[field])) {
    return $message.warning('自定义主题的颜色项不能为空')
  }
  const duplicate = customThemes.value.some(theme => theme.id !== editingTheme.value.id && theme.name.toLocaleLowerCase() === name.toLocaleLowerCase())
  if (duplicate) return $message.warning('主题名称不能重复')
  editingTheme.value.name = name
  themeEditorCommitted.value = true
  showThemeEditor.value = false
}

const handleThemeEditorClosed = () => {
  if (!themeEditorCommitted.value && themeEditorAppearanceSnapshot) {
    draftAppearance.value = cloneAppearance(themeEditorAppearanceSnapshot)
  }
  themeEditorAppearanceSnapshot = null
  editingTheme.value = null
  editingThemeIsNew.value = false
  themeEditorCommitted.value = false
}

const prepareHtmlThemeEditor = () => {
  htmlThemeEditorAppearanceSnapshot = cloneAppearance(draftAppearance.value)
  htmlThemeEditorCommitted.value = false
}

const createCustomHtmlTheme = () => {
  prepareHtmlThemeEditor()
  const theme = {
    id: createCustomHtmlThemeId(),
    name: `自定义动态主题 ${ customHtmlThemes.value.length + 1 }`,
    html: DEFAULT_CUSTOM_HTML_THEME_SOURCE
  }
  draftAppearance.value.customHtmlThemes.unshift(theme)
  draftAppearance.value.background.mode = 'html'
  draftAppearance.value.background.htmlThemeId = theme.id
  editingHtmlTheme.value = theme
  editingHtmlThemeIsNew.value = true
  showHtmlThemeEditor.value = true
}

const editCustomHtmlTheme = theme => {
  prepareHtmlThemeEditor()
  editingHtmlTheme.value = customHtmlThemes.value.find(item => item.id === theme.id)
  editingHtmlThemeIsNew.value = false
  draftAppearance.value.background.mode = 'html'
  draftAppearance.value.background.htmlThemeId = theme.id
  showHtmlThemeEditor.value = true
}

const saveCustomHtmlTheme = () => {
  const name = editingHtmlTheme.value?.name.trim()
  if (!name) return $message.warning('请输入主题名称')
  const sourceError = validateCustomHtmlThemeSource(editingHtmlTheme.value?.html)
  if (sourceError) return $message.warning(sourceError)
  const duplicate = customHtmlThemes.value.some(theme => (
    theme.id !== editingHtmlTheme.value.id && theme.name.toLocaleLowerCase() === name.toLocaleLowerCase()
  ))
  if (duplicate) return $message.warning('HTML 主题名称不能重复')
  editingHtmlTheme.value.name = name
  htmlThemeEditorCommitted.value = true
  showHtmlThemeEditor.value = false
}

const handleHtmlThemeEditorClosed = () => {
  if (!htmlThemeEditorCommitted.value && htmlThemeEditorAppearanceSnapshot) {
    draftAppearance.value = cloneAppearance(htmlThemeEditorAppearanceSnapshot)
  }
  htmlThemeEditorAppearanceSnapshot = null
  editingHtmlTheme.value = null
  editingHtmlThemeIsNew.value = false
  htmlThemeEditorCommitted.value = false
}

const deleteCustomHtmlTheme = async theme => {
  try {
    await $messageBox.confirm(`确认删除 HTML 动态主题“${ theme.name }”？`, '删除主题', { type: 'warning' })
    draftAppearance.value.customHtmlThemes = customHtmlThemes.value.filter(item => item.id !== theme.id)
    if (draftAppearance.value.background.htmlThemeId === theme.id) {
      draftAppearance.value.background.htmlThemeId = DEFAULT_TERMINAL_HTML_THEME_ID
    }
  } catch (error) {
    if (error !== 'cancel') $message.error('删除 HTML 主题失败')
  }
}

const deleteCustomTheme = async theme => {
  try {
    await $messageBox.confirm(`确认删除自定义主题“${ theme.name }”？`, '删除主题', { type: 'warning' })
    draftAppearance.value.customThemes = customThemes.value.filter(item => item.id !== theme.id)
    if (draftAppearance.value.activeThemeId === theme.id) selectTheme(DEFAULT_THEME_ID)
  } catch (error) {
    if (error !== 'cancel') $message.error('删除主题失败')
  }
}

const selectBackgroundMode = mode => {
  draftAppearance.value.background.mode = mode
  if (mode === 'html' && !draftAppearance.value.background.htmlThemeId) {
    draftAppearance.value.background.htmlThemeId = DEFAULT_TERMINAL_HTML_THEME_ID
  }
}

const releasePendingImage = () => {
  if (pendingImageUrl.value) URL.revokeObjectURL(pendingImageUrl.value)
  pendingImageUrl.value = ''
  pendingImageFile.value = null
  if (draftAppearance.value.background) delete draftAppearance.value.background.previewUrl
}

const releaseSavedImage = () => {
  if (savedImageUrl.value) URL.revokeObjectURL(savedImageUrl.value)
  savedImageUrl.value = ''
}

const loadSavedImage = async assetId => {
  const sequence = ++imageLoadSequence
  releaseSavedImage()
  if (!assetId) return
  try {
    const blob = await $api.getTerminalBackground(assetId)
    if (sequence !== imageLoadSequence) return
    savedImageUrl.value = URL.createObjectURL(blob)
  } catch {
    savedImageUrl.value = ''
  }
}

const openImagePicker = () => imageInputRef.value?.click()

const selectImageMode = () => {
  if (!imagePreviewSource.value && !draftAppearance.value.background.assetId) return openImagePicker()
  draftAppearance.value.background.mode = 'image'
}

const handleImageSelected = event => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  const extension = file.name.slice(file.name.lastIndexOf('.')).toLocaleLowerCase()
  const allowedTypes = {
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp'
  }
  if (!allowedTypes[extension] || allowedTypes[extension] !== file.type) {
    return $message.warning('请选择有效的 PNG、JPEG 或 WebP 图片')
  }
  if (!file.size || file.size > 5 * 1024 * 1024) return $message.warning('图片大小必须在 5 MB 以内')

  releasePendingImage()
  pendingImageFile.value = file
  pendingImageUrl.value = URL.createObjectURL(file)
  draftAppearance.value.background.mode = 'image'
  draftAppearance.value.background.assetId = null
  draftAppearance.value.background.previewUrl = pendingImageUrl.value
}

const removeImageBackground = () => {
  releasePendingImage()
  draftAppearance.value.background.assetId = null
  draftAppearance.value.background.mode = 'theme'
}

const selectHtmlTheme = id => {
  draftAppearance.value.background.mode = 'html'
  draftAppearance.value.background.htmlThemeId = id
}

const resetDraft = () => {
  releasePendingImage()
  originalAppearance.value = cloneTerminalSettings($store.terminalSettings).appearance
  draftAppearance.value = cloneTerminalSettings($store.terminalSettings).appearance
  $store.clearTerminalAppearanceDraft()
}

const saveAppearance = async() => {
  saving.value = true
  try {
    const appearance = cloneAppearance(draftAppearance.value)
    delete appearance.background.previewUrl
    if (appearance.background.mode === 'image' && pendingImageFile.value) {
      const { data } = await $api.uploadTerminalBackground(pendingImageFile.value)
      appearance.background.assetId = data.assetId
    }
    if (appearance.background.mode === 'image' && !appearance.background.assetId) {
      throw new Error('请先选择背景图片')
    }
    await $store.setTerminalAppearance(appearance)
    releasePendingImage()
    originalAppearance.value = cloneTerminalSettings($store.terminalSettings).appearance
    draftAppearance.value = cloneTerminalSettings($store.terminalSettings).appearance
    $message.success('终端外观已保存')
  } catch (error) {
    $message.error(error.message || '终端外观保存失败')
  } finally {
    saving.value = false
  }
}

watch(draftAppearance, appearance => {
  $store.setTerminalAppearanceDraft(appearance)
}, { deep: true, immediate: true })

watch(
  () => draftAppearance.value.background.assetId,
  assetId => loadSavedImage(assetId),
  { immediate: true }
)

onBeforeUnmount(() => {
  imageLoadSequence += 1
  releasePendingImage()
  releaseSavedImage()
  $store.clearTerminalAppearanceDraft()
})
</script>

<style lang="scss" scoped>
.appearance_workbench { min-width: 0; padding-bottom: 20px; }

.workbench_actions {
  position: sticky;
  top: 0;
  z-index: 8;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 8px;
  padding: 13px 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  background: color-mix(in srgb, var(--el-bg-color) 94%, transparent);
  backdrop-filter: blur(14px);
}

.draft_status { display: flex; min-width: 0; align-items: center; gap: 11px; }
.draft_status > div { display: flex; min-width: 0; flex-direction: column; gap: 3px; }
.draft_status strong { font-size: 13px; font-weight: 600; }
.draft_status span:last-child { overflow: hidden; color: var(--el-text-color-secondary); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.draft_status_dot { width: 9px; height: 9px; flex: 0 0 9px; border-radius: 50%; background: var(--el-color-success); box-shadow: 0 0 0 4px var(--el-color-success-light-9); }
.draft_status_dot.dirty { background: var(--el-color-warning); box-shadow: 0 0 0 4px var(--el-color-warning-light-9); }
.action_buttons { display: flex; flex-shrink: 0; }

.appearance_tabs :deep(.el-tabs__header) { margin: 0 0 20px; }
.appearance_tabs :deep(.el-tabs__nav-scroll) { padding: 0 20px; }
.appearance_tabs :deep(.el-tabs__nav-wrap::after) { height: 1px; }
.appearance_tabs :deep(.el-tabs__item) { height: 50px; padding: 0 24px; }
.appearance_tab_label { display: inline-flex; align-items: center; gap: 7px; font-size: 14px; }

.setting_section { min-width: 0; padding: 4px; }
.compact_section { width: min(820px, 100%); }
.section_header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; margin-bottom: 18px; }
.section_header h3 { margin: 0 0 6px; font-size: 17px; }
.section_header p, .subsection_heading p { margin: 0; color: var(--el-text-color-secondary); font-size: 12px; line-height: 1.6; }
.theme_search { width: min(420px, 100%); margin-bottom: 14px; }

.theme_library { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; padding: 2px; }
.theme_card { position: relative; display: flex; min-width: 0; min-height: 72px; align-items: center; gap: 12px; padding: 9px 12px 9px 9px; border: 1px solid var(--el-border-color-lighter); border-radius: 10px; background: var(--el-bg-color); color: inherit; text-align: left; cursor: pointer; transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease; }
.theme_card:hover { border-color: var(--el-color-primary-light-5); transform: translateY(-1px); }
.theme_card.active { border-color: var(--el-color-primary); box-shadow: 0 0 0 1px var(--el-color-primary-light-7); }
.theme_card_preview { position: relative; width: 82px; height: 52px; flex: 0 0 82px; overflow: hidden; border-radius: 7px; box-shadow: inset 0 0 0 1px rgba(255,255,255,.08); }
.theme_card_preview i { position: absolute; bottom: 8px; width: 9px; height: 9px; border-radius: 50%; }
.theme_card_preview i:nth-child(1) { left: 9px; }
.theme_card_preview i:nth-child(2) { left: 22px; }
.theme_card_preview i:nth-child(3) { left: 35px; }
.theme_card_preview b { position: absolute; top: 8px; left: 9px; font: 600 11px/1 monospace; }
.theme_card_body { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 4px; }
.theme_card_name { overflow: hidden; font-size: 13px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.theme_card_body small { color: var(--el-text-color-secondary); }
.theme_card_trailing { display: flex; flex: 0 0 auto; align-items: center; gap: 8px; }
.theme_card_actions { display: flex; align-items: center; gap: 2px; padding-left: 8px; border-left: 1px solid var(--el-border-color-lighter); }
.theme_card_actions :deep(.el-button + .el-button) { margin-left: 0; }
.selected_icon { flex: 0 0 auto; color: var(--el-color-primary); font-size: 18px; }

.appearance_form { display: flex; flex-direction: column; gap: 16px; }
.form_block { padding: 18px; border: 1px solid var(--el-border-color-lighter); border-radius: 11px; background: var(--el-fill-color-extra-light); }
.form_block_title { margin-bottom: 15px; color: var(--el-text-color-primary); font-size: 14px; font-weight: 600; }
.form_grid { display: grid; gap: 16px; }
.font_grid { grid-template-columns: minmax(260px, 2fr) minmax(140px, 1fr); }
.color_grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.form_grid :deep(.el-form-item) { margin-bottom: 0; }
.override_color { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 8px; }
.override_color span { overflow: hidden; color: var(--el-text-color-secondary); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }

.background_mode_grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.background_mode_card { position: relative; display: grid; grid-template-columns: 126px minmax(0, 1fr) auto; align-items: center; gap: 14px; padding: 10px; border: 1px solid var(--el-border-color-lighter); border-radius: 12px; background: var(--el-bg-color); color: inherit; text-align: left; cursor: pointer; transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease; }
.background_mode_card:hover { border-color: var(--el-color-primary-light-5); transform: translateY(-1px); }
.background_mode_card.active { border-color: var(--el-color-primary); box-shadow: 0 0 0 1px var(--el-color-primary-light-7); }
.mode_visual { position: relative; display: block; width: 126px; height: 78px; overflow: hidden; border-radius: 8px; box-shadow: inset 0 0 0 1px rgba(255,255,255,.08); }
.theme_mode_visual i { position: absolute; bottom: 12px; width: 12px; height: 12px; border-radius: 50%; }
.theme_mode_visual i:nth-child(1) { left: 14px; }
.theme_mode_visual i:nth-child(2) { left: 32px; }
.theme_mode_visual i:nth-child(3) { left: 50px; }
.html_mode_visual iframe, .html_theme_visual iframe { width: 100%; height: 100%; border: 0; pointer-events: none; }
.image_mode_visual { display: flex; align-items: center; justify-content: center; background-position: center; background-repeat: no-repeat; color: var(--el-text-color-secondary); font-size: 28px; }
.mode_copy { display: flex; min-width: 0; flex-direction: column; gap: 6px; }
.mode_copy strong { font-size: 14px; }
.mode_copy small { color: var(--el-text-color-secondary); line-height: 1.5; }

.subsection_heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin: 28px 0 12px; }
.subsection_heading h4 { margin: 0 0 5px; font-size: 14px; }
.html_theme_grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.html_theme_card { position: relative; min-width: 0; overflow: hidden; padding: 0; border: 1px solid var(--el-border-color-lighter); border-radius: 12px; background: var(--el-bg-color); color: inherit; text-align: left; cursor: pointer; transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease; }
.html_theme_card:hover { border-color: var(--el-color-primary-light-5); transform: translateY(-1px); }
.html_theme_card.active { border-color: var(--el-color-primary); box-shadow: 0 0 0 1px var(--el-color-primary-light-7); }
.html_theme_card > .selected_icon { position: absolute; top: 10px; right: 10px; padding: 4px; border-radius: 50%; background: rgba(3,7,18,.72); color: #fff; }
.html_theme_visual { display: block; height: 96px; overflow: hidden; background: #070a12; }
.html_theme_info { display: flex; min-height: 48px; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 10px; }
.html_theme_info > span:first-child { display: flex; min-width: 0; flex-direction: column; gap: 4px; }
.html_theme_info strong { font-size: 13px; }
.html_theme_info small { overflow: hidden; color: var(--el-text-color-secondary); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.html_theme_palette { display: flex; flex-shrink: 0; gap: 4px; }
.html_theme_palette i { width: 8px; height: 8px; border-radius: 50%; }
.html_theme_actions { position: absolute; z-index: 2; top: 7px; left: 7px; display: flex; align-items: center; gap: 2px; padding: 3px 7px; border-radius: 7px; background: rgba(3,7,18,.78); backdrop-filter: blur(8px); }
.html_theme_actions :deep(.el-button + .el-button) { margin-left: 0; }

.hidden_file_input { display: none; }
.image_options_panel { display: grid; grid-template-columns: minmax(220px, .72fr) minmax(0, 1.28fr); gap: 18px; margin-top: 24px; padding: 16px; border: 1px solid var(--el-border-color-lighter); border-radius: 12px; background: var(--el-fill-color-extra-light); }
.image_options_preview { min-height: 180px; border-radius: 9px; background-color: #070a12; box-shadow: inset 0 0 0 1px rgba(255,255,255,.08); }
.image_options_body { display: flex; min-width: 0; flex-direction: column; justify-content: space-between; gap: 18px; }
.image_options_body > div:first-child { display: flex; flex-direction: column; gap: 6px; }
.image_options_body strong { font-size: 14px; }
.image_options_body span { color: var(--el-text-color-secondary); font-size: 12px; line-height: 1.5; }
.image_option_fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.image_option_fields label { display: flex; min-width: 0; flex-direction: column; gap: 7px; }
.image_option_actions { display: flex; align-items: center; }

.overlay_panel { display: grid; grid-template-columns: minmax(220px, 1fr) minmax(380px, 1.25fr); align-items: center; gap: 24px; margin-top: 18px; padding: 17px 18px; border: 1px solid var(--el-border-color-lighter); border-radius: 11px; background: var(--el-fill-color-extra-light); }
.overlay_copy { display: flex; flex-direction: column; gap: 5px; }
.overlay_copy strong { font-size: 14px; }
.overlay_copy span { color: var(--el-text-color-secondary); font-size: 12px; line-height: 1.5; }
.overlay_controls { display: flex; align-items: center; justify-content: flex-end; gap: 18px; }
.overlay_slider { display: grid; min-width: 235px; grid-template-columns: auto minmax(120px, 1fr) 38px; align-items: center; gap: 10px; color: var(--el-text-color-secondary); font-size: 12px; }
.overlay_slider b { color: var(--el-text-color-primary); text-align: right; }

.editor_tip { margin: -4px 0 14px; color: var(--el-text-color-secondary); font-size: 12px; }
.html_editor_tip { margin: 14px 0 0; line-height: 1.6; }
.theme_color_editor { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; max-height: 52vh; padding-right: 4px; overflow-y: auto; }
.theme_color_editor label { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 5px; padding: 9px; border: 1px solid var(--el-border-color-lighter); border-radius: 8px; }
.theme_color_editor label span { font-size: 12px; }
.theme_color_editor code { grid-column: 1 / -1; overflow: hidden; color: var(--el-text-color-secondary); font-size: 10px; text-overflow: ellipsis; }
.html_editor_grid { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(300px, .75fr); gap: 16px; }
.html_editor_grid :deep(.el-form-item) { margin-bottom: 0; }
.html_editor_grid :deep(textarea) { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 12px; line-height: 1.55; }
.html_editor_preview { display: flex; min-height: 330px; flex-direction: column; overflow: hidden; border: 1px solid var(--el-border-color-lighter); border-radius: 9px; background: #070a12; }
.html_editor_preview > span { padding: 9px 11px; border-bottom: 1px solid rgba(255,255,255,.1); color: #cbd5e1; font-size: 12px; }
.html_editor_preview iframe { width: 100%; min-height: 0; flex: 1; border: 0; }

@media (max-width: 1080px) {
  .color_grid { grid-template-columns: 1fr; }
  .background_mode_grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .html_theme_grid { grid-template-columns: 1fr; }
  .overlay_panel { grid-template-columns: 1fr; }
  .overlay_controls { justify-content: flex-start; }
  .html_editor_grid { grid-template-columns: 1fr; }
  .html_editor_preview { min-height: 260px; }
}

@media (max-width: 680px) {
  .workbench_actions { position: relative; align-items: stretch; flex-direction: column; }
  .action_buttons { justify-content: flex-end; }
  .draft_status span:last-child { white-space: normal; }
  .appearance_tabs :deep(.el-tabs__nav-scroll) { padding: 0 6px; }
  .appearance_tabs :deep(.el-tabs__item) { height: 44px; padding: 0 10px; }
  .appearance_tab_label { gap: 5px; font-size: 13px; }
  .theme_library, .font_grid, .theme_color_editor { grid-template-columns: 1fr; }
  .background_mode_grid, .image_options_panel, .image_option_fields { grid-template-columns: 1fr; }
  .background_mode_card { grid-template-columns: 98px minmax(0, 1fr) auto; }
  .mode_visual { width: 98px; height: 68px; }
  .overlay_controls { align-items: stretch; flex-direction: column; }
  .overlay_slider { min-width: 0; }
  .subsection_heading { align-items: stretch; flex-direction: column; }
}
</style>

<style lang="scss">
.html_theme_editor_dialog {
  .el-dialog__body {
    max-height: calc(100vh - 190px);
    overflow-y: auto;
    overscroll-behavior: contain;
  }
}
</style>
