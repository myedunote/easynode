<template>
  <div class="scripts_container data_page">
    <div class="data_page_toolbar" :class="{ 'is-ordering': orderMode }">
      <template v-if="orderMode">
        <div class="order_status">
          <el-icon><Rank /></el-icon>
          <span>正在调整“{{ activeGroupName }}”内的脚本顺序</span>
        </div>
        <div class="toolbar_actions">
          <el-button @click="cancelOrder">取消</el-button>
          <el-button type="primary" @click="saveOrder">保存顺序</el-button>
        </div>
      </template>
      <template v-else>
        <el-input
          v-model="searchKeyword"
          placeholder="搜索名称、描述或指令内容"
          class="search_input"
          clearable
          spellcheck="false"
          @input="handleSearch"
          @keyup.esc="clearSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <div class="toolbar_actions">
          <el-button type="primary" :icon="Plus" @click="addScript">添加脚本</el-button>
          <el-dropdown trigger="click">
            <el-button
              class="compact_more_btn"
              :icon="MoreFilled"
              aria-label="更多操作"
              title="更多操作"
            />
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item :icon="Upload" :disabled="!isPlusActive" @click="importVisible = true">
                  导入脚本
                </el-dropdown-item>
                <el-dropdown-item :icon="Download" :disabled="!isPlusActive" @click="handleExport">
                  导出脚本
                </el-dropdown-item>
                <el-dropdown-item
                  :icon="FolderOpened"
                  :disabled="!isPlusActive"
                  divided
                  @click="ScriptGroupVisible = true"
                >
                  分组管理
                </el-dropdown-item>
                <el-dropdown-item :icon="Rank" :disabled="activeTab === 'builtin'" @click="startOrder">
                  调整顺序
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </template>
    </div>

    <Transition name="batch-toolbar">
      <div v-if="selectScripts.length && !orderMode" class="script_batch_toolbar">
        <span>已选择 <strong>{{ selectScripts.length }}</strong> 个脚本</span>
        <div>
          <el-button text type="danger" :icon="Delete" @click="handleBatchRemove">删除</el-button>
          <el-button text @click="clearScriptSelection">取消选择</el-button>
        </div>
      </div>
    </Transition>

    <el-tabs v-model="activeTab" class="script_tabs">
      <el-tab-pane
        v-for="group in groupList"
        :key="group.id"
        :label="group.name"
        :name="group.id"
        :disabled="orderMode && group.id !== activeTab"
      >
        <div class="script_table_wrap data_table_wrap">
          <el-table
            ref="scriptTableRefs"
            v-loading="loading"
            :data="getDisplayedScriptsByGroup(group.id)"
            row-key="id"
            empty-text="暂无脚本"
            @selection-change="handleSelectionChange"
          >
          <el-table-column
            v-if="orderMode"
            width="64"
            align="center"
            class-name="order-drag-column"
          >
            <template #default><el-icon class="order-drag-handle"><Rank /></el-icon></template>
          </el-table-column>
          <el-table-column
            v-if="!orderMode"
            type="selection"
            width="55"
            :selectable="row => !row.builtin"
          />
          <el-table-column prop="name" label="名称" min-width="180" />
          <el-table-column prop="description" label="描述" min-width="180" />
          <el-table-column prop="command" label="指令内容" show-overflow-tooltip />
          <el-table-column
            prop="useBase64"
            label="编码方式"
            width="140px"
            :formatter="formatExecutionMode"
          />
          <el-table-column
            v-if="!orderMode"
            label="操作"
            fixed="right"
            width="116px"
            align="right"
            header-align="right"
          >
            <template #default="{ row }">
              <div v-if="!row.builtin" class="script_row_actions">
                <el-button text type="primary" @click="handleChange(row)">编辑</el-button>
                <el-dropdown v-if="row.id !== 'own'" trigger="click">
                  <el-button
                    text
                    :icon="MoreFilled"
                    aria-label="更多操作"
                    title="更多操作"
                  />
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item :icon="Delete" @click="handleRemove(row)">
                        删除脚本
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
              <span v-else>--</span>
            </template>
          </el-table-column>
          </el-table>
        </div>

        <div v-if="!orderMode" class="pagination-container">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[20, 50, 100]"
            :total="getScriptsByGroup(group.id).length"
            layout="total, sizes, prev, pager, next"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </el-tab-pane>
    </el-tabs>

    <ScriptEdit
      v-model:show="formVisible"
      :default-data="currentScript"
      :default-group="activeTab"
      @success="handleEditSuccess"
    />

    <ImportScript
      v-model:show="importVisible"
      @update-list="() => $store.getScriptCatalog()"
    />

    <ScriptGroup
      v-model:show="ScriptGroupVisible"
      @group-deleted="handleGroupDeleted"
    />
  </div>
</template>

<script setup>
import { ref, computed, nextTick, getCurrentInstance, h, watch } from 'vue'
import ImportScript from './components/import-script.vue'
import {
  Delete,
  Download,
  FolderOpened,
  MoreFilled,
  Plus,
  Rank,
  Search,
  Upload
} from '@element-plus/icons-vue'
import { exportFile } from '@/utils'
import ScriptGroup from './components/script-group.vue'
import ScriptEdit from './components/script-edit.vue'
import useListOrder, { moveArrayItem } from '@/composables/useListOrder'

const { proxy: { $api, $message, $messageBox, $store, $tools } } = getCurrentInstance()

const loading = ref(false)
const formVisible = ref(false)
const selectScripts = ref([])
const handleSelectionChange = (val) => {
  selectScripts.value = val
}
const handleBatchRemove = () => {
  if (!selectScripts.value.length) return $message.warning('请选择要批量删除的脚本')
  let ids = selectScripts.value.map(item => item.id)
  let names = selectScripts.value.map(item => item.name)
  $messageBox.confirm(() => h('p', { style: 'line-height: 18px;' }, `确认删除\n${ names.join(', ') }吗?`), 'Warning', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    await $api.batchRemoveScript({ ids })
    await $store.getScriptCatalog()
    $message.success('success')
  })
}

const currentScript = ref({})

const scriptList = computed(() => $store.scriptList)
const isPlusActive = computed(() => $store.isPlusActive)

const groupList = computed(() => $store.scriptGroupList || [])

const addScript = () => {
  currentScript.value = {}
  formVisible.value = true
}

const handleChange = (row) => {
  currentScript.value = { ...row }
  formVisible.value = true
}

const handleRemove = ({ id, name }) => {
  $messageBox.confirm(`确认删除该脚本：${ name }`, 'Warning', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(async () => {
      await $api.deleteScript(id)
      await $store.getScriptCatalog()
      $message.success('success')
    })
}

const importVisible = ref(false)

const handleExport = () => {
  if (!scriptList.value.length) return $message.warning('暂无可导出的脚本')
  const fileName = `easynode-scripts-${ $tools.formatTimestamp(Date.now(), 'time', '.') }.json`
  const exportData = scriptList.value.filter(item => !item.builtin).map(item => {
    const record = { ...item }
    delete record.id
    delete record._id
    delete record.index
    delete record.builtin
    return record
  })
  exportFile(exportData, fileName, 'application/json')
}

const currentPage = ref(1)
const pageSize = ref(20)

const searchKeyword = ref('')

const filteredScriptList = computed(() => {
  const keyword = searchKeyword.value.trim().toLocaleLowerCase()
  if (!keyword) return scriptList.value

  return scriptList.value.filter(item => [item.name, item.description, item.command,]
    .some(value => String(value ?? '').toLocaleLowerCase().includes(keyword)))
})

const activeTab = ref(computed(() => groupList.value?.[0]?.id || 'default').value)
const activeGroupName = computed(() =>
  groupList.value.find(group => group.id === activeTab.value)?.name || '')

const getScriptsByGroup = groupId => filteredScriptList.value.filter(script => script.group === groupId)

const getDisplayedScriptsByGroup = (groupId) => {
  if (orderMode.value && groupId === activeTab.value) {
    const scriptById = new Map(scriptList.value.map(script => [script.id, script,]))
    return orderDraft.value.map(id => scriptById.get(id)).filter(Boolean)
  }
  const groupScripts = getScriptsByGroup(groupId)
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return groupScripts.slice(start, end)
}

const handleSizeChange = (val) => {
  pageSize.value = val
  currentPage.value = 1
}

const handleCurrentChange = (val) => {
  currentPage.value = val
}

const handleSearch = () => {
  currentPage.value = 1
}

const clearSearch = () => {
  searchKeyword.value = ''
  handleSearch()
}

const ScriptGroupVisible = ref(false)

const handleGroupDeleted = (deletedGroupId) => {
  if (deletedGroupId === activeTab.value) {
    nextTick(() => {
      activeTab.value = groupList.value?.[0]?.id || 'default'
    })
  }
}

watch(activeTab, () => {
  currentPage.value = 1
})

const handleEditSuccess = () => {
  currentScript.value = {}
}

const orderMode = ref(false)
const orderDraft = ref([])
const scriptTableRefs = ref([])
const currentTableRef = ref(null)

const clearScriptSelection = () => {
  scriptTableRefs.value.forEach(table => table?.clearSelection?.())
  selectScripts.value = []
}

const startOrder = () => {
  if (activeTab.value === 'builtin') return
  searchKeyword.value = ''
  const section = $store.scriptOrder.sections.find(item => item.groupId === activeTab.value)
  orderDraft.value = [...(section?.itemIds || []),]
  currentTableRef.value = scriptTableRefs.value[groupList.value.findIndex(group => group.id === activeTab.value)]
  orderMode.value = true
}

const cancelOrder = () => {
  orderMode.value = false
  orderDraft.value = []
  currentTableRef.value = null
}

const saveOrder = async () => {
  try {
    await $api.updateScriptOrder({
      revision: $store.scriptOrder.revision,
      changes: [{ scope: 'groupItems', groupId: activeTab.value, orderedIds: orderDraft.value },]
    })
    await $store.getScriptCatalog()
    cancelOrder()
    $message.success('顺序已保存')
  } catch (error) {
    cancelOrder()
    if (error.response?.status === 409) {
      await $store.getScriptCatalog()
      return $message.warning('顺序已被其他客户端修改，请重新调整')
    }
    $message.error('保存顺序失败')
  }
}

useListOrder({
  rootRef: currentTableRef,
  enabled: orderMode,
  onMove: (oldIndex, newIndex) => {
    moveArrayItem(orderDraft.value, oldIndex, newIndex)
  }
})

// 格式化编码方式显示
const formatExecutionMode = (row, column, cellValue) => {
  if (cellValue === true) {
    return 'Base64编码'
  }
  return '直接发送'
}

</script>

<style lang="scss" scoped>
.scripts_container {
  .data_page_toolbar.is-ordering {
    border-color: color-mix(in srgb, var(--el-color-primary) 34%, var(--el-border-color-light));
    background: color-mix(in srgb, var(--el-color-primary) 7%, transparent);
  }

  .search_input {
    width: clamp(260px, 34vw, 420px);

    :deep(.el-input__wrapper) {
      min-height: 36px;
      border-radius: 8px;
      background: var(--el-fill-color-blank);
      box-shadow: 0 0 0 1px var(--el-border-color) inset;
    }

    :deep(.el-input__wrapper.is-focus) {
      box-shadow: 0 0 0 1px var(--el-color-primary) inset;
    }
  }

  .order_status {
    display: flex;
    align-items: center;
    gap: 9px;
    color: var(--el-text-color-primary);
    font-weight: 600;

    .el-icon {
      color: var(--el-color-primary);
      font-size: 18px;
    }
  }

  .script_batch_toolbar {
    min-height: 46px;
    margin-top: 12px;
    padding: 0 12px 0 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border: 1px solid color-mix(in srgb, var(--el-color-primary) 24%, var(--el-border-color));
    border-radius: 8px;
    background: color-mix(in srgb, var(--el-color-primary) 5%, var(--el-bg-color));
    color: var(--el-text-color-regular);
  }
}

.script_tabs {
  min-height: 0;
  margin-top: 14px;
  flex: 1;

  :deep(.el-tabs__header) {
    margin: 0;
  }

  :deep(.el-tabs__nav-wrap::after) {
    height: 1px;
  }

  :deep(.el-tabs__item) {
    height: 42px;
    padding: 0 18px;
    font-weight: 600;
  }

  :deep(.el-tabs__content) {
    overflow: visible;
  }
}

.script_table_wrap {
  margin-top: 14px;
}

.script_row_actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 2px;

  .el-button {
    margin: 0;
    padding: 4px 6px;
  }
}

.pagination-container {
  margin-top: 14px;
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 768px) {
  .scripts_container {
    .search_input {
      width: min(100%, 320px);
    }

    .data_page_toolbar {
      align-items: stretch;
      flex-wrap: wrap;
      padding: 12px 0;
    }
  }
}

</style>
