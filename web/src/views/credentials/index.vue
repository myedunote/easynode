<template>
  <div class="credentials_container data_page">
    <div class="data_page_toolbar">
      <span class="data_page_summary">共 <strong>{{ sshList.length }}</strong> 个凭据</span>
      <div class="toolbar_actions">
        <el-button type="primary" :icon="Plus" @click="addCredentials">添加凭据</el-button>
      </div>
    </div>
    <div class="data_table_wrap">
      <el-table v-loading="loading" :data="sshList" row-key="id" empty-text="暂无凭据">
        <el-table-column prop="name" label="名称" min-width="220" />
        <el-table-column prop="authType" label="类型" min-width="140">
          <template #default="{ row }">
            <el-tag effect="plain" :type="row.authType === 'privateKey' ? 'primary' : 'info'">
              {{ row.authType === 'privateKey' ? '密钥' : '密码' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column width="108" label="操作" align="right" header-align="right">
          <template #default="{ row }">
            <div class="credential_actions">
              <el-button text type="primary" @click="handleChange(row)">编辑</el-button>
              <el-button
                v-show="row.id !== 'default'"
                text
                type="danger"
                @click="removeSSH(row)"
              >
                删除
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>
    <el-dialog
      v-model="sshFormVisible"
      width="560px"
      top="6vh"
      class="management_dialog credential_form_dialog"
      :title="isModify ? '编辑凭据' : '添加凭据'"
      :close-on-click-modal="false"
      @close="clearFormInfo"
    >
      <template #header>
        <div class="management_dialog_title">
          <strong>{{ isModify ? '编辑凭据' : '添加凭据' }}</strong>
        </div>
      </template>
      <el-form
        ref="updateFormRef"
        :model="sshForm"
        :rules="rules"
        :hide-required-asterisk="true"
        label-position="top"
        :show-message="false"
        class="management_form"
      >
        <div class="management_form_grid">
          <el-form-item label="凭据名称" prop="name">
            <el-input
              v-model="sshForm.name"
              clearable
              placeholder="用于识别凭据"
              autocomplete="off"
            />
          </el-form-item>
          <el-form-item label="认证方式" prop="type">
            <el-radio-group v-model="sshForm.authType" class="management_choice_group">
              <el-radio value="privateKey">密钥</el-radio>
              <el-radio value="password">密码</el-radio>
            </el-radio-group>
          </el-form-item>
        </div>
        <el-form-item v-if="sshForm.authType === 'privateKey'" prop="privateKey" label="密钥">
          <el-button size="small" @click="handleClickUploadBtn">
            选择本地私钥
          </el-button>
          <input
            ref="privateKeyRef"
            type="file"
            name="privateKey"
            style="display: none;"
            @change="handleSelectPrivateKeyFile"
          >
          <el-input
            v-model="sshForm.privateKey"
            type="textarea"
            :rows="5"
            clearable
            autocomplete="off"
            style="margin-top: 5px;"
            placeholder="-----BEGIN RSA PRIVATE KEY-----"
          />
        </el-form-item>
        <el-form-item v-if="sshForm.authType === 'privateKey' && showOpenSSHKeyField" label="私钥密码">
          <el-input
            v-model="sshForm.openSSHKeyPassword"
            type="password"
            placeholder="请输入openssh私钥密码(没有密码请留空)"
            show-password
            autocomplete="off"
            clearable
          />
        </el-form-item>
        <el-form-item v-if="sshForm.authType === 'password'" prop="password" label="密码">
          <el-input
            v-model="sshForm.password"
            type="password"
            placeholder="输入密码"
            autocomplete="off"
            clearable
            show-password
          />
          <div v-if="passwordHasSpace" class="password-warning">
            <el-icon><WarningFilled /></el-icon>
            <span>密码中包含空格字符</span>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="management_dialog_actions">
          <el-button @click="sshFormVisible = false">取消</el-button>
          <el-button type="primary" @click="updateForm">
            {{ isModify ? '保存修改' : '创建凭据' }}
          </el-button>
        </div>
      </template>
    </el-dialog>
    <el-dialog
      v-model="keyPasswordVisible"
      width="400px"
      append-to-body
      class="management_dialog key_password_dialog"
      :close-on-click-modal="false"
    >
      <template #header>
        <div class="management_dialog_title"><strong>输入密钥密码</strong></div>
      </template>
      <el-form class="management_form management_form_single" @submit.prevent>
        <el-form-item class="key_password_field">
          <el-input
            v-model="keyPassword"
            type="password"
            placeholder="请输入密钥密码"
            show-password
            autocomplete="off"
            clearable
            @keyup.enter="handleDecryptKey"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="management_dialog_actions">
          <el-button @click="keyPasswordVisible = false">取消</el-button>
          <el-button type="primary" @click="handleDecryptKey">解密密钥</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, nextTick, getCurrentInstance, watch } from 'vue'
import { randomStr, AESEncrypt, RSAEncrypt } from '@utils/index.js'
import { Plus, WarningFilled } from '@element-plus/icons-vue'

const { proxy: { $api, $message, $messageBox, $store } } = getCurrentInstance()

const loading = ref(false)
const sshFormVisible = ref(false)
let isModify = ref(false)
const sshForm = reactive({
  name: '',
  authType: 'privateKey',
  privateKey: '',
  password: '',
  openSSHKeyPassword: ''
})

const rules = computed(() => {
  return {
    name: { required: true, message: '需输入凭据名称', trigger: 'change' },
    password: [{ required: !isModify.value && sshForm.authType === 'password', trigger: 'change' },],
    privateKey: [{ required: !isModify.value && sshForm.authType === 'privateKey', trigger: 'change' },]
  }
})

const updateFormRef = ref(null)
const privateKeyRef = ref(null)

let sshList = computed(() => $store.sshList)

// 检测密码是否包含空格
const passwordHasSpace = computed(() => {
  return sshForm.authType === 'password' && sshForm.password && sshForm.password.includes(' ')
})

let addCredentials = () => {
  sshForm.id = null
  sshFormVisible.value = true
  isModify.value = false
}
const handleChange = (row) => {
  Object.assign(sshForm, { ...row })
  sshFormVisible.value = true
  isModify.value = true
}

const updateForm = () => {
  updateFormRef.value.validate()
    .then(async () => {
      let formData = { ...sshForm }
      let tempKey = randomStr(16)
      // 加密传输
      if (formData.password) formData.password = AESEncrypt(formData.password, tempKey)
      if (formData.privateKey) formData.privateKey = AESEncrypt(formData.privateKey, tempKey)
      formData.tempKey = RSAEncrypt(tempKey)
      // 加密传输
      if (isModify.value) {
        await $api.updateSSH(formData)
      } else {
        await $api.addSSH(formData)
      }
      sshFormVisible.value = false
      await $store.getSSHList()
      $message.success('success')
    })
}

const clearFormInfo = () => {
  nextTick(() => updateFormRef.value.resetFields())
}

const removeSSH = ({ id, name }) => {
  $messageBox.confirm(`确认删除该凭据：${ name }`, 'Warning', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(async () => {
      await $api.removeSSH(id)
      await $store.getSSHList()
      await $store.getHostCatalog()
      $message.success('success')
    })
}

const handleClickUploadBtn = () => {
  privateKeyRef.value.click()
}

const keyPasswordVisible = ref(false)
const keyPassword = ref('')
const tempPrivateKey = ref('')
const showOpenSSHKeyField = ref(false)

// 监听私钥内容变化，自动检测密钥类型
watch(() => sshForm.privateKey, (newValue) => {
  if (!newValue) return showOpenSSHKeyField.value = false

  // 检查是否是加密的私钥
  if (newValue.includes('ENCRYPTED')) {
    tempPrivateKey.value = newValue
    keyPasswordVisible.value = true
  } else if (newValue.includes('OPENSSH PRIVATE KEY')) {
    // 如果是 OpenSSH 格式，显示密码字段
    showOpenSSHKeyField.value = true
  } else {
    showOpenSSHKeyField.value = false
  }
})

const handleSelectPrivateKeyFile = (event) => {
  let file = event.target.files[0]
  let reader = new FileReader()
  reader.onload = async (e) => {
    sshForm.privateKey = e.target.result
    privateKeyRef.value.value = ''
  }
  reader.readAsText(file)
}

const handleDecryptKey = async () => {
  if (!keyPassword.value) return $message.error('请输入密钥密码')
  const { data } = await $api.decryptPrivateKey({
    privateKey: tempPrivateKey.value,
    password: keyPassword.value
  })
  sshForm.privateKey = data
  keyPasswordVisible.value = false
  keyPassword.value = ''
  tempPrivateKey.value = ''
  $message.success('密钥解密成功')
}

</script>

<style lang="scss" scoped>
.credentials_container {
  .data_table_wrap {
    flex: 0 1 auto;
  }
}

.credential_actions {
  display: flex;
  justify-content: flex-end;
  gap: 0;

  :deep(.el-button) {
    padding-left: 5px;
    padding-right: 5px;
  }

  :deep(.el-button + .el-button) {
    margin-left: 0;
  }
}

.key_password_field {
  margin-bottom: 0;
}

.password-warning {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 5px;
  font-size: 13px;
  color: #CF8A20;
}

</style>
