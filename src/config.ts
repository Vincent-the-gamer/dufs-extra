// 运行时配置：window.__DUFS_MATERIAL_CONFIG__（写进 index.html 即生效，沿用 material-assets 机制）
// 开发模式另有 window.__DUFS_API_PREFIX__（vite 代理到本地 dufs），构建时被 after-build.js 移除

import type { IndexData } from './api/types'

export interface DufsConfig {
  document?: string
  page?: { title?: string; logo?: string }
  footer?: string
  background?: { light?: string; dark?: string }
  theme?: { light?: string; dark?: string }
  glassmorphism?: { appbar?: boolean; filelist?: boolean; readme?: boolean; preview?: boolean }
  limit?: number
  externalViewer?: boolean
  jxlPolyfill?: boolean
  preferPreview?: boolean
  codeHighlightMaxLines?: number
  codeHighlightMaxLineLength?: number
  decorations?: boolean
}

declare global {
  interface Window {
    __DUFS_MATERIAL_CONFIG__?: Partial<DufsConfig>
    __DUFS_PREFIX__?: string
    __DUFS_API_PREFIX__?: string
    __INITIAL_DATA__?: IndexData
  }
}

export const config: Partial<DufsConfig> = window.__DUFS_MATERIAL_CONFIG__ ?? {}
// 生产：dufs 注入的 __ASSETS_PREFIX__（如 __dufs_v0.46.0__/）；开发：空
export const ASSETS_PREFIX: string = window.__DUFS_PREFIX__ ?? ''
// 开发：vite 代理前缀；生产：从 IndexData.uri_prefix 取
export const DEV_API_PREFIX: string = window.__DUFS_API_PREFIX__ ?? '/prefix/'
// 生产：dufs 注入的目录列表数据
export const BOOT_DATA: IndexData | undefined = window.__INITIAL_DATA__

export function assetUrl(p: string): string {
  return ASSETS_PREFIX + p
}

export function glass(key: keyof NonNullable<DufsConfig['glassmorphism']>): boolean {
  return config.glassmorphism?.[key] !== false
}

// 文本预览/编辑的安全上限
export const MAX_PREVIEW_BYTES = 5 * 1024 * 1024
export const MAX_AUDIO_META_BYTES = 100 * 1024 * 1024
export const UPLOAD_CONCURRENCY = 5
