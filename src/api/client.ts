// dufs HTTP API 客户端
// 事实依据（dufs v0.46.0）：
// - 列表：GET ?json → IndexData；搜索：?q=；服务端排序：?sort=&order=
// - 上传：PUT 原始 body（XHR 以获得进度）；断点续传：PATCH + X-Update-Range: append
// - 建目录：MKCOL；删除：DELETE；移动/复制：MOVE/COPY + Destination 头
// - 认证：浏览器原生 Basic/Digest（无需构造 Authorization 头）
// - 分享链接：GET ?tokengen → hex，拼 ?token=<hex>（3 天有效，仅 GET）

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

// 上传（XHR 以获得逐字节进度）
export function upload(url: string, file: File, onProgress?: (p: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total)
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new ApiError(xhr.status, xhr.responseText || xhr.statusText))
    }
    xhr.onerror = () => reject(new Error('network error'))
    xhr.send(file)
  })
}
