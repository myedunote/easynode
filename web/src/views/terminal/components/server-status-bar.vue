<template>
  <div class="server_status_bar" :class="`is_${ connectionState }`">
    <button
      type="button"
      class="connection_marker"
      :title="connectionTitle"
      aria-label="重新连接状态监控"
      @click="reconnectStatus"
    >
      <span class="connection_dot" />
    </button>

    <LatencyDetail
      :total="estimatedTotalMs"
      :local-to-service="localToServiceMs"
      :service-to-instance="serviceToInstanceMs"
      :instance-timed-out="instanceTimedOut"
    >
      <span class="status_item latency_item" :class="latencyLevel">
        <el-icon><Connection /></el-icon>
        <span>{{ totalLatencyText }}</span>
        <small>RTT</small>
      </span>
    </LatencyDetail>

    <span class="status_divider" />
    <el-tooltip content="CPU 使用率" placement="top" :show-after="300">
      <span class="status_item" :class="cpuLevel">
        <el-icon><Cpu /></el-icon>
        <span>{{ cpuText }}</span>
      </span>
    </el-tooltip>

    <span class="status_divider" />
    <el-tooltip :content="memoryTooltip" placement="top" :show-after="300">
      <span class="status_item" :class="memoryLevel">
        <svg class="memory_icon" viewBox="0 0 24 24" aria-hidden="true">
          <rect
            x="3"
            y="7"
            width="18"
            height="10"
            rx="1.5"
          />
          <path d="M7 10h3v4H7zM14 10h3v4h-3zM6 17v2M10 17v2M14 17v2M18 17v2" />
        </svg>
        <span>{{ memoryText }}</span>
      </span>
    </el-tooltip>

    <span class="status_divider" />
    <el-tooltip content="实例实时网络速度（上传 / 下载）" placement="top" :show-after="300">
      <span class="status_item network_item">
        <el-icon><Upload /></el-icon>
        <span>{{ uploadText }}</span>
        <el-icon><Download /></el-icon>
        <span>{{ downloadText }}</span>
      </span>
    </el-tooltip>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Connection, Cpu, Download, Upload } from '@element-plus/icons-vue'
import { formatTransferRate, getMetricLevel, useServerStatus } from '@/composables/useServerStatus'
import LatencyDetail from './latency-detail.vue'

const props = defineProps({
  hostId: { type: String, required: true },
  visible: { type: Boolean, default: true }
})

const {
  serverData,
  connectionState,
  isReconnecting,
  localToServiceMs,
  serviceToInstanceMs,
  estimatedTotalMs,
  reconnect
} = useServerStatus(() => props.hostId, () => props.visible)

const connected = computed(() => connectionState.value === 'connected' && serverData.value.connect === true)
const cpuUsage = computed(() => {
  const value = Number(serverData.value.cpuInfo?.cpuUsage)
  return connected.value && Number.isFinite(value) ? value : null
})
const memoryUsage = computed(() => {
  const value = Number(serverData.value.memInfo?.usedMemPercentage)
  return connected.value && Number.isFinite(value) ? value : null
})
const instanceTimedOut = computed(() => Boolean(
  connected.value &&
  serverData.value.latency?.measuredAt &&
  !serverData.value.latency?.serviceToInstanceAvailable
))
const totalLatencyText = computed(() => {
  if (instanceTimedOut.value) return 'TO'
  return estimatedTotalMs.value === null ? '-- ms' : `${ Math.round(estimatedTotalMs.value) } ms`
})
const cpuText = computed(() => cpuUsage.value === null ? '--' : `${ cpuUsage.value.toFixed(1) }%`)
const memoryText = computed(() => memoryUsage.value === null ? '--' : `${ memoryUsage.value.toFixed(1) }%`)
const cpuLevel = computed(() => getMetricLevel(cpuUsage.value))
const memoryLevel = computed(() => getMetricLevel(memoryUsage.value))
const latencyLevel = computed(() => instanceTimedOut.value ? 'danger' : getMetricLevel(estimatedTotalMs.value, 100, 250))
const uploadText = computed(() => connected.value ? formatTransferRate(serverData.value.netstatInfo?.total?.outputMb) : '--')
const downloadText = computed(() => connected.value ? formatTransferRate(serverData.value.netstatInfo?.total?.inputMb) : '--')
const memoryTooltip = computed(() => {
  if (!connected.value) return '内存使用率'
  const used = serverData.value.memInfo?.usedMemMb
  const total = serverData.value.memInfo?.totalMemMb
  return Number.isFinite(Number(used)) && Number.isFinite(Number(total))
    ? `内存 ${ used } / ${ total } MB`
    : '内存使用率'
})
const connectionTitle = computed(() => {
  if (isReconnecting.value) return '正在重新连接状态监控'
  return ({
    connected: '状态监控已连接，点击重新连接',
    connecting: '正在获取实例状态，点击重新连接',
    error: '状态监控连接异常，点击重新连接',
    idle: '状态监控未启动'
  }[connectionState.value])
})
const reconnectStatus = () => reconnect()
</script>

<style lang="scss" scoped>
.server_status_bar {
  box-sizing: border-box;
  width: 100%;
  height: 28px;
  min-height: 28px;
  display: flex;
  align-items: center;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 0 7px;
  border-top: 1px solid var(--el-border-color);
  background: var(--el-fill-color-light);
  color: var(--el-text-color-regular);
  font-size: 11px;
  line-height: 1;
  user-select: none;
  scrollbar-width: none;

  &::-webkit-scrollbar { display: none; }
}

.connection_marker {
  appearance: none;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  width: 12px;
  min-width: 12px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:focus-visible {
    outline: 1px solid var(--el-color-primary);
    outline-offset: 1px;
  }
}

.connection_dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--el-text-color-placeholder);
}

.is_connected .connection_dot {
  background: var(--el-color-success);
  box-shadow: 0 0 5px var(--el-color-success-light-3);
}

.is_connecting .connection_dot {
  background: var(--el-color-warning);
  animation: status-pulse 1.4s ease-in-out infinite;
}

.is_error .connection_dot { background: var(--el-color-danger); }

.status_item {
  height: 23px;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
  border-radius: 3px;
  white-space: nowrap;
  transition: background-color 0.15s, color 0.15s;

  &:hover { background: var(--el-fill-color); }
  .el-icon { font-size: 13px; }
  small { color: var(--el-text-color-placeholder); font-size: 9px; }
}

.memory_icon {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.latency_item { cursor: help; }
.network_item { gap: 3px; color: var(--el-text-color-secondary); }
.network_item .el-icon:first-child { color: var(--el-color-warning); }
.network_item .el-icon:nth-of-type(2) { margin-left: 4px; color: var(--el-color-success); }

.status_divider {
  width: 1px;
  height: 14px;
  flex: 0 0 auto;
  background: var(--el-border-color);
}

.success { color: var(--el-color-success); }
.warning { color: var(--el-color-warning); }
.danger { color: var(--el-color-danger); }
.muted { color: var(--el-text-color-placeholder); }

@keyframes status-pulse {
  0%, 100% { opacity: 0.45; }
  50% { opacity: 1; }
}
</style>
