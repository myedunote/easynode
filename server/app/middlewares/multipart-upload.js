import fsp from 'node:fs/promises'
import koaBodyModule from 'koa-body'

const { koaBody } = koaBodyModule

function getUploadedFiles(files = {}) {
  return Object.values(files).flatMap(file => Array.isArray(file) ? file : [file]).filter(Boolean)
}

async function cleanupMultipartUploadFiles(files) {
  const paths = [...new Set(getUploadedFiles(files).map(file => file.filepath).filter(Boolean))]
  const results = await Promise.allSettled(paths.map(filePath => fsp.unlink(filePath)))
  results.forEach(result => {
    if (result.status === 'rejected' && result.reason?.code !== 'ENOENT') {
      logger.warn('清理上传临时文件失败:', result.reason)
    }
  })
}

export function createMultipartUpload({
  fieldName = 'file',
  maxFiles = 1,
  maxFileSize,
  keepExtensions = false,
  messages = {}
} = {}) {
  if (!fieldName || !Number.isInteger(maxFiles) || maxFiles < 1) {
    throw new TypeError('multipart 上传字段和文件数量配置无效')
  }
  if (!Number.isFinite(maxFileSize) || maxFileSize < 1) {
    throw new TypeError('multipart 上传大小限制无效')
  }

  const parseMultipart = koaBody({
    multipart: true,
    formidable: {
      maxFileSize,
      // 必须保留全部文件引用，才能拒绝并清理重复字段和额外文件。
      multiples: true,
      keepExtensions
    }
  })

  return async function multipartUpload(ctx, next) {
    let parsingComplete = false
    try {
      await parseMultipart(ctx, async() => {
        parsingComplete = true
        const allFiles = getUploadedFiles(ctx.request.files)
        const fieldValue = ctx.request.files?.[fieldName]
        const fieldFiles = (Array.isArray(fieldValue) ? fieldValue : [fieldValue]).filter(Boolean)

        if (fieldFiles.length === 0) {
          return ctx.res.fail({ status: 422, msg: messages.required || '请选择上传文件' })
        }
        if (fieldFiles.length > maxFiles || fieldFiles.length !== allFiles.length) {
          return ctx.res.fail({ status: 422, msg: messages.fileCount || `最多只能上传 ${ maxFiles } 个文件` })
        }

        ctx.state.multipartUpload = {
          fieldName,
          files: fieldFiles,
          file: maxFiles === 1 ? fieldFiles[0] : null
        }
        return next()
      })
    } catch (error) {
      if (parsingComplete) throw error
      const tooLarge = error.status === 413 || error.httpCode === 413 || error.code === 1009
      ctx.res.fail({
        status: tooLarge ? 413 : 422,
        msg: tooLarge
          ? (messages.tooLarge || '上传文件超过大小限制')
          : (messages.invalid || '文件上传请求无效')
      })
    } finally {
      await cleanupMultipartUploadFiles(ctx.request.files)
    }
  }
}
