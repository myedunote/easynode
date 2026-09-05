<template>
  <el-dialog
    v-model="visible"
    width="660px"
    :top="isMobile() ? '24px' : '6vh'"
    :append-to-body="false"
    class="management_dialog script_group_dialog"
    title="脚本分组管理"
    :close-on-click-modal="false"
  >
    <template #header>
      <div class="management_dialog_title">脚本分组管理</div>
    </template>
    <div class="group_container">
      <div class="management_toolbar" :class="{ 'is-ordering': orderMode }">
        <template v-if="orderMode">
          <div class="management_toolbar_hint">
            <el-icon><Rank /></el-icon>
            <span>拖动整行调整分组顺序</span>
          </div>
          <div class="management_toolbar_actions">
            <el-button @click="cancelOrder">取消</el-button>
            <el-button type="primary" @click="saveOrder">保存顺序</el-button>
          </div>
        </template>
        <template v-else>
          <span class="management_toolbar_summary">共 {{ list.length }} 个分组</span>
          <div class="management_toolbar_actions">
            <el-button
              :icon="Rank"
              :disabled="sortableGroupCount < 2"
              :title="sortableGroupCount < 2 ? '至少需要两个可排序分组' : '调整分组顺序'"
              @click="startOrder"
            >
              调整顺序
            </el-button>
            <el-button type="primary" :icon="Plus" @click="addGroup">添加分组</el-button>
          </div>
        </template>
      </div>
      <div class="group_table_wrap data_table_wrap">
        <el-table
          ref="tableRef"
          v-loading="loading"
          :data="list"
          row-key="id"
          :row-class-name="getGroupRowClass"
          empty-text="暂无分组"
        >
          <el-table-column
            v-if="orderMode"
            width="64"
            align="center"
            class-name="order-drag-column"
          >
            <template #default="{ row }">
              <el-icon v-if="row.id !== 'builtin'" class="order-drag-handle"><Rank /></el-icon>
              <el-icon v-else class="order-lock-icon" title="内置分组固定在末尾"><Lock /></el-icon>
            </template>
          </el-table-column>
          <el-table-column prop="name" label="分组名称" min-width="220">
            <template #default="{ row }">
              <div class="group_name_cell">
                <span>{{ row.name }}</span>
                <el-tag v-if="row.id === 'builtin'" size="small" effect="plain">固定</el-tag>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="脚本数量" width="130" align="center">
            <template #default="{ row }">
              <el-popover
                v-if="row.scripts.list.length !== 0"
                placement="left"
                :width="350"
                trigger="hover"
              >
                <template #reference>
                  <span class="script_count">{{ row.scripts.count }}</span>
                </template>
                <ul class="script_preview_list">
                  <li v-for="item in row.scripts.list" :key="item.id">
                    <strong>{{ item.name }}</strong>
                    <span>{{ item.description || '无描述' }}</span>
                  </li>
                </ul>
              </el-popover>
              <span v-else class="script_count">0</span>
            </template>
          </el-table-column>
          <el-table-column
            v-if="!orderMode"
            label="操作"
            fixed="right"
            width="126px"
            align="right"
            header-align="right"
          >
            <template #default="{ row }">
              <div v-if="row.id !== 'builtin'" class="group_row_actions">
                <el-button text type="primary" @click="handleChange(row)">编辑</el-button>
                <el-button
                  v-show="row.id !== 'default'"
                  text
                  type="danger"
                  @click="deleteGroup(row)"
                >
                  删除
                </el-button>
              </div>
              <span v-else>--</span>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <el-dialog
        v-model="groupFormVisible"
        width="420px"
        top="16vh"
        :title="isModify ? '编辑分组' : '添加分组'"
        class="management_dialog group_form_dialog"
        :close-on-click-modal="false"
        append-to-body
        @close="clearFormInfo"
      >
        <template #header>
          <div class="management_dialog_title">{{ isModify ? '编辑分组' : '添加分组' }}</div>
        </template>
        <el-form
          ref="updateFormRef"
          :model="groupForm"
          :rules="rules"
          :hide-required-asterisk="true"
          :show-message="false"
          class="management_form management_form_single"
        >
          <el-form-item prop="name">
            <el-input
              v-model="groupForm.name"
              clearable
              autofocus
              placeholder="输入分组名称"
              @keyup.enter="updateForm"
            />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="groupFormVisible = false">取消</el-button>
          <el-button type="primary" @click="updateForm">
            {{ isModify ? '保存修改' : '创建分组' }}
          </el-button>
        </template>
      </el-dialog>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, computed, getCurrentInstance, nextTick } from 'vue'
import { isMobile } from '@/utils'
import { Lock, Plus, Rank } from '@element-plus/icons-vue'
import useListOrder, { moveArrayItem } from '@/composables/useListOrder'

const props = defineProps({
  show: {
    required: true,
    type: Boolean
  }
})

const emit = defineEmits(['update:show', 'group-deleted',])

const visible = computed({
  get: () => props.show,
  set: (newVal) => emit('update:show', newVal)
})

const { proxy: { $api, $store, $message, $messageBox } } = getCurrentInstance()

const loading = ref(false)
const groupFormVisible = ref(false)
const isModify = ref(false)
const updateFormRef = ref()

const groupForm = ref({
  id: null,
  name: ''
})

const rules = {
  name: [{ required: true, message: '请输入分组名称', trigger: 'blur' },]
}

const scriptList = computed(() => $store.scriptList)
const groupList = computed(() => $store.scriptGroupList)
const sortableGroupCount = computed(() =>
  groupList.value.filter(group => group.id !== 'builtin').length)

const list = computed(() => {
  const groupById = new Map(groupList.value.map(group => [group.id, group,]))
  const groups = orderMode.value
    ? [
        ...orderDraft.value.map(id => groupById.get(id)).filter(Boolean),
        groupById.get('builtin')
      ].filter(Boolean)
    : groupList.value
  return groups.map(item => {
    const scripts = scriptList.value.reduce((prev, next) => {
      if (next.group === item.id) {
        prev.count++
        prev.list.push(next)
      }
      return prev
    }, { count: 0, list: [] })
    return { ...item, scripts }
  })
})

const getGroupRowClass = ({ row }) =>
  orderMode.value && row.id === 'builtin' ? 'is-order-locked' : ''

const addGroup = () => {
  groupForm.value.id = null
  groupFormVisible.value = true
  isModify.value = false
}

const handleChange = (row) => {
  Object.assign(groupForm.value, { ...row })
  groupFormVisible.value = true
  isModify.value = true
}

const updateForm = () => {
  updateFormRef.value.validate()
    .then(async () => {
      const { id, name } = groupForm.value
      if (isModify.value) {
        await $api.updateScriptGroup(id, { name })
      } else {
        await $api.addScriptGroup({ name })
      }
      await $store.getScriptCatalog()
      groupFormVisible.value = false
      $message.success('success')
    })
}

const clearFormInfo = () => {
  nextTick(() => updateFormRef.value.resetFields())
}

const deleteGroup = ({ id, name }) => {
  $messageBox.confirm(`确认删除分组：${ name } (分组下脚本将移动至默认分组)`, 'Warning', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(async () => {
      await $api.deleteScriptGroup(id)
      await $store.getScriptCatalog()
      emit('group-deleted', id)
      $message.success('success')
    })
}

const tableRef = ref(null)
const orderMode = ref(false)
const orderDraft = ref([])

const startOrder = () => {
  if (sortableGroupCount.value < 2) {
    return $message.info('至少需要两个可排序分组')
  }
  orderDraft.value = $store.scriptOrder.sections.map(({ groupId }) => groupId)
  orderMode.value = true
}

const cancelOrder = () => {
  orderMode.value = false
  orderDraft.value = []
}

const saveOrder = async () => {
  try {
    await $api.updateScriptOrder({
      revision: $store.scriptOrder.revision,
      changes: [{ scope: 'groups', orderedIds: orderDraft.value },]
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
  rootRef: tableRef,
  enabled: orderMode,
  draggable: 'tr:not(.is-order-locked)',
  onMove: (oldIndex, newIndex) => {
    moveArrayItem(orderDraft.value, oldIndex, newIndex)
  }
})
</script>

<style lang="scss" scoped>
.group_container {
  min-width: 0;
}

.group_table_wrap {
  margin-top: 14px;
}

.group_name_cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.order-lock-icon {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-placeholder);
  font-size: 16px;
}

:deep(.order-sortable-body tr.is-order-locked) {
  cursor: not-allowed;

  > td.el-table__cell {
    background: var(--el-fill-color-extra-light) !important;
  }
}

.script_count {
  display: inline-flex;
  min-width: 34px;
  height: 26px;
  padding: 0 10px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: color-mix(in srgb, var(--el-color-primary) 10%, transparent);
  color: var(--el-color-primary);
  font-weight: 700;
  text-align: center;
  cursor: pointer;
}

.group_row_actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 2px;

  .el-button {
    margin: 0;
    padding: 4px 6px;
  }
}

.script_preview_list {
  max-height: 260px;
  margin: 0;
  padding: 0;
  overflow: auto;
  list-style: none;

  li {
    display: grid;
    gap: 3px;
    padding: 8px 2px;
    border-bottom: 1px solid var(--el-border-color-lighter);

    &:last-child {
      border-bottom: 0;
    }

    span {
      color: var(--el-text-color-secondary);
      font-size: 12px;
    }
  }
}

</style>
