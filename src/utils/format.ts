// 通用工具函数
import { lang } from '../i18n'

export function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB', 'PB']
  let v = bytes
  let i = -1
  do {
    v /= 1024
    i++
  } while (v >= 1024 && i < units.length - 1)
  const digits = v >= 100 ? 0 : v >= 10 ? 1 : 2
  return `${v.toFixed(digits)} ${units[i]}`
}

export function formatDate(ms: number): string {
  if (!ms) return '—'
  const d = new Date(ms)
  const now = new Date()
  const locale = lang.value === 'zh' ? 'zh-CN' : 'en-US'
  const time = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === now.toDateString()) return time
  const date = d.toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return `${date} ${time}`
}

export function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
}

export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number): (...args: A) => void {
  let timer: ReturnType<typeof setTimeout> | undefined
  return (...args: A) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    /* fallback 到 execCommand */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

// token hex 第 128–144 字符为过期时间（毫秒）
export function tokenExpiryMs(hex: string): number | null {
  if (hex.length < 144) return null
  const n = parseInt(hex.slice(128, 144), 16)
  return Number.isFinite(n) ? n : null
}

export function dirname(path: string): string {
  const parts = path.split('/').filter(Boolean)
  parts.pop()
  return '/' + parts.join('/')
}

// URL 编码的路径还原为可读形式（decodeURIComponent 失败时原样返回）
export function decodePath(p: string): string {
  try {
    return decodeURIComponent(p)
  } catch {
    return p
  }
}

// 内部路径统一规范形：解码 + 去首尾斜杠（根路径保持 '/'）。
// 约定：state.path 等内部路径一律为解码后的可读路径，buildUrl 负责唯一一次 URL 编码
export function normalizePath(p: string): string {
  const s = decodePath(p).replace(/^\/+|\/+$/g, '')
  return s ? '/' + s : '/'
}
