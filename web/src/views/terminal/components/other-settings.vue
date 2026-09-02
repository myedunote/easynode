<template>
  <div class="other_settings_content">
    <el-form
      ref="formRef"
      label-suffix="："
      label-width="100px"
      :show-message="false"
    >
      <el-form-item label="自动重连" prop="autoReconnect">
        <span>
          <el-switch
            v-model="autoReconnect"
            class="switch"
            inline-prompt
            style="--el-switch-on-color: #13ce66; --el-switch-off-color: #ff4949"
            active-text="开启"
            inactive-text="关闭"
          />
        </span>
      </el-form-item>
      <el-form-item label="脚本执行" prop="autoExecuteScript">
        <el-tooltip
          effect="dark"
          content="启用后从脚本库选中脚本后自动执行(回车操作)"
          placement="right"
        >
          <el-switch
            v-model="autoExecuteScript"
            class="switch"
            inline-prompt
            style="--el-switch-on-color: #13ce66; --el-switch-off-color: #ff4949"
            active-text="自动"
            inactive-text="手动"
          />
        </el-tooltip>
      </el-form-item>
      <el-form-item label="右键菜单" prop="autoShowContextMenu">
        <el-tooltip
          effect="dark"
          content="启用后选中文本时自动弹出右键菜单"
          placement="right"
        >
          <el-switch
            v-model="autoShowContextMenu"
            class="switch"
            inline-prompt
            style="--el-switch-on-color: #13ce66; --el-switch-off-color: #ff4949"
            active-text="自动"
            inactive-text="手动"
          />
        </el-tooltip>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { computed, getCurrentInstance } from 'vue'

const { proxy: { $store } } = getCurrentInstance()

const autoReconnect = computed({
  get: () => $store.terminalSettings.behavior.autoReconnect,
  set: (newVal) => $store.setTerminalBehavior({ autoReconnect: newVal })
})

const autoExecuteScript = computed({
  get: () => $store.terminalSettings.behavior.autoExecuteScript,
  set: (newVal) => $store.setTerminalBehavior({ autoExecuteScript: newVal })
})

const autoShowContextMenu = computed({
  get: () => $store.terminalSettings.behavior.autoShowContextMenu,
  set: (newVal) => $store.setTerminalBehavior({ autoShowContextMenu: newVal })
})

</script>
