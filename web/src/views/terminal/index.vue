<template>
  <div class="terminal_container">
    <div v-if="showLinkTips" class="terminal_link_tips">
      <h2 class="quick_link_text">快速连接</h2>
      <el-table :data="hostList" :show-header="false">
        <el-table-column prop="name" label="name" />
        <el-table-column>
          <template #default="{ row }">
            <span>{{ row.username ? `ssh ${row.username}@` : '' }}{{ row.host }}{{ row.port ? ` -p ${row.port}` : ''
            }}</span>
          </template>
        </el-table-column>
        <el-table-column v-show="!isAllConfssh">
          <template #default="{ row }">
            <div class="actios_btns">
              <el-button
                v-if="row.isConfig"
                type="primary"
                link
                @click="linkTerminal(row)"
              >
                连接
              </el-button>
              <el-button
                v-else
                type="primary"
                link
                @click="handleUpdateHost(row)"
              >
                配置ssh
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>
    <div v-else>
      <Terminal
        ref="terminalRef"
        :terminal-tabs="terminalTabs"
        @remove-tab="handleRemoveTab"
        @add-host="linkTerminal"
      />
    </div>
    <HostForm
      v-model:show="hostFormVisible"
      :default-data="updateHostData"
      @update-list="handleUpdateList"
      @closed="updateHostData = null"
    />
  </div>
</template>

<script setup>
import { ref, computed, onActivated, getCurrentInstance, reactive, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import Terminal from './components/terminal.vue'
import HostForm from '../server/components/host-form.vue'
import { randomStr } from '@utils/index.js'
import { terminalStatus } from '@/utils/enum'
const { CONNECTING } = terminalStatus

const { proxy: { $store, $message } } = getCurrentInstance()

let terminalTabs = reactive([])
let hostFormVisible = ref(false)
let updateHostData = ref(null)
const terminalRef = ref(null)
const route = useRoute()

let showLinkTips = computed(() => !Boolean(terminalTabs.length))
let hostList = computed(() => $store.hostList)
let isAllConfssh = computed(() => {
  return hostList.value?.every(item => item.isConfig)
})

function linkTerminal(row) {
  const { name, host } = row
  terminalTabs.push({ key: randomStr(16), name, host, status: CONNECTING })
}

function handleUpdateHost(row) {
  hostFormVisible.value = true
  updateHostData.value = { ...row }
}

function handleRemoveTab(index) {
  terminalTabs.splice(index, 1)
}

const handleUpdateList = async ({ host }) => {
  try {
    await $store.getHostList()
    let targetHost = hostList.value.find(item => item.host === host)
    if (targetHost) linkTerminal(targetHost)
  } catch (err) {
    $message.error('获取实例列表失败')
    console.error('获取实例列表失败: ', err)
  }
}

onActivated(async () => {
  await nextTick()
  const { host } = route.query
  if (!host) return
  let targetHosts = hostList.value.filter(item => host.includes(item.host)).map(item => {
    const { name, host } = item
    return { key: randomStr(16), name, host, status: CONNECTING }
  })
  if (!targetHosts || !targetHosts.length) return
  terminalTabs.push(...targetHosts)
})

</script>

<style lang="scss" scoped>
.terminal_container {
  height: calc(100vh - 60px - 20px);
  overflow: auto;
  .terminal_link_tips {
    width: 50%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 20px;

    .quick_link_text {
      align-self: self-start;
      margin: 0 10px;
      font-size: 14px;
      font-weight: 600;
      line-height: 22px;
      margin-bottom: 15px;
    }

    .actios_btns {
      display: flex;
      justify-content: flex-end;
    }
  }
}
</style>
