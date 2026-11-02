// dufs HTTP API 客户端
// 事实依据（dufs v0.46.0）：
// - 列表：GET ?json → IndexData；搜索：?q=；服务端排序：?sort=&order=
// - 上传：PUT 原始 body（XHR 以获得进度）；断点续传：PATCH + X-Update-Range: append
// - 建目录：MKCOL；删除：DELETE；移动/复制：MOVE/COPY + Destination 头
// - 认证：浏览器原生 Basic/Digest（无需构造 Authorization 头）
// - 分享链接：GET ?tokengen → hex，拼 ?token=<hex>（3 天有效，仅 GET）

import { UPLOAD_CHUNK_SIZE, UPLOAD_MAX_RETRIES } from '../config'
import type { IndexData } from './types'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function joinPath(dir: string, name: string): string {
  const base = dir === '/' ? '' : dir.replace(/\/+$/, '')
  const n = String(name).replace(/^\/+/, '')
  return '/' + (base ? base + '/' : '') + n
}

export function buildUrl(prefix: string, path: string): string {
  const p = path.replace(/^\/+|\/+$/g, '')
  const base = prefix.endsWith('/') ? prefix : prefix + '/'
  return p ? base + p.split('/').map(encodeURIComponent).join('/') : base
}

async function request(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, { credentials: 'same-origin', ...init })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new ApiError(res.status, body || res.statusText)
  }
  return res
}

export function fetchIndex(prefix: string, path: string, opts?: { q?: string }): Promise<IndexData> {
  let url = buildUrl(prefix, path) + '?json'
  if (opts?.q) url += '&q=' + encodeURIComponent(opts.q)
  return request(url).then((r) => r.json() as Promise<IndexData>)
}

export function getText(url: string): Promise<string> {
  return request(url).then((r) => r.text())
}

// 二进制内容（Office 本地解析等）
export function getBuffer(url: string): Promise<ArrayBuffer> {
  return request(url).then((r) => r.arrayBuffer())
}

export function putText(url: string, text: string): Promise<Response> {
  return request(url, { method: 'PUT', body: text })
}

export function mkcol(url: string): Promise<Response> {
  return request(url, { method: 'MKCOL' })
}

export function remove(url: string): Promise<Response> {
  return request(url, { method: 'DELETE' })
}

export function move(url: string, destination: string): Promise<Response> {
  return request(url, { method: 'MOVE', headers: { Destination: destination } })
}

export function genToken(url: string): Promise<string> {
  return request(url + '?tokengen').then((r) => r.text().then((s) => s.trim()))
}

export async function fetchHash(url: string): Promise<string | null> {
  try {
    const r = await request(url + '?hash')
    return (await r.text()).trim()
  } catch {
    return null
  }
}

// 登录：CHECKAUTH?login 触发浏览器原生认证弹窗；登出：LOGOUT
export function checkAuth(prefix: string, path: string): Promise<string | null> {
  return request(buildUrl(prefix, path), { method: 'CHECKAUTH' })
    .then((r) => r.text())
    .catch(() => null)
}

export function logout(prefix: string, path: string): Promise<void> {
  return request(buildUrl(prefix, path), { method: 'LOGOUT' })
    .then(() => undefined)
    .catch(() => undefined)
}

export function isAbortError(e: unknown): boolean {
  return (e as { name?: string } | null)?.name === 'AbortError'
}

// 网络错误、超时、限流与服务端错误可以重试；4xx（除 408/429）重试没有意义
function isRetryable(e: unknown): boolean {
  if (isAbortError(e)) return false
  if (e instanceof ApiError) {
    return e.status >= 500 || e.status === 408 || e.status === 429
  }
  return true
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** 服务端已经落盘的字节数（用于断点续传）；文件不存在时返回 0 */
async function uploadedSize(url: string): Promise<number> {
  try {
    const res = await fetch(url, { method: 'HEAD', credentials: 'same-origin' })
    if (!res.ok) return 0
    return Number(res.headers.get('content-length') ?? 0) || 0
  } catch {
    return 0
  }
}

// 单块上传：XHR 以获得逐字节进度；PATCH + X-Update-Range: append 为 dufs 的追加协议
function sendChunk(
  url: string,
  method: 'PUT' | 'PATCH',
  body: Blob,
  onProgress: (loaded: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const xhr = new XMLHttpRequest()
    let settled = false
    const finish = (fn: () => void) => {
      if (settled) return
      settled = true
      signal?.removeEventListener('abort', onAbort)
      fn()
    }
    const onAbort = () => {
      xhr.abort()
      finish(() => reject(new DOMException('Aborted', 'AbortError')))
    }

    xhr.open(method, url)
    if (method === 'PATCH') xhr.setRequestHeader('X-Update-Range', 'append')
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded)
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) finish(resolve)
      else finish(() => reject(new ApiError(xhr.status, xhr.responseText || xhr.statusText)))
    }
    xhr.onerror = () => finish(() => reject(new Error('network error')))
    xhr.onabort = () => finish(() => reject(new DOMException('Aborted', 'AbortError')))
    signal?.addEventListener('abort', onAbort, { once: true })
    try {
      xhr.send(body)
    } catch (e) {
      finish(() => reject(e))
    }
  })
}

export interface UploadOptions {
  /** 已发送字节数 / 总字节数 */
  onProgress?: (loaded: number, total: number) => void
  /** 自动续传时触发；offset 为本次续传的起点 */
  onRetry?: (attempt: number, offset: number) => void
  /** 某一块被服务端确认写入后触发，供上层在手动重试时恢复 */
  onConfirmed?: (offset: number) => void
  /** 手动重试时传入上次已确认写入的偏移；0 表示从头开始 */
  resumeFrom?: number
  signal?: AbortSignal
}

/**
 * 断点续传上传：
 * - 首块用 PUT 创建/覆盖文件，后续块用 PATCH + `X-Update-Range: append` 追加；
 * - 任意块失败后 HEAD 查询服务端实际大小，从断点继续，而不是整文件重传；
 * - 首块尚未确认成功时不续传（服务端可能还是同名旧文件，追加会写坏内容）。
 */
export async function upload(url: string, file: File, opts: UploadOptions = {}): Promise<void> {
  const total = file.size
  const signal = opts.signal
  // confirmed 只会落在“已经确认属于本次上传”的偏移上
  let confirmed = Math.max(0, Math.min(opts.resumeFrom ?? 0, total))
  let offset = confirmed
  let attempt = 0

  if (confirmed > 0) {
    const persisted = await uploadedSize(url)
    if (persisted < confirmed || persisted > total) {
      // 服务端内容已不可信（被删/被换），从头重传
      confirmed = 0
      offset = 0
    } else {
      offset = persisted
    }
  }

  opts.onProgress?.(offset, total)

  while (offset < total) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    const start = offset
    const end = Math.min(start + UPLOAD_CHUNK_SIZE, total)
    const method = start === 0 ? 'PUT' : 'PATCH'

    try {
      await sendChunk(url, method, file.slice(start, end), (loaded) => {
        opts.onProgress?.(start + loaded, total)
      }, signal)
      offset = end
      confirmed = end
      attempt = 0
      opts.onProgress?.(offset, total)
      opts.onConfirmed?.(offset)
    } catch (e) {
      if (!isRetryable(e) || attempt >= UPLOAD_MAX_RETRIES) throw e
      attempt++

      if (confirmed === 0) {
        // 首块没有成功，服务端可能仍是同名旧文件：从 0 重新 PUT
        offset = 0
      } else {
        const persisted = await uploadedSize(url)
        // 只接受落在“已确认偏移 ~ 本次块末尾”之间的服务端大小
        if (persisted >= confirmed && persisted <= end) {
          offset = persisted
        } else {
          offset = 0
          confirmed = 0
        }
      }
      opts.onProgress?.(offset, total)
      opts.onRetry?.(attempt, offset)
      await sleep(Math.min(1000 * 2 ** (attempt - 1), 8000))
    }
  }
}
