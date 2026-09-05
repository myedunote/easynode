<template>
  <el-select
    :model-value="modelValue"
    multiple
    filterable
    collapse-tags
    collapse-tags-tooltip
    :max-collapse-tags="1"
    :placeholder="modelValue.length ? '选择目标主机' : '聊天模式'"
    class="host_selector"
    size="small"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-option-group v-for="group in grouped" :key="group.id" :label="group.name">
      <el-option
        v-for="host in group.hosts"
        :key="host._id"
        :label="host.name"
        :value="host._id"
        :disabled="host.aiDisabled"
      >
        <div class="host_option">
          <span class="host_name">{{ host.name }}</span>
          <span class="host_addr">{{ host.host }}</span>
          <span v-if="host.aiDisabled" class="host_tag">已禁用 AI</span>
        </div>
      </el-option>
    </el-option-group>
  </el-select>
</template>

<script setup>
import { computed, getCurrentInstance, watch } from 'vue'

const { proxy: { $store } } = getCurrentInstance()

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue',])

const validHostIds = computed(() => new Set(
  $store.hostList.flatMap(host => [host.id, host._id,].filter(Boolean))
))

watch(
  [() => $store.hostCatalogLoaded, validHostIds, () => props.modelValue,],
  ([hostCatalogLoaded, hostIds, selectedIds,]) => {
    if (!hostCatalogLoaded || !selectedIds.length) return
    const nextSelectedIds = selectedIds.filter(id => hostIds.has(id))
    if (nextSelectedIds.length !== selectedIds.length) {
      emit('update:modelValue', nextSelectedIds)
    }
  },
  { immediate: true }
)

const grouped = computed(() => {
  return $store.orderedHostSections.map(({ group, hosts }) => ({
    id: group.id,
    name: group.name,
    hosts: hosts.map(host => ({
      ...host,
      aiDisabled: host.aiPolicy?.enabled === false
    }))
  })).filter(group => group.hosts.length)
})
</script>

<style lang="scss" scoped>
.host_selector {
  width: 150px;
}

.host_option {
  display: flex;
  align-items: center;
  gap: 8px;

  .host_name {
    flex: 1;
  }

  .host_addr {
    color: #909399;
    font-size: 12px;
  }

  .host_tag {
    padding: 0 4px;
    border-radius: 3px;
    background-color: rgba(245, 108, 108, 0.15);
    color: #f56c6c;
    font-size: 11px;
  }
}
</style>
