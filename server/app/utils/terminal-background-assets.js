import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { terminalBackgroundAssetDir } from '../config/index.js'

export const MAX_TERMINAL_BACKGROUND_SIZE = 5 * 1024 * 1024
export const TERMINAL_BACKGROUND_TYPES = Object.freeze({
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp'
})

export function detectTerminalBackgroundType(buffer) {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png'
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg'
  }
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp'
  }
  return null
}

export async function validateTerminalBackgroundFile(file) {
  const sourcePath = file?.filepath
  const originalName = file?.originalFilename || ''
  const extension = path.extname(originalName).toLocaleLowerCase()
  const declaredType = String(file?.mimetype || '').toLocaleLowerCase()
  const size = Number(file?.size || 0)

  if (!sourcePath || !TERMINAL_BACKGROUND_TYPES[extension]) throw new Error('仅支持 PNG、JPEG 和 WebP 图片')
  if (declaredType !== TERMINAL_BACKGROUND_TYPES[extension]) throw new Error('图片扩展名与 MIME 类型不一致')
  if (!size || size > MAX_TERMINAL_BACKGROUND_SIZE) throw new Error('图片大小必须在 5 MB 以内')

  const handle = await fsp.open(sourcePath, 'r')
  try {
    const signature = Buffer.alloc(12)
    const { bytesRead } = await handle.read(signature, 0, signature.length, 0)
    const detectedType = detectTerminalBackgroundType(signature.subarray(0, bytesRead))
    if (detectedType !== declaredType) throw new Error('图片文件签名无效或与类型不一致')
  } finally {
    await handle.close()
  }

  return { sourcePath, extension, mimeType: declaredType }
}

export async function storeTerminalBackgroundFile(file, assetDir = terminalBackgroundAssetDir) {
  const validated = await validateTerminalBackgroundFile(file)
  const assetId = randomUUID()
  const targetPath = path.join(assetDir, `${ assetId }${ validated.extension }`)
  await fsp.mkdir(assetDir, { recursive: true })
  try {
    await fsp.rename(validated.sourcePath, targetPath)
  } catch (error) {
    if (error.code !== 'EXDEV') throw error
    await fsp.copyFile(validated.sourcePath, targetPath)
    await fsp.unlink(validated.sourcePath)
  }
  return { assetId, path: targetPath, mimeType: validated.mimeType }
}

export async function findTerminalBackgroundAsset(assetId, assetDir = terminalBackgroundAssetDir) {
  if (!/^[0-9a-f-]{36}$/i.test(String(assetId || ''))) return null
  for (const [extension, mimeType] of Object.entries(TERMINAL_BACKGROUND_TYPES)) {
    const assetPath = path.join(assetDir, `${ assetId }${ extension }`)
    try {
      const stat = await fsp.stat(assetPath)
      if (stat.isFile()) return { path: assetPath, mimeType, size: stat.size }
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
  }
  return null
}

export async function cleanupTerminalBackgroundAssets({ keepAssetId = null, maxAgeMs = 24 * 60 * 60 * 1000, assetDir = terminalBackgroundAssetDir } = {}) {
  let entries
  try {
    entries = await fsp.readdir(assetDir, { withFileTypes: true })
  } catch (error) {
    if (error.code === 'ENOENT') return
    throw error
  }

  const now = Date.now()
  await Promise.all(entries.map(async entry => {
    if (!entry.isFile()) return
    const match = entry.name.match(/^([0-9a-f-]{36})\.(?:png|jpe?g|webp)$/i)
    if (!match || match[1] === keepAssetId) return
    const assetPath = path.join(assetDir, entry.name)
    const stat = await fsp.stat(assetPath)
    if (maxAgeMs > 0 && now - stat.mtimeMs < maxAgeMs) return
    await fsp.unlink(assetPath)
  }))
}

export function createTerminalBackgroundReadStream(asset) {
  return fs.createReadStream(asset.path)
}
