<template>
  <el-popover
    placement="top-start"
    :trigger="['hover', 'click', 'focus']"
    :width="332"
    :show-after="120"
    :hide-after="80"
  >
    <template #reference>
      <span class="latency_reference" tabindex="0">
        <slot />
      </span>
    </template>

    <div class="latency_detail">
      <div class="latency_summary">
        <span>网络延迟</span>
        <strong :class="latencyClass">{{ totalText }}</strong>
        <span class="estimate_label">估算 RTT</span>
      </div>
      <div class="latency_path">
        <div class="path_node">
          <el-icon><Monitor /></el-icon>
          <span>本地</span>
          <strong>{{ localText }}</strong>
        </div>
        <div class="path_line">
          <span />
        </div>
        <div class="path_node easy_node">
          <el-icon><Connection /></el-icon>
          <span>EasyNode</span>
        </div>
        <div class="path_line">
          <span />
        </div>
        <div class="path_node">
          <el-icon><Monitor /></el-icon>
          <span>实例</span>
          <strong :class="instanceClass">{{ instanceText }}</strong>
        </div>
      </div>
      <p class="latency_hint">总值为两段往返延迟之和。</p>
    </div>
  </el-popover>
</template>

<script setup>
import { computed } from 'vue'
import { Connection, Monitor } from '@element-plus/icons-vue'
import { getMetricLevel } from '@/composables/useServerStatus'

const props = defineProps({
  total: { type: Number, default: null },
  localToService: { type: Number, default: null },
  serviceToInstance: { type: Number, default: null },
  instanceTimedOut: { type: Boolean, default: false }
})

const formatLatency = (value, timeoutText = '--') => Number.isFinite(value) ? `${ Math.round(value) } ms` : timeoutText
const totalText = computed(() => formatLatency(props.total))
const localText = computed(() => formatLatency(props.localToService))
const instanceText = computed(() => formatLatency(props.serviceToInstance, props.instanceTimedOut ? 'TO' : '--'))
const instanceClass = computed(() => props.instanceTimedOut ? 'danger' : (props.serviceToInstance === null ? 'muted' : 'success'))
const latencyClass = computed(() => getMetricLevel(props.total, 100, 250))
</script>

<style lang="scss" scoped>
.latency_reference {
  display: inline-flex;
  min-width: 0;
  outline: none;
}

.latency_detail {
  color: var(--el-text-color-regular);
}

.latency_summary {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 7px;
  padding-bottom: 13px;
  font-size: 13px;
  border-bottom: 1px solid var(--el-border-color-lighter);

  strong { font-size: 14px; }
  .estimate_label { color: var(--el-text-color-placeholder); font-size: 11px; }
}

.latency_path {
  display: grid;
  grid-template-columns: 58px 1fr 70px 1fr 58px;
  align-items: start;
  padding: 14px 0 8px;
}

.path_node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: var(--el-text-color-secondary);
  font-size: 11px;

  .el-icon { color: var(--el-text-color-regular); font-size: 17px; }
  strong { color: var(--el-color-success); font-size: 11px; white-space: nowrap; }
  strong.danger { color: var(--el-color-danger); }
  strong.muted { color: var(--el-text-color-placeholder); }

  &.easy_node {
    color: var(--el-color-primary);
    font-weight: 600;
  }
}

.path_line {
  padding-top: 8px;

  span {
    display: block;
    height: 1px;
    background: linear-gradient(90deg, var(--el-color-success-light-5), var(--el-color-primary-light-5));
  }
}

.latency_hint {
  margin: 5px 0 0;
  color: var(--el-text-color-placeholder);
  font-size: 11px;
  line-height: 1.5;
  text-align: center;
}

.success { color: var(--el-color-success); }
.warning { color: var(--el-color-warning); }
.danger { color: var(--el-color-danger); }
.muted { color: var(--el-text-color-placeholder); }
</style>
