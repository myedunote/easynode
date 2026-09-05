<template>
  <div class="onekey_container data_page">
    <div class="data_page_toolbar">
      <span class="data_page_summary">共 {{ recordList.length }} 条执行记录</span>
      <div class="toolbar_actions">
        <el-button
          type="primary"
          :icon="Promotion"
          :disabled="isExecuting"
          :loading="isExecuting"
          @click="addOnekey"
        >
          {{ isExecuting ? `执行中，剩余 ${ timeRemaining } 秒` : '执行指令' }}
        </el-button>
        <el-dropdown v-if="recordList.length" trigger="click">
          <el-button
            class="compact_more_btn"
            :icon="MoreFilled"
            aria-label="更多操作"
            title="更多操作"
          />
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item :icon="Delete" :disabled="isExecuting" @click="handleRemoveAll">
                删除全部记录
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>
    <div class="onekey_table_wrap data_table_wrap">
      <el-table
        v-loading="loading"
        :data="tableData"
        :row-key="getRecordKey"
        :expand-row-keys="expandRows"
        empty-text="暂无执行记录"
      >
        <el-table-column type="expand" width="48">
          <template #default="{ row }">
            <div class="detail_content_box">{{ row.result || '暂无输出' }}</div>
          </template>
        </el-table-column>
        <el-table-column
          prop="name"
          label="实例"
          show-overflow-tooltip
          min-width="190px"
        >
          <template #default="{ row }">
            <div class="instance_cell">
              <strong>{{ row.name }}</strong>
              <small>{{ row.host }}:{{ row.port }}</small>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          prop="command"
          label="指令"
          show-overflow-tooltip
          min-width="220px"
        >
          <template #default="{ row }">
            <code class="command_cell">{{ row.command }}</code>
          </template>
        </el-table-column>
        <el-table-column
          prop="startDate"
          label="开始时间"
          show-overflow-tooltip
          min-width="170px"
        >
          <template #default="{ row }">
            <span>{{ $tools.formatTimestamp(row.startDate) }}</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="endDate"
          label="结束时间"
          show-overflow-tooltip
          min-width="170px"
        >
          <template #default="{ row }">
            <span>{{ row.endDate ? $tools.formatTimestamp(row.endDate) : '--' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="执行结果" min-width="110px">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" effect="light" round>
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          fixed="right"
          width="76px"
          align="right"
          header-align="right"
        >
          <template #default="{ row }">
            <el-button
              v-if="!row.pending && row.id !== 'own'"
              :loading="row.loading"
              text
              type="danger"
              @click="handleRemove([row.id])"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
    <el-dialog
      v-model="formVisible"
      width="600px"
      top="6vh"
      class="management_dialog onekey_form_dialog"
      title="批量下发指令"
      :close-on-click-modal="false"
      @close="clearFormInfo"
    >
      <template #header>
        <div class="management_dialog_title">批量下发指令</div>
      </template>
      <el-form
        ref="updateFormRef"
        :model="formData"
        :rules="rules"
        :hide-required-asterisk="true"
        label-position="top"
        :show-message="false"
        class="management_form"
      >
        <el-form-item label="实例" prop="hostIds">
          <div class="select_host_wrap">
            <el-select
              v-model="formData.hostIds"
              :teleported="false"
              multiple
              placeholder="选择要执行指令的实例"
              class="select"
              clearable
              tag-type="primary"
            >
              <template #header>
                <el-checkbox
                  v-model="checkAll"
                  :indeterminate="indeterminate"
                  @change="selectAllHost"
                >
                  全选 <span class="tips">仅显示已配置 SSH 连接的实例</span>
                </el-checkbox>
              </template>
              <el-option
                v-for="item in hasConfigHostList"
                :key="item.id"
                :label="item.name"
                :value="item.id"
              />
            </el-select>
          </div>
        </el-form-item>
        <el-form-item prop="command" label="指令">
          <div class="command_wrap">
            <el-dropdown
              trigger="click"
              max-height="50vh"
              :teleported="false"
              class="scripts_menu"
            >
              <span class="link_text">从脚本库导入<el-icon><ArrowDown /></el-icon></span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item v-for="item in scriptList" :key="item.id" @click="handleImportScript(item)">
                    <span>{{ item.name }}</span>
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-input
              v-model="formData.command"
              class="input"
              type="textarea"
              :rows="5"
              clearable
              autocomplete="off"
              placeholder="输入 Shell 指令，例如：ping -c 10 google.com"
            />
          </div>
        </el-form-item>
        <el-form-item prop="timeout" label="超时时间（秒）">
          <el-input
            v-model.trim.number="formData.timeout"
            type="number"
            clearable
            autocomplete="off"
            placeholder="指令执行超时时间，单位秒，超时自动中断"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="execOnekey">开始执行</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch, nextTick, getCurrentInstance } from 'vue'
import { ArrowDown, Delete, MoreFilled, Promotion } from '@element-plus/icons-vue'
import { generateSocketInstance } from '@/utils'

const { proxy: { $api, $notification, $messageBox, $message, $store, $tools } } = getCurrentInstance()

const loading = ref(false)
const formVisible = ref(false)
const socket = ref(null)
let recordList = ref([])
let pendingRecord = ref([])
let checkAll = ref(false)
let indeterminate = ref(false)
const updateFormRef = ref(null)
let timeRemaining = ref(0)
const isClient = ref(false)

let formData = reactive({
  hostIds: [],
  command: '',
  timeout: 120
})

const token = computed(() => $store.token)
const hostList = computed(() => $store.hostList)
let scriptList = computed(() => $store.scriptList)
let isExecuting = computed(() => timeRemaining.value > 0)
const hasConfigHostList = computed(() => hostList.value.filter(item => item.isConfig))

const tableData = computed(() => {
  return pendingRecord.value.concat(recordList.value).map(item => {
    item.loading = false
    return item
  })
})
const getRecordKey = row => row.id || `pending-${ row.startDate }`
const expandRows = computed(() => {
  let rows = tableData.value.filter(item => item.pending).map(getRecordKey)
  return rows
})

const rules = computed(() => {
  return {
    hostIds: { required: true, trigger: 'change' },
    command: { required: true, trigger: 'change' },
    timeout: { required: true, type: 'number', trigger: 'change' }
  }
})

watch(() => formData.hostIds, (val) => {
  if (val.length === 0) {
    checkAll.value = false
    indeterminate.value = false
  } else if (val.length === hasConfigHostList.value.length) {
    checkAll.value = true
    indeterminate.value = false
  } else {
    indeterminate.value = true
  }
})

const createExecShell = (hostIds = [], command = 'ls', timeout = 60) => {
  loading.value = true
  timeRemaining.value = Number(formData.timeout)
  let timer = null
  socket.value = generateSocketInstance('/onekey')
  socket.value.on('connect', () => {
    timer = setInterval(() => {
      timeRemaining.value -= 1
    }, 1000)
    console.log('onekey socket已连接：', socket.value.id)

    socket.value.on('ready', () => {
      pendingRecord.value = [] // 每轮执行前清空
    })

    socket.value.emit('ws_onekey', { hostIds, token: token.value, command, timeout })

    socket.value.on('output', (result) => {
      loading.value = false
      if (Array.isArray(result) && result.length > 0) {
        // console.log('output', result)
        result = result.map(item => ({ ...item, pending: true }))
        pendingRecord.value = result
        nextTick(() => {
          document.querySelectorAll('.detail_content_box').forEach(container => {
            container.scrollTop = container.scrollHeight
          })
        })
      }
    })

    socket.value.on('exec_timeout', ({ reason }) => {
      $notification({
        title: '批量指令执行超时',
        message: reason,
        type: 'error'
      })
      getOnekeyRecord()
    })

    socket.value.on('exec_complete', () => {
      $notification({
        title: '批量指令执行完成',
        message: '执行完成',
        type: 'success'
      })
      getOnekeyRecord()
    })
  })

  socket.value.on('disconnect', () => {
    loading.value = false
    timeRemaining.value = 0
    if (isClient.value) $store.getHostCatalog() // 如果是客户端安装/卸载脚本，更新下host
    isClient.value = false
    clearInterval(timer)
    console.warn('onekey websocket 连接断开')
  })

  socket.value.on('connect_error', (err) => {
    loading.value = false
    console.error('onekey websocket 连接错误：', err)
    $notification({
      title: 'onekey websocket 连接错误：',
      message: '请检查socket服务是否正常',
      type: 'error'
    })
  })
}

onMounted(async () => {
  getOnekeyRecord()
})

let selectAllHost = (val) => {
  indeterminate.value = false
  if (val) {
    formData.hostIds = hasConfigHostList.value.map(item => item.id)
  } else {
    formData.hostIds = []
  }
}

let handleImportScript = (scriptObj) => {
  isClient.value = scriptObj.id.startsWith('client')
  formData.command = scriptObj.command
}

let getStatusType = (status) => {
  switch (status) {
    case '连接中':
      return 'warning'
    case '连接失败':
      return 'danger'
    case '执行中':
      return 'primary'
    case '执行成功':
      return 'success'
    case '执行失败':
      return 'danger'
    case '执行超时':
      return 'warning'
    case '执行中断':
      return 'info'
    default:
      return 'info'
  }
}

let getOnekeyRecord = async () => {
  loading.value = true
  let { data } = await $api.getOnekeyRecord()
  recordList.value = data
  pendingRecord.value = []
  loading.value = false
}

let addOnekey = () => {
  formVisible.value = true
}

function execOnekey() {
  updateFormRef.value.validate()
    .then(async () => {
      let { hostIds, command, timeout } = formData
      timeout = Number(timeout)
      if (timeout < 1) {
        return $message.error('超时时间不能小于1秒')
      }
      if (hostIds.length === 0) {
        return $message.error('请选择主机')
      }
      await getOnekeyRecord() // 获取新纪录前会清空 pendingRecord，所以需要获取一次最新的list
      createExecShell(hostIds, command, timeout)
      formVisible.value = false
    })
}

const clearFormInfo = () => {
  nextTick(() => updateFormRef.value.resetFields())
}

const handleRemove = async (ids = []) => {
  tableData.value.filter(item => ids.includes(item.id)).forEach(item => item.loading = true)
  await $api.deleteOnekeyRecord(ids)
  await getOnekeyRecord()
  $message.success('success')
}

const handleRemoveAll = async () => {
  $messageBox.confirm('确认删除所有执行记录？', 'Warning', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(async () => {
      await $api.deleteOnekeyRecord('ALL')
      pendingRecord.value = []
      await getOnekeyRecord()
      $message.success('success')
    })
}

</script>

<style lang="scss" scoped>
.onekey_container {
  .onekey_table_wrap {
    flex: 0 1 auto;
  }

  .instance_cell {
    min-width: 0;
    display: grid;
    gap: 3px;

    strong {
      overflow: hidden;
      color: var(--el-text-color-primary);
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    small {
      overflow: hidden;
      color: var(--el-text-color-secondary);
      font-size: 12px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .command_cell {
    padding: 3px 6px;
    border-radius: 5px;
    background: var(--el-fill-color-light);
    color: var(--el-text-color-primary);
    font-family: var(--el-font-family-monospace, monospace);
    font-size: 12px;
  }

  .detail_content_box {
    max-height: 260px;
    margin: 2px 14px 8px 50px;
    padding: 14px 16px;
    overflow: auto;
    border: 1px solid var(--el-border-color-light);
    border-radius: 8px;
    background: var(--el-fill-color-extra-light);
    color: var(--el-text-color-primary);
    font-family: var(--el-font-family-monospace, monospace);
    font-size: 13px;
    line-height: 1.55;
    white-space: pre-wrap;
  }

  .select_host_wrap {
    width: 100%;
    display: flex;

    .select {
      flex: 1;

      .tips {
        margin-left: 5px;
        color: var(--el-text-color-secondary);
        font-size: 12px;
      }
    }
  }

  .command_wrap {
    width: 100%;
    display: flex;
    flex-direction: column;

    .scripts_menu {
      align-self: flex-start;

      :deep(.el-dropdown-menu) {
        min-width: 120px;
        max-width: 300px;
      }
    }

    .link_text {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 8px;
      cursor: pointer;
      color: var(--el-color-primary);
      font-size: 13px;
      user-select: none;
    }

    .input {
      width: 100%;

      :deep(.el-textarea__inner) {
        font-family: var(--el-font-family-monospace, monospace);
      }
    }
  }
}
</style>
