<template>
  <div class="terminal_wrap">
    <div class="terminal_top">
      <el-dropdown trigger="click">
        <span class="link_text">新建连接<el-icon><arrow-down /></el-icon></span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item v-for="(item, index) in hostList" :key="index" @click="handleCommandHost(item)">
              {{ item.name }} {{ item.host }}
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <el-dropdown trigger="click">
        <span class="link_text">会话同步<el-icon><arrow-down /></el-icon></span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item @click="handleSyncSession">
              <el-icon v-show="isSyncAllSession"><Select class="action_icon" /></el-icon>
              <span>同步键盘输入到所有会话</span>
            </el-dropdown-item>
            <!-- <el-dropdown-item @click="handleSyncSession">
              同步键盘输入到部分会话
            </el-dropdown-item> -->
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <!-- <div class="link_text fullscreen" @click="handleFullScreen">全屏</div> -->
      <el-icon class="full_icon">
        <FullScreen class="icon" @click="handleFullScreen" />
      </el-icon>
    </div>
    <div class="info_box">
      <InfoSide
        ref="infoSideRef"
        v-model:show-input-command="showInputCommand"
        :host-info="curHost"
        :visible="visible"
        @click-input-command="clickInputCommand"
      />
    </div>
    <div class="terminals_sftp_wrap">
      <el-tabs
        v-model="activeTabIndex"
        type="border-card"
        tab-position="top"
        @tab-remove="removeTab"
        @tab-change="tabChange"
      >
        <el-tab-pane
          v-for="(item, index) in terminalTabs"
          :key="index"
          :label="item.name"
          :name="index"
          :closable="true"
        >
          <div class="tab_content_wrap" :style="{ height: mainHeight + 'px' }">
            <TerminalTab
              ref="terminalTabRefs"
              :index="index"
              :host="item.host"
              @input="terminalInput"
            />
            <Sftp :host="item.host" @resize="resizeTerminal" />
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
    <InputCommand v-model:show="showInputCommand" @input-command="handleInputCommand" />
    <HostForm
      v-model:show="hostFormVisible"
      :default-data="updateHostData"
      @update-list="handleUpdateList"
      @closed="updateHostData = null"
    />
  </div>
</template>

<script setup>
import { ref, defineEmits, computed, defineProps, getCurrentInstance, watch, onMounted, onBeforeUnmount } from 'vue'
import { ArrowDown, FullScreen, Select } from '@element-plus/icons-vue'
import TerminalTab from './terminal-tab.vue'
import InfoSide from './info-side.vue'
import Sftp from './sftp.vue'
import InputCommand from '@/components/input-command/index.vue'
import HostForm from '../../server/components/host-form.vue'

const { proxy: { $nextTick, $store, $message } } = getCurrentInstance()

const props = defineProps({
  terminalTabs: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['closed', 'removeTab', 'add-host',])

const showInputCommand = ref(false)
const infoSideRef = ref(null)
const terminalTabRefs = ref([])
let activeTabIndex = ref(0)
let visible = ref(true)
let mainHeight = ref('')
let isSyncAllSession = ref(false)
let hostFormVisible = ref(false)
let updateHostData = ref(null)

const terminalTabs = computed(() => props.terminalTabs)
const terminalTabsLen = computed(() => props.terminalTabs.length)
const curHost = computed(() => terminalTabs.value[activeTabIndex.value])
let hostList = computed(() => $store.hostList)

// const closable = computed(() => terminalTabs.length > 1)

onMounted(() => {
  handleResizeTerminalSftp()
  window.addEventListener('resize', handleResizeTerminalSftp)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResizeTerminalSftp)
})

const handleUpdateList = async ({ isConfig, host }) => {
  try {
    await $store.getHostList()
    if (isConfig) {
      let targetHost = hostList.value.find(item => item.host === host)
      if (targetHost !== -1) emit('add-host', targetHost)
    }
  } catch (err) {
    $message.error('获取实例列表失败')
    console.error('获取实例列表失败: ', err)
  }
}

function handleResizeTerminalSftp() {
  $nextTick(() => {
    mainHeight.value = document.querySelector('.terminals_sftp_wrap').offsetHeight - 45 // 45 is tab-header height+15
  })
}

const handleCommandHost = (host) => {
  if (!host.isConfig) {
    $message.warning('请先配置SSH连接信息')
    hostFormVisible.value = true
    updateHostData.value = { ...host }
    return
  }
  emit('add-host', host)
}

const handleSyncSession = () => {
  isSyncAllSession.value = !isSyncAllSession.value
  if (isSyncAllSession.value) $message.success('已开启键盘输入到所有会话')
  else $message.info('已关闭键盘输入到所有会话')
}

const terminalInput = ({ idx, key }) => {
  if (!isSyncAllSession.value) return
  let filterHostList = terminalTabRefs.value.filter((host, index) => {
    return index !== idx
  })
  filterHostList.forEach(item => {
    item.handleInputCommand(key)
  })
}

const tabChange = async (index) => {
  await $nextTick()
  const curTabTerminal = terminalTabRefs.value[index]
  curTabTerminal?.focusTab()
}

watch(terminalTabsLen, () => {
  let len = terminalTabsLen.value
  console.log('add tab:', len)
  if (len > 0) {
    activeTabIndex.value = len - 1
    // registryDbClick()
    tabChange(activeTabIndex.value)
  }
}, {
  immediate: true,
  deep: false
})

// const windowBeforeUnload = () => {
//   window.onbeforeunload = () => {
//     return ''
//   }
// }

const clickInputCommand = () => {
  showInputCommand.value = true
}

const removeTab = (index) => {
  // terminalTabs.value.splice(index, 1)
  emit('removeTab', index)
  if (index !== activeTabIndex.value) return
  activeTabIndex.value = 0
}

const handleFullScreen = () => {
  document.getElementsByClassName('terminals_sftp_wrap')[0].requestFullscreen()
}

// const registryDbClick = () => {
//   $nextTick(() => {
//     let tabItems = Array.from(document.getElementsByClassName('el-tabs__item'))
//     tabItems.forEach(item => {
//       item.removeEventListener('dblclick', handleDblclick)
//       item.addEventListener('dblclick', handleDblclick)
//     })
//   })
// }

// const handleDblclick = (e) => {
//   let key = e.target.id.substring(4)
//   removeTab(key)
// }

const handleVisibleSidebar = () => {
  visible.value = !visible.value
  resizeTerminal()
}

const resizeTerminal = () => {
  for (let terminalTabRef of terminalTabRefs.value) {
    const { handleResize } = terminalTabRef || {}
    handleResize && handleResize()
  }
}

const handleInputCommand = async (command) => {
  const curTabTerminal = terminalTabRefs.value[activeTabIndex.value]
  await $nextTick()
  curTabTerminal?.focusTab()
  curTabTerminal.handleInputCommand(`${ command }\n`)
  showInputCommand.value = false
}
</script>

<style lang="scss" scoped>
.terminal_wrap {
  display: flex;
  flex-wrap: wrap;
  height: 100%;

  :deep(.el-tabs__content) {
    flex: 1;
    width: 100%;
    padding: 0 5px 5px 0;
  }

  :deep(.el-tabs--border-card) {
    border: none;
  }

  :deep(.el-tabs__nav-wrap.is-scrollable.is-top) {
    display: flex;
    align-items: center;
  }

  $terminalTopHeight: 30px;
  .terminal_top {
    width: 100%;
    height: $terminalTopHeight;
    display: flex;
    align-items: center;
    padding: 0 15px;
    border-bottom: 1px solid var(--el-color-primary);
    position: sticky;
    top: 0;
    background-color: #fff;
    z-index: 3;
    :deep(.el-dropdown) {
      margin-top: -2px;
    }
    .link_text {
      font-size: var(--el-font-size-base);
      color: var(--el-color-primary);
      cursor: pointer;
      margin-right: 15px;
    }
    .full_icon {
      cursor: pointer;
      margin-left: auto;
      &:hover .icon {
        color: var(--el-color-primary);
      }
    }
  }
  .info_box {
    height: calc(100% - $terminalTopHeight);
    overflow: auto;
    display: flex;
    flex-direction: column;
  }

  .terminals_sftp_wrap {
    height: calc(100% - $terminalTopHeight);
    overflow: hidden;
    flex: 1;
    display: flex;
    flex-direction: column;
    position: relative;

    .tab_content_wrap {
      display: flex;
      flex-direction: column;
      justify-content: space-between;

      :deep(.terminal_tab_container) {
        flex: 1;
      }

      :deep(.sftp_tab_container) {
        height: 300px;
      }
    }

    .full-screen-button {
      position: absolute;
      right: 10px;
      top: 4px;
      z-index: 99999;
    }
  }

  .visible {
    position: absolute;
    z-index: 999999;
    top: 13px;
    left: 5px;
    cursor: pointer;
    transition: all 0.3s;

    &:hover {
      transform: scale(1.1);
    }
  }
}
</style>

<style>
.action_icon {
  color: var(--el-color-primary);
}
</style>