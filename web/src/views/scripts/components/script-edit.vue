<template>
  <el-dialog
    v-model="visible"
    width="600px"
    top="5vh"
    class="management_dialog script_form_dialog"
    :title="isModify ? '编辑脚本' : '添加脚本'"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <template #header>
      <div class="management_dialog_title">{{ isModify ? '编辑脚本' : '添加脚本' }}</div>
    </template>
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      :hide-required-asterisk="true"
      label-position="top"
      :show-message="false"
      class="management_form"
    >
      <div class="management_form_grid">
        <el-form-item key="group" label="分组" prop="group">
          <el-select
            v-model="formData.group"
            placeholder="选择分组"
            style="width: 100%;"
          >
            <el-option
              v-for="item in groupList"
              :key="item.id"
              :label="item.name"
              :value="item.id"
              :disabled="item.id === 'builtin'"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input
            v-model="formData.name"
            clearable
            placeholder="输入脚本名称"
            autocomplete="off"
          />
        </el-form-item>
      </div>
      <el-form-item label="描述" prop="description">
        <el-input
          v-model="formData.description"
          clearable
          placeholder="简要描述脚本用途（可选）"
          autocomplete="off"
        />
      </el-form-item>
      <el-form-item prop="command" label="脚本内容">
        <el-input
          v-model="formData.command"
          class="script_content_input"
          type="textarea"
          :rows="7"
          clearable
          autocomplete="off"
          placeholder="输入 Shell 脚本"
        />
      </el-form-item>
      <el-form-item label="编码方式" prop="useBase64">
        <el-radio-group v-model="formData.useBase64" class="management_choice_group">
          <el-radio :value="false" border>
            <span>直接发送</span>
            <el-tooltip placement="right">
              <template #content>
                <div style="max-width: 300px;">
                  适用于单行简单脚本。<br>
                  脚本内容会直接发送到终端。<br>
                  注意：多行脚本会逐行自动执行。
                </div>
              </template>
              <el-icon style="margin-left: 4px; cursor: help;"><QuestionFilled /></el-icon>
            </el-tooltip>
          </el-radio>
          <el-radio :value="true" border>
            <span>Base64 编码</span>
            <el-tooltip placement="right">
              <template #content>
                <div style="max-width: 300px;">
                  适用于多行复杂脚本。<br>
                  脚本通过Base64编码后发送，可以避免：<br>
                  • 特殊字符转义问题<br>
                  • heredoc标记冲突<br>
                  • 换行符兼容问题<br>
                  命令格式: echo '&lt;script&gt;' | base64 -d | bash
                </div>
              </template>
              <el-icon style="margin-left: 4px; cursor: help;"><QuestionFilled /></el-icon>
            </el-tooltip>
          </el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="handleSubmit">
        {{ isModify ? '保存修改' : '创建脚本' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, reactive, watch } from 'vue'
import { getCurrentInstance } from 'vue'
import { QuestionFilled } from '@element-plus/icons-vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  defaultData: {
    type: Object,
    default: () => ({})
  },
  defaultScript: {
    type: String,
    default: ''
  },
  defaultGroup: {
    type: String,
    default: 'default'
  }
})

const emit = defineEmits(['update:show', 'success',])

const { proxy: { $api, $message, $store } } = getCurrentInstance()

const visible = computed({
  get: () => props.show,
  set: (val) => emit('update:show', val)
})

const formRef = ref(null)

const groupList = computed(() => $store.scriptGroupList || [])
const formData = reactive({
  group: '',
  name: '',
  description: '',
  command: '',
  useBase64: false
})
const isModify = computed(() => Boolean(formData.id))

const rules = {
  group: { required: true, message: '选择一个分组' },
  name: { required: true, trigger: 'change' },
  description: { required: false, trigger: 'change' },
  command: { required: true, trigger: 'change' }
}

watch(() => props.defaultData, (newVal) => {
  if (newVal?.id) {
    Object.assign(formData, { ...newVal })
  }
}, { immediate: true, deep: true })

watch(() => props.defaultScript, (newVal) => {
  if (newVal && !formData.id) {
    formData.command = newVal
  }
}, { immediate: true })

watch(() => props.defaultGroup, (newVal) => {
  if (newVal && !formData.id) {
    if (newVal === 'builtin') {
      formData.group = 'default'
    } else {
      formData.group = newVal
    }
  }
}, { immediate: true })

const handleClose = () => {
  formRef.value?.resetFields()
  Object.assign(formData, {
    id: null,
    group: props.defaultGroup,
    name: '',
    description: '',
    command: props.defaultScript || '',
    useBase64: false
  })
}

const handleSubmit = () => {
  formRef.value.validate()
    .then(async () => {
      const data = { ...formData }
      if (isModify.value) {
        await $api.updateScript(data.id, data)
      } else {
        await $api.addScript(data)
      }
      visible.value = false
      await $store.getScriptCatalog()
      emit('success')
      $message.success('success')
    })
}
</script>

<style lang="scss" scoped>
.script_content_input {
  :deep(.el-textarea__inner) {
    font-family: var(--el-font-family-monospace, monospace);
  }
}
</style>
