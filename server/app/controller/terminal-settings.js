import { TerminalConfigDB } from '../utils/db-class.js'
import {
  formatTerminalSettingsError,
  migrateTerminalSettings,
  terminalSettingsSchema
} from '../utils/terminal-settings.js'
import {
  cleanupTerminalBackgroundAssets,
  createTerminalBackgroundReadStream,
  findTerminalBackgroundAsset,
  storeTerminalBackgroundFile
} from '../utils/terminal-background-assets.js'

const terminalConfigDB = new TerminalConfigDB().getInstance()

export async function getTerminalSettings({ res }) {
  try {
    const existingConfig = await terminalConfigDB.findOneAsync({}).sort({ updateTime: -1 })
    const settings = migrateTerminalSettings(existingConfig)
    if (settings.appearance.background.mode === 'image') {
      const asset = await findTerminalBackgroundAsset(settings.appearance.background.assetId)
      if (!asset) {
        settings.appearance.background.mode = 'theme'
        settings.appearance.background.assetId = null
      }
    }
    res.success({ data: settings })
  } catch (error) {
    logger.error('读取终端设置失败:', error)
    res.fail({ msg: '终端设置读取失败' })
  }
}

export async function saveTerminalSettings({ res, request }) {
  let settings
  try {
    settings = terminalSettingsSchema.parse(request.body || {})
  } catch (error) {
    return res.fail({ status: 422, msg: formatTerminalSettingsError(error) })
  }

  try {
    if (settings.appearance.background.mode === 'image') {
      const asset = await findTerminalBackgroundAsset(settings.appearance.background.assetId)
      if (!asset) return res.fail({ status: 422, msg: '背景图片不存在，请重新选择' })
    } else {
      settings.appearance.background.assetId = null
    }

    const existingConfig = await terminalConfigDB.findOneAsync({}).sort({ updateTime: -1 })
    const updateData = {
      ...settings,
      updateTime: new Date().toISOString()
    }

    if (existingConfig) {
      await terminalConfigDB.updateAsync(
        { _id: existingConfig._id },
        {
          _id: existingConfig._id,
          ...updateData,
          createTime: existingConfig.createTime || new Date().toISOString()
        }
      )
    } else {
      await terminalConfigDB.insertAsync({ ...updateData, createTime: new Date().toISOString() })
    }
    try {
      await cleanupTerminalBackgroundAssets({
        keepAssetId: settings.appearance.background.mode === 'image'
          ? settings.appearance.background.assetId
          : null,
        maxAgeMs: 0
      })
    } catch (cleanupError) {
      logger.warn('清理旧终端背景图片失败:', cleanupError)
    }
    res.success({ data: settings, msg: '终端设置保存成功' })
  } catch (error) {
    logger.error('保存终端设置失败:', error)
    res.fail({ msg: '终端设置保存失败' })
  }
}

export async function uploadTerminalBackground({ res, state = {} }) {
  const file = state.multipartUpload?.file
  if (!file) return res.fail({ status: 422, msg: '请选择一张背景图片' })

  try {
    const existingConfig = await terminalConfigDB.findOneAsync({}).sort({ updateTime: -1 })
    const settings = migrateTerminalSettings(existingConfig)
    const activeAssetId = settings.appearance.background.mode === 'image'
      ? settings.appearance.background.assetId
      : null
    await cleanupTerminalBackgroundAssets({ keepAssetId: activeAssetId })
    const { assetId } = await storeTerminalBackgroundFile(file)
    res.success({ data: { assetId }, msg: '背景图片上传成功' })
  } catch (error) {
    res.fail({ status: 422, msg: error.message || '背景图片上传失败' })
  }
}

export async function getTerminalBackground(ctx) {
  const { res, params } = ctx
  try {
    const existingConfig = await terminalConfigDB.findOneAsync({}).sort({ updateTime: -1 })
    const settings = migrateTerminalSettings(existingConfig)
    const activeAssetId = settings.appearance.background.mode === 'image'
      ? settings.appearance.background.assetId
      : null
    if (!activeAssetId || activeAssetId !== params.assetId) {
      return res.fail({ status: 404, msg: '背景图片不存在' })
    }
    const asset = await findTerminalBackgroundAsset(params.assetId)
    if (!asset) return res.fail({ status: 404, msg: '背景图片不存在' })

    ctx.type = asset.mimeType
    ctx.length = asset.size
    ctx.set('Cache-Control', 'private, max-age=31536000, immutable')
    ctx.body = createTerminalBackgroundReadStream(asset)
  } catch (error) {
    logger.error('读取终端背景图片失败:', error)
    res.fail({ msg: '背景图片读取失败' })
  }
}
