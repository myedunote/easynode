<template>
  <el-dialog
    v-model="visible"
    title="终端设置"
    class="terminal_settings_dialog"
    :width="dialogWidth"
    :top="dialogTop"
    draggable
    overflow
    :close-on-click-modal="false"
    destroy-on-close
  >
    <div class="terminal_settings_container">
      <el-tabs
        v-model="activeTab"
        :tab-position="isMobileScreen ? 'top' : 'left'"
        class="terminal_settings_tabs"
        @tab-change="handleTabChange"
      >
        <el-tab-pane
          v-for="tab in settingTabs"
          :key="tab.name"
          :label="tab.label"
          :name="tab.name"
          :lazy="tab.lazy"
        >
          <div :ref="element => setSettingScrollRef(tab.name, element)" class="terminal_setting_scroll">
            <section class="terminal_setting_page">
              <header class="terminal_setting_page_header">
                <h2>{{ tab.title }}</h2>
                <p>{{ tab.description }}</p>
              </header>
              <div class="terminal_setting_page_content">
                <component :is="tab.component" />
              </div>
            </section>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import useMobileWidth from '@/composables/useMobileWidth'
import TerminalSetting from './terminal-setting.vue'
import TerminalHighlightSettings from './terminal-highlight-settings.vue'
import OtherSettings from './other-settings.vue'
import MenuOptions from './menu-options.vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:show',])
const { isMobileScreen } = useMobileWidth()
const activeTab = ref('basic')
const settingScrollRefs = {}

const settingTabs = [
  {
    label: '外观',
    name: 'basic',
    title: '终端外观',
    description: '调整终端主题、字体、颜色与背景。',
    component: TerminalSetting,
    lazy: false
  },
  {
    label: '高亮规则',
    name: 'highlight',
    title: '关键词高亮',
    description: '配置关键词高亮规则，并预览终端中的显示效果。',
    component: TerminalHighlightSettings,
    lazy: true
  },
  {
    label: '交互行为',
    name: 'other',
    title: '终端交互',
    description: '设置自动重连、脚本执行和右键菜单行为。',
    component: OtherSettings,
    lazy: true
  },
  {
    label: '菜单展示',
    name: 'menu',
    title: '顶部菜单',
    description: '控制实例与脚本库菜单的显示和分组方式。',
    component: MenuOptions,
    lazy: true
  },
]

const visible = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value)
})

const dialogWidth = computed(() => isMobileScreen.value ? '96%' : 'min(1240px, 96%)')
const dialogTop = computed(() => isMobileScreen.value ? '8px' : 'clamp(12px, 4vh, 48px)')

const setSettingScrollRef = (name, element) => {
  if (element) {
    settingScrollRefs[name] = element
  } else {
    delete settingScrollRefs[name]
  }
}

const handleTabChange = () => {
  nextTick(() => {
    settingScrollRefs[activeTab.value]?.scrollTo({ top: 0 })
  })
}
</script>

<style lang="scss" scoped>
.terminal_settings_container {
  display: flex;
  height: min(74vh, 740px);
  min-height: 0;
  overflow: hidden;
}

.terminal_settings_tabs {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex: 1;
  height: 100%;

  > :deep(.el-tabs__header.is-left) {
    width: 148px;
    flex: 0 0 148px;
    margin-right: 24px;
    padding: 8px;
    box-sizing: border-box;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 10px;
    background: var(--el-fill-color-extra-light);
  }

  > :deep(.el-tabs__header.is-left .el-tabs__nav),
  > :deep(.el-tabs__header.is-left .el-tabs__item) {
    width: 100%;
  }

  > :deep(.el-tabs__header.is-left .el-tabs__item) {
    justify-content: flex-start;
    height: 42px;
    margin: 2px 0;
    padding: 0 14px;
    border-radius: 7px;

    &:hover {
      background: var(--el-fill-color-light);
    }

    &.is-active {
      background: var(--el-color-primary-light-9);
    }
  }

  > :deep(.el-tabs__header .el-tabs__nav-wrap::after),
  > :deep(.el-tabs__header .el-tabs__active-bar) {
    display: none;
  }

  > :deep(.el-tabs__content) {
    position: relative;
    min-width: 0;
    min-height: 0;
    flex: 1;
    height: 100%;
    box-sizing: border-box;
    overflow: hidden;
  }

  > :deep(.el-tabs__content > .el-tab-pane) {
    height: 100%;
    min-height: 0;
  }
}

.terminal_setting_scroll {
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
  padding: 0 8px 48px 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scroll-padding-bottom: 48px;
  scrollbar-gutter: stable;
}

.terminal_setting_scroll::-webkit-scrollbar { width: 8px; }

.terminal_setting_scroll::-webkit-scrollbar-thumb {
  border-radius: 8px;
  background: var(--el-border-color);
}

.terminal_setting_page {
  min-width: 0;
  padding: 2px 0 20px;
}

.terminal_setting_page_header {
  margin-bottom: 18px;

  h2 {
    margin: 0 0 6px;
    color: var(--el-text-color-primary);
    font-size: 22px;
    font-weight: 600;
    line-height: 1.4;
  }

  p {
    margin: 0;
    color: var(--el-text-color-secondary);
    font-size: 13px;
    line-height: 1.6;
  }
}

.terminal_setting_page_content {
  min-width: 0;
  padding: 24px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  background: var(--el-bg-color);
  box-shadow: var(--el-box-shadow-lighter);

  :deep(.el-form) {
    max-width: 100%;
  }
}

@media (max-width: 968px) {
  .terminal_settings_container {
    height: 70vh;
    min-height: 0;
  }

  .terminal_settings_tabs {
    display: flex;
    flex-direction: column;

    > :deep(.el-tabs__header.is-top) {
      flex-shrink: 0;
      margin: 0 0 12px;
      padding: 4px 8px;
      border: 1px solid var(--el-border-color-lighter);
      border-radius: 9px;
      background: var(--el-fill-color-extra-light);
    }

    > :deep(.el-tabs__header.is-top .el-tabs__item) {
      height: 40px;
      padding: 0 14px;
      border-radius: 6px;

      &.is-active {
        background: var(--el-color-primary-light-9);
      }
    }

    > :deep(.el-tabs__content) {
      flex: 1;
      min-height: 0;
    }
  }

  .terminal_setting_scroll { padding-right: 0; }

  .terminal_setting_page_header h2 {
    font-size: 20px;
  }

  .terminal_setting_page_content {
    padding: 18px 16px;
    border-radius: 8px;
  }
}
</style>

<style lang="scss">
.terminal_settings_dialog {
  max-width: calc(100vw - 24px);

  .el-dialog__header {
    margin-right: 0;
    padding-bottom: 14px;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  .el-dialog__body {
    min-height: 0;
    padding: 20px;
    overflow: hidden;
  }

  .el-dialog__footer {
    padding-top: 14px;
    border-top: 1px solid var(--el-border-color-lighter);
  }
}
</style>
