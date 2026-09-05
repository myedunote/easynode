<template>
  <el-dialog
    v-model="visible"
    width="600px"
    append-to-body
    class="management_dialog list_settings_dialog"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <template #header>
      <div class="management_dialog_title">
        <strong>列表设置</strong>
      </div>
    </template>
    <el-tabs v-model="activeTab" class="settings_tabs">
      <!-- 表头设置 Tab -->
      <el-tab-pane label="表头设置" name="columns">
        <div class="settings_section_heading">
          <strong>显示字段</strong>
          <span>选择实例列表中需要展示的信息</span>
        </div>
        <div class="column_settings">
          <div
            v-for="(item, key) in columnConfig"
            :key="key"
            class="column_item"
            :class="{
              active: localColumnSettings[key],
              disabled: item.disabled
            }"
          >
            <el-checkbox
              v-model="localColumnSettings[key]"
              :disabled="item.disabled"
            >
              {{ item.label }}
            </el-checkbox>
          </div>
        </div>
      </el-tab-pane>

      <!-- 展现形式 Tab -->
      <el-tab-pane label="展现形式" name="display">
        <div class="settings_section_heading">
          <strong>列表布局</strong>
          <span>选择按分组折叠或在单一列表中展示</span>
        </div>
        <div class="display_settings">
          <div class="display_mode_cards">
            <div
              class="display_mode_card"
              :class="{ active: localDisplayMode === 'group' }"
              @click="localDisplayMode = 'group'"
            >
              <span class="card_icon"><el-icon><Collection /></el-icon></span>
              <div class="card_content">
                <div class="card_title">分组展示</div>
                <div class="card_description">按照分组折叠展示主机列表</div>
              </div>
              <div class="card_check">
                <el-icon v-if="localDisplayMode === 'group'" class="check_icon">
                  <CircleCheckFilled />
                </el-icon>
              </div>
            </div>

            <div
              class="display_mode_card"
              :class="{ active: localDisplayMode === 'list' }"
              @click="localDisplayMode = 'list'"
            >
              <span class="card_icon"><el-icon><Tickets /></el-icon></span>
              <div class="card_content">
                <div class="card_title">列表展示</div>
                <div class="card_description">在一个列表中展示所有主机</div>
              </div>
              <div class="card_check">
                <el-icon v-if="localDisplayMode === 'list'" class="check_icon">
                  <CircleCheckFilled />
                </el-icon>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <template #footer>
      <div class="management_dialog_actions">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleConfirm">保存设置</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { CircleCheckFilled, Collection, Tickets } from '@element-plus/icons-vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  columnConfig: {
    type: Object,
    required: true
  },
  columnSettings: {
    type: Object,
    required: true
  },
  displayMode: {
    type: String,
    default: 'group'
  }
})

const emit = defineEmits(['update:show', 'confirm',])

const visible = computed({
  get: () => props.show,
  set: (val) => emit('update:show', val)
})

const activeTab = ref('columns')
const localColumnSettings = ref({ ...props.columnSettings })
const localDisplayMode = ref(props.displayMode)

// 监听props变化，更新本地状态
watch(() => props.columnSettings, (newVal) => {
  localColumnSettings.value = { ...newVal }
}, { deep: true })

watch(() => props.displayMode, (newVal) => {
  localDisplayMode.value = newVal
})

// 重置弹窗状态
watch(() => props.show, (newVal) => {
  if (newVal) {
    localColumnSettings.value = { ...props.columnSettings }
    localDisplayMode.value = props.displayMode
    activeTab.value = 'columns'
  }
})

// 关闭弹窗
const handleClose = () => {
  visible.value = false
}

// 确认设置
const handleConfirm = () => {
  emit('confirm', {
    columnSettings: localColumnSettings.value,
    displayMode: localDisplayMode.value
  })
  visible.value = false
}
</script>

<style lang="scss" scoped>
.settings_tabs {
  :deep(.el-tabs__header) {
    margin: 0 0 20px;
    padding: 4px;
    border: 1px solid var(--el-border-color);
    border-radius: 9px;
    background: var(--el-fill-color-light);
  }

  :deep(.el-tabs__nav-wrap::after),
  :deep(.el-tabs__active-bar) {
    display: none;
  }

  :deep(.el-tabs__nav) {
    width: 100%;
    border: 0;
  }

  :deep(.el-tabs__item) {
    width: 50%;
    height: 38px;
    justify-content: center;
    color: var(--el-text-color-secondary);
    border-radius: 7px;
    transition: color .18s ease, background-color .18s ease, box-shadow .18s ease;
  }

  :deep(.el-tabs__item:not(.is-active):hover) {
    color: var(--el-text-color-regular);
    background: var(--el-fill-color);
  }

  :deep(.el-tabs__item.is-active) {
    color: var(--el-color-primary);
    font-weight: 600;
    background: color-mix(in srgb, var(--el-color-primary) 14%, var(--el-bg-color-overlay));
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, var(--el-color-primary) 38%, transparent),
      0 1px 3px rgb(0 0 0 / 14%);
  }
}

.settings_section_heading {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 14px;

  strong {
    color: var(--el-text-color-primary);
    font-size: 14px;
    font-weight: 600;
  }

  span {
    color: var(--el-text-color-secondary);
    font-size: 12px;
  }
}

.column_settings {
  max-height: 400px;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;

  .column_item {
    min-width: 0;
    padding: 11px 12px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    background: var(--el-fill-color-extra-light);
    transition: border-color .18s ease, background-color .18s ease;

    &.active {
      border-color: var(--el-color-primary-light-7);
      background: var(--el-color-primary-light-9);
    }

    &.disabled {
      opacity: .72;
    }

    :deep(.el-checkbox) {
      width: 100%;
      height: auto;
      margin-right: 0;
    }
  }
}

.display_settings {
  .display_mode_cards {
    display: flex;
    flex-direction: column;
    gap: 12px;

    .display_mode_card {
      display: flex;
      align-items: center;
      gap: 13px;
      min-height: 74px;
      padding: 14px 16px;
      border: 1px solid var(--el-border-color-lighter);
      border-radius: 10px;
      background: var(--el-fill-color-extra-light);
      cursor: pointer;
      transition: border-color .18s ease, background-color .18s ease;

      &:hover {
        border-color: var(--el-color-primary-light-5);
      }

      &.active {
        border-color: var(--el-color-primary);
        background: var(--el-color-primary-light-9);

        .card_icon {
          color: var(--el-color-primary);
        }

        .card_title {
          color: var(--el-color-primary);
        }
      }

      .card_icon {
        width: 40px;
        height: 40px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--el-text-color-secondary);
        font-size: 19px;
        background: var(--el-bg-color);
        border: 1px solid var(--el-border-color-lighter);
        border-radius: 9px;
      }

      .card_content {
        flex: 1;

        .card_title {
          font-size: 15px;
          font-weight: 600;
          color: var(--el-text-color-primary);
          margin-bottom: 4px;
        }

        .card_description {
          font-size: 13px;
          color: var(--el-text-color-secondary);
        }
      }

      .card_check {
        flex-shrink: 0;
        margin-left: 12px;

        .check_icon {
          font-size: 22px;
          color: var(--el-color-primary);
        }
      }
    }
  }
}

@media (max-width: 520px) {
  .column_settings {
    grid-template-columns: 1fr;
  }

  .display_settings .display_mode_cards .display_mode_card {
    padding: 13px;
  }
}
</style>
