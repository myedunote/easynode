import {
  getTerminalBackground,
  getTerminalSettings,
  saveTerminalSettings,
  uploadTerminalBackground
} from '../../controller/terminal-settings.js'
import { createMultipartUpload } from '../../middlewares/multipart-upload.js'
import { MAX_TERMINAL_BACKGROUND_SIZE } from '../../utils/terminal-background-assets.js'

const terminalBackgroundUpload = createMultipartUpload({
  fieldName: 'file',
  maxFiles: 1,
  maxFileSize: MAX_TERMINAL_BACKGROUND_SIZE,
  keepExtensions: true,
  messages: {
    required: '请选择一张背景图片',
    fileCount: '只能上传一张背景图片',
    tooLarge: '图片大小不能超过 5 MB',
    invalid: '背景图片上传请求无效'
  }
})

export default [
  {
    method: 'get',
    path: '/terminal-settings',
    controller: getTerminalSettings
  },
  {
    method: 'put',
    path: '/terminal-settings',
    controller: saveTerminalSettings
  },
  {
    method: 'post',
    path: '/terminal-settings/background',
    middlewares: [terminalBackgroundUpload],
    controller: uploadTerminalBackground
  },
  {
    method: 'get',
    path: '/terminal-settings/background/:assetId',
    controller: getTerminalBackground
  }
]
