<template>
  <el-dialog
    v-model="visible"
    width="600px"
    top="9vh"
    class="management_dialog import_script_dialog"
    append-to-body
    title="导入脚本"
    :close-on-click-modal="false"
  >
    <template #header>
      <div class="management_dialog_title">导入脚本</div>
    </template>
    <div class="import_field">
      <label>导入到</label>
      <el-select v-model="targetGroup" placeholder="选择分组">
        <el-option
          v-for="item in groupList"
          :key="item.id"
          :label="item.name"
          :value="item.id"
        />
      </el-select>
    </div>

    <div class="import_method_label">导入方式</div>
    <ul class="type_list">
      <li @click="handleFromJson">
        <span class="method_icon"><svg-icon name="icon-json" /></span>
        <span class="method_content">
          <strong>选择 JSON 文件</strong>
          <small>支持选择多个 EasyNode 脚本文件</small>
        </span>
        <input
          ref="jsonInputRef"
          type="file"
          accept=".json"
          multiple
          name="jsonInput"
          style="display: none;"
          @change="handleJsonFile"
        >
      </li>
      <li @click="() => manualInputVisible = true">
        <span class="method_icon"><svg-icon name="icon-bianji1" /></span>
        <span class="method_content">
          <strong>手动输入</strong>
          <small>每行输入一条脚本指令</small>
        </span>
      </li>
    </ul>
  </el-dialog>

  <el-dialog
    v-model="manualInputVisible"
    width="600px"
    top="8vh"
    class="management_dialog manual_script_dialog"
    title="手动输入"
    :close-on-click-modal="false"
    append-to-body
  >
    <template #header>
      <div class="management_dialog_title">手动输入脚本</div>
    </template>
    <el-input
      v-model="manualInput"
      type="textarea"
      :autosize="{ minRows: 12, maxRows: 18 }"
      placeholder="请输入脚本内容，每行一条脚本"
    />
    <template #footer>
      <el-button @click="manualInputVisible = false">取消</el-button>
      <el-button type="primary" @click="handleManualImport">导入脚本</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, getCurrentInstance } from 'vue'

const { proxy: { $api, $message, $store } } = getCurrentInstance()

const props = defineProps({
  show: {
    required: true,
    type: Boolean
  }
})

const emit = defineEmits(['update:show', 'update-list',])

const jsonInputRef = ref(null)
const manualInputVisible = ref(false)
const manualInput = ref('')
const targetGroup = ref('default')

let visible = computed({
  get: () => props.show,
  set: (newVal) => emit('update:show', newVal)
})

let scriptList = computed(() => $store.scriptList)
const groupList = computed(() => $store.scriptGroupList.filter(item => item.id !== 'builtin'))

function handleFromJson() {
  jsonInputRef.value.click()
}

const handleJsonFile = (event) => {
  let files = event.target.files
  let jsonFiles = Array.from(files).filter(file => file.name.endsWith('.json'))
  if (jsonFiles.length === 0) return $message.warning('未选择有效的JSON文件')

  let readerPromises = jsonFiles.map(file => {
    return new Promise((resolve, reject) => {
      let reader = new FileReader()
      reader.onload = (e) => {
        try {
          let jsonContent = JSON.parse(e.target.result)
          resolve(jsonContent)
        } catch {
          reject(new Error(`Failed to parse JSON file: ${ file.name }`))
        }
      }
      reader.onerror = () => {
        reject(new Error(`Failed to read file: ${ file.name }`))
      }
      reader.readAsText(file)
    })
  })

  Promise.all(readerPromises)
    .then(async jsonContents => {
      let formatJson = jsonContents.flat(Infinity)
      let existCommand = scriptList.value.map(item => item.command)
      let existId = scriptList.value.map(item => item.id)
      formatJson = formatJson.filter(({ _id, command }) => {
        return !existCommand.includes(command) && !existId.includes(_id)
      })
      if (formatJson.length === 0) return $message.warning('导入的脚本已存在')
      formatJson = formatJson.map((item) => {
        return {
          ...item,
          group: targetGroup.value
        }
      })
      try {
        let { data: { len } } = await $api.importScript({ scripts: formatJson })
        $message({ type: 'success', center: true, message: `成功导入脚本: ${ len }条` })
        emit('update-list')
        visible.value = false
      } catch (error) {
        $message.error('导入失败: ' + error.message)
      }
    })
    .catch(error => {
      $message.error('导入失败: ' + error.message)
      console.error('导入失败: ', error)
    })
    .finally(() => {
      event.target.value = null
    })
}

const handleManualImport = async () => {
  if (!manualInput.value.trim()) {
    return $message.warning('请输入脚本内容')
  }

  try {
    let scripts = manualInput.value.split('\n')
    scripts = [...new Set(scripts),]
      .filter(line => line.trim())
      .map((command) => ({ command: command.trim() }))
    if (scripts.length === 0) {
      return $message.warning('未检测到有效的脚本内容')
    }

    let existCommand = scriptList.value.map(item => item.command)
    let filterScripts = scripts.filter(({ command }) => {
      return !existCommand.includes(command)
    })
    let filterScriptsLen = filterScripts.length
    if (filterScriptsLen !== 0 && filterScriptsLen < scripts.length) $message.warning('已过滤重复的脚本')
    if (filterScriptsLen === 0) return $message.warning('导入的脚本已存在')
    filterScripts = filterScripts.map((item, index) => {
      return {
        ...item,
        name: `${ item.command.slice(0, 15) || `脚本${ index + 1 }` }`,
        description: '手动输入',
        group: targetGroup.value
      }
    })

    let { data: { len } } = await $api.importScript({ scripts: filterScripts })
    $message({ type: 'success', center: true, message: `成功导入脚本: ${ len }条` })
    emit('update-list')
    manualInputVisible.value = false
    visible.value = false
    manualInput.value = ''
  } catch (error) {
    $message.error('导入失败: ' + error.message)
  }
}
</script>

<style lang="scss">
.import_script_dialog {
  .import_field {
    display: grid;
    gap: 7px;
    margin-bottom: 20px;

    label,
    .import_method_label {
      color: var(--el-text-color-primary);
      font-size: 14px;
      font-weight: 600;
    }

    .el-select {
      width: 100%;
    }

    .el-select__wrapper {
      min-height: 38px;
    }
  }

  .import_method_label {
    margin-bottom: 8px;
    color: var(--el-text-color-primary);
    font-size: 14px;
    font-weight: 600;
  }

  .type_list {
    margin: 0;
    padding: 0;
    display: flex;
    align-items: center;
    gap: 12px;
    list-style: none;
    user-select: none;

    li {
      min-width: 0;
      height: 94px;
      padding: 16px;
      flex: 1;
      display: flex;
      align-items: center;
      gap: 12px;
      border: 1px solid var(--el-border-color);
      border-radius: 9px;
      background: var(--el-fill-color-blank);
      cursor: pointer;
      transition: border-color .15s, background-color .15s;

      &:hover {
        border-color: var(--el-color-primary);
        background: color-mix(in srgb, var(--el-color-primary) 5%, var(--el-bg-color));
      }

      .method_icon {
        width: 42px;
        height: 42px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
        border-radius: 9px;
        background: color-mix(in srgb, var(--el-color-primary) 10%, transparent);
        color: var(--el-color-primary);

        svg {
          width: 24px;
          height: 24px;
        }
      }

      .method_content {
        min-width: 0;
        display: grid;
        gap: 5px;

        strong {
          color: var(--el-text-color-primary);
          font-size: 14px;
        }

        small {
          color: var(--el-text-color-secondary);
          line-height: 1.45;
        }
      }
    }
  }
}

.manual_script_dialog {
  .el-textarea__inner {
    padding: 12px;
    line-height: 1.6;
    font-family: var(--el-font-family-monospace, monospace);
  }
}

@media (max-width: 640px) {
  .import_script_dialog .type_list {
    flex-direction: column;

    li {
      width: 100%;
    }
  }
}
</style>
