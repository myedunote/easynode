<template>
  <el-dialog
    v-model="visible"
    width="640px"
    :top="isMobile() ? '24px' : '10vh'"
    :append-to-body="false"
    class="management_dialog group_management_dialog"
    title="实例分组管理"
    :close-on-click-modal="false"
  >
    <template #header>
      <div class="management_dialog_title">
        <strong>实例分组管理</strong>
      </div>
    </template>
    <div class="group_container">
      <div class="management_toolbar" :class="{ 'is-ordering': orderMode }">
        <template v-if="orderMode">
          <div class="management_toolbar_hint">
            <el-icon><Rank /></el-icon>
            <span>拖动任意分组行调整顺序</span>
          </div>
          <div class="management_toolbar_actions">
            <el-button @click="cancelOrder">取消</el-button>
            <el-button type="primary" @click="saveOrder">保存顺序</el-button>
          </div>
        </template>
        <template v-else>
          <span class="management_toolbar_summary">共 <strong>{{ list.length }}</strong> 个分组</span>
          <div class="management_toolbar_actions">
            <el-button :icon="Rank" @click="startOrder">调整顺序</el-button>
            <el-button type="primary" :icon="Plus" @click="addGroup">添加分组</el-button>
          </div>
        </template>
      </div>
      <div class="group_table_wrap">
        <el-table
          ref="tableRef"
          v-loading="loading"
          :data="list"
          row-key="id"
        >
          <el-table-column
            v-if="orderMode"
            width="64"
            align="center"
            class-name="order-drag-column"
          >
            <template #default><el-icon class="order-drag-handle"><Rank /></el-icon></template>
          </el-table-column>
          <el-table-column prop="name" label="分组名称" min-width="180">
            <template #default="{ row }">
              <div class="group_name_cell">
                <span>{{ row.name }}</span>
                <el-tag v-if="row.id === 'default'" size="small" effect="plain">默认</el-tag>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="实例数量" width="120" align="center">
            <template #default="{ row }">
              <el-popover
                v-if="row.hosts.list.length !== 0"
                placement="left"
                :width="350"
                trigger="hover"
              >
                <template #reference>
                  <span class="host_count">{{ row.hosts.count }}</span>
                </template>
                <ul class="group_host_list">
                  <li v-for="item in row.hosts.list" :key="item.id">
                    <span>{{ item.name }}</span>
                    <small>{{ item.host }}</small>
                  </li>
                </ul>
              </el-popover>
              <span v-else class="host_count is-empty">0</span>
            </template>
          </el-table-column>
          <el-table-column
            v-if="!orderMode"
            label="操作"
            fixed="right"
            width="104px"
            align="right"
            header-align="right"
          >
            <template #default="{ row }">
              <div class="row_actions">
                <el-button
                  text
                  type="primary"
                  @click="handleChange(row)"
                >
                  编辑
                </el-button>
                <el-button
                  v-show="row.id !== 'default'"
                  text
                  type="danger"
                  @click="deleteGroup(row)"
                >
                  删除
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <el-dialog
        v-model="groupFormVisible"
        width="420px"
        :top="isMobile() ? '80px' : '18vh'"
        append-to-body
        class="management_dialog group_form_dialog"
        :title="isModify ? '修改分组' : '添加分组'"
        :close-on-click-modal="false"
        @close="clearFormInfo"
      >
        <template #header>
          <div class="management_dialog_title">
            <strong>{{ isModify ? '修改分组' : '添加分组' }}</strong>
          </div>
        </template>
        <el-form
          ref="updateFormRef"
          :model="groupForm"
          :rules="rules"
          :hide-required-asterisk="true"
          :show-message="false"
          class="management_form management_form_single"
        >
          <el-form-item prop="name" class="group_name_field">
            <el-input
              v-model="groupForm.name"
              clearable
              autofocus
              placeholder="输入清晰易识别的分组名称"
              autocomplete="off"
            />
          </el-form-item>
        </el-form>
        <template #footer>
          <div class="management_dialog_actions">
            <el-button @click="groupFormVisible = false">取消</el-button>
            <el-button type="primary" @click="updateForm">{{ isModify ? '保存修改' : '创建分组' }}</el-button>
          </div>
        </template>
      </el-dialog>
    </div>
  </el-dialog>
</template>

<script setup>
import { isMobile } from '@/utils'
import { ref, reactive, computed, nextTick, getCurrentInstance } from 'vue'
import { Plus, Rank } from '@element-plus/icons-vue'
import useListOrder, { moveArrayItem } from '@/composables/useListOrder'

const { proxy: { $api, $message, $messageBox, $store } } = getCurrentInstance()

const props = defineProps({
  show: {
    required: true,
    type: Boolean
  }
})

const emit = defineEmits(['update:show',])

const visible = computed({
  get: () => props.show,
  set: (newVal) => emit('update:show', newVal)
})

const loading = ref(false)
const groupFormVisible = ref(false)
let isModify = ref(false)
const groupForm = reactive({
  id: null,
  name: ''
})

const rules = computed(() => {
  return {
    name: { required: true, message: '需输入分组名称', trigger: 'change' }
  }
})

const updateFormRef = ref(null)

let groupList = computed(() => $store.groupList || [])
const hostList = computed(() => $store.hostList)

const list = computed(() => {
  const groupById = new Map(groupList.value.map(group => [group.id, group,]))
  const groups = orderMode.value
    ? orderDraft.value.map(id => groupById.get(id)).filter(Boolean)
    : groupList.value
  return groups.map(item => {
    const hosts = hostList.value.reduce((prev, next) => {
      if (next.group === item.id) {
        prev.count++
        prev.list.push(next)
      }
      return prev
    }, { count: 0, list: [] })
    return { ...item, hosts }
  })
})

let addGroup = () => {
  groupForm.id = null
  groupFormVisible.value = true
  isModify.value = false
}

const handleChange = (row) => {
  Object.assign(groupForm, { ...row })
  groupFormVisible.value = true
  isModify.value = true
}

const updateForm = () => {
  updateFormRef.value.validate()
    .then(async () => {
      const { id, name } = groupForm
      if (isModify.value) {
        await $api.updateGroup(id, { name })
      } else {
        await $api.addGroup({ name })
      }
      await $store.getHostCatalog()
      groupFormVisible.value = false
      $message.success('success')
    })
}

const clearFormInfo = () => {
  nextTick(() => updateFormRef.value.resetFields())
}

const deleteGroup = ({ id, name }) => {
  $messageBox.confirm(`确认删除分组：${ name } (分组下实例将移动至默认分组)`, 'Warning', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(async () => {
      await $api.deleteGroup(id)
      await $store.getHostCatalog()
      $message.success('success')
    })
}

const tableRef = ref(null)
const orderMode = ref(false)
const orderDraft = ref([])

const startOrder = () => {
  orderDraft.value = $store.hostOrder.sections.map(({ groupId }) => groupId)
  orderMode.value = true
}

const cancelOrder = () => {
  orderMode.value = false
  orderDraft.value = []
}

const saveOrder = async () => {
  try {
    await $api.updateHostOrder({
      revision: $store.hostOrder.revision,
      changes: [{ scope: 'groups', orderedIds: orderDraft.value },]
    })
    await $store.getHostCatalog()
    cancelOrder()
    $message.success('顺序已保存')
  } catch (error) {
    cancelOrder()
    if (error.response?.status === 409) {
      await $store.getHostCatalog()
      return $message.warning('顺序已被其他客户端修改，请重新调整')
    }
    $message.error('保存顺序失败')
  }
}

useListOrder({
  rootRef: tableRef,
  enabled: orderMode,
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
  overflow: hidden;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;

  :deep(.el-table) {
    --el-table-header-bg-color: var(--el-fill-color-light);
    --el-table-row-hover-bg-color: var(--el-fill-color-light);
  }

  :deep(.el-table th.el-table__cell) {
    height: 44px;
    color: var(--el-text-color-secondary);
    font-weight: 600;
  }

  :deep(.el-table__inner-wrapper::before) {
    display: none;
  }
}

.group_name_cell {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--el-text-color-primary);
  font-weight: 600;
}

.host_count {
  min-width: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 9px;
  color: var(--el-color-primary);
  font-size: 12px;
  font-weight: 600;
  line-height: 18px;
  text-align: center;
  background: var(--el-color-primary-light-9);
  border-radius: 11px;
  cursor: pointer;

  &.is-empty {
    color: var(--el-text-color-secondary);
    background: var(--el-fill-color);
    cursor: default;
  }
}

.row_actions {
  display: flex;
  justify-content: flex-end;
  gap: 0;

  :deep(.el-button + .el-button) {
    margin-left: 0;
  }
}

.row_actions :deep(.el-button) {
  padding: 4px 5px;
}

.group_host_list {
  max-height: 240px;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;

  li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 7px 2px;
    border-bottom: 1px solid var(--el-border-color-lighter);

    &:last-child {
      border-bottom: 0;
    }

    small {
      color: var(--el-text-color-secondary);
    }
  }
}

</style>
