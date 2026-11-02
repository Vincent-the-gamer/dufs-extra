// 下载队列：Range 分块 + 断点续传（失败后从已写入位置继续）
// 小文件在内存中拼接 Blob；大文件在支持 File System Access 的浏览器里直接落盘
import { reactive } from 'vue'
import { ApiError, isAbortError } from '../api/client'
import type { FileEntry } from '../api/types'
import {
  DOWNLOAD_CHUNK_SIZE,
  DOWNLOAD_DISK_THRESHOLD,
  DOWNLOAD_MAX_RETRIES,
} from '../config'
import { t } from '../i18n'

export type DownloadStatus = 'pending' | 'downloading' | 'done' | 'error'

export interface DownloadItem {
  id: number
  name: string
  size: number
  loaded: number
  progress: number
  status: DownloadStatus
  error?: string
  /** 当前自动重试次数（0 表示未在续传） */
  attempt: number
}

interface FsWritable {
  write(data: Blob | BufferSource | string): Promise<void>
  seek(position: number): Promise<void>
  close(): Promise<void>
  abort(): Promise<void>
}

interface FsHandle {
  createWritable(options?: { keepExistingData?: boolean }): Promise<FsWritable>
}

type SavePicker = (options?: { suggestedName?: string }) => Promise<FsHandle>

interface Job {
  item: DownloadItem
  url: string
  controller: AbortController
  parts: Blob[]
  handle?: FsHandle
  writable?: FsWritable
  loaded: number
}

// 模块级单例：任意组件里的「下载」都汇入同一个浮层
export const downloads = reactive({ items: [] as DownloadItem[] })

const jobs = new Map<number, Job>()
let uid = 0

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getSavePicker(): SavePicker | null {
  const picker = (window as unknown as { showSaveFilePicker?: SavePicker }).showSaveFilePicker
  return typeof picker === 'function' ? picker.bind(window) : null
}

function nativeDownload(url: string, name: string): void {
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

function saveBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob)
  nativeDownload(url, name)
  // 留足浏览器接管下载的时间再释放
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

function isRetryable(e: unknown): boolean {
  if (isAbortError(e)) return false
  if (e instanceof ApiError) {
    return e.status >= 500 || e.status === 408 || e.status === 429
  }
  const msg = (e as Error)?.message
  // 服务端不支持 Range 属于确定性错误，重试也不会变好
  if (msg === 'range not supported' || msg === 'unexpected content-range') return false
  return true
}

// 只接受 206 + 与请求起点一致的 Content-Range，避免把整文件重复写入
async function fetchChunk(
  url: string,
  start: number,
  end: number,
  signal: AbortSignal,
): Promise<Response> {
  const res = await fetch(url, {
    headers: { Range: `bytes=${start}-${end - 1}` },
    credentials: 'same-origin',
    signal,
  })
  if (res.status === 206) {
    const range = res.headers.get('content-range')?.trim()
    if (range && !range.startsWith(`bytes ${start}-`)) {
      await res.body?.cancel()
      throw new Error('unexpected content-range')
    }
    return res
  }
  await res.body?.cancel()
  if (res.status === 200) throw new Error('range not supported')
  throw new ApiError(res.status, res.statusText)
}

function updateProgress(job: Job): void {
  const { item } = job
  item.loaded = job.loaded
  item.progress = item.size ? Math.min(1, job.loaded / item.size) : 0
}

// 消费一个分块：落盘模式边读边写，内存模式攒成 Blob
async function consumeChunk(res: Response, job: Job): Promise<void> {
  const start = job.loaded
  if (job.writable) {
    const reader = res.body?.getReader()
    if (!reader) throw new Error('response body is not readable')
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      await job.writable.write(value)
      job.loaded += value.byteLength
      updateProgress(job)
    }
  } else {
    const blob = await res.blob()
    job.parts.push(blob)
    job.loaded += blob.size
    updateProgress(job)
  }
  if (job.loaded === start) throw new Error('empty response')
}

async function runJob(job: Job): Promise<void> {
  const { item } = job
  item.status = 'downloading'
  let failures = 0

  try {
    while (job.loaded < item.size) {
      if (job.controller.signal.aborted) throw new DOMException('Aborted', 'AbortError')
      const start = job.loaded
      const end = Math.min(start + DOWNLOAD_CHUNK_SIZE, item.size)
      try {
        const res = await fetchChunk(job.url, start, end, job.controller.signal)
        await consumeChunk(res, job)
        failures = 0
        item.attempt = 0
      } catch (e) {
        if (isAbortError(e) || !isRetryable(e) || failures >= DOWNLOAD_MAX_RETRIES) throw e
        failures++
        item.attempt = failures
        // job.loaded 只统计真正写成功的字节，续传自然从断点开始
        await sleep(Math.min(1000 * 2 ** (failures - 1), 8000))
      }
    }
    await finishJob(job)
  } catch (e) {
    if (isAbortError(e)) await cancelJob(job)
    else await failJob(job, e)
  }
}

async function finishJob(job: Job): Promise<void> {
  const { item } = job
  if (job.writable) {
    await job.writable.close()
  } else {
    const blob = new Blob(job.parts)
    job.parts = []
    saveBlob(blob, item.name)
  }
  item.loaded = item.size
  item.progress = 1
  item.attempt = 0
  item.status = 'done'
  jobs.delete(item.id)
}

async function failJob(job: Job, e: unknown): Promise<void> {
  const { item } = job
  if (job.writable) {
    // 关闭以提交已写入的部分，手动重试时可从该位置继续
    try {
      await job.writable.close()
    } catch {
      /* 磁盘写入本身失败时忽略 */
    }
    job.writable = undefined
  }
  item.status = 'error'
  item.attempt = 0
  item.error =
    e instanceof ApiError
      ? `${e.status} ${e.message}`
      : (e as Error)?.message || t('download.failed')
}

async function cancelJob(job: Job): Promise<void> {
  try {
    await job.writable?.abort()
  } catch {
    /* ignore */
  }
  job.writable = undefined
  job.parts = []
  const i = downloads.items.findIndex((x) => x.id === job.item.id)
  if (i >= 0) downloads.items.splice(i, 1)
  jobs.delete(job.item.id)
}

function startJob(entry: FileEntry, handle?: FsHandle): void {
  const item = reactive<DownloadItem>({
    id: ++uid,
    name: entry.name,
    size: entry.size,
    loaded: 0,
    progress: 0,
    status: 'pending',
    attempt: 0,
  })
  const job: Job = {
    item,
    url: entry.url,
    controller: new AbortController(),
    parts: [],
    handle,
    loaded: 0,
  }
  downloads.items.push(item)
  jobs.set(item.id, job)

  if (handle) {
    void (async () => {
      try {
        job.writable = await handle.createWritable()
        await runJob(job)
      } catch (e) {
        await failJob(job, e)
      }
    })()
  } else {
    void runJob(job)
  }
}

/** 下载入口：目录走原生 zip 下载；文件走可续传的分块下载 */
export function downloadEntry(entry: FileEntry): void {
  if (entry.isDir) {
    nativeDownload(entry.url + '?zip', entry.name)
    return
  }

  const picker = getSavePicker()
  if (entry.size >= DOWNLOAD_DISK_THRESHOLD) {
    if (!picker) {
      // 浏览器不支持写盘：退回原生下载（无法续传）
      nativeDownload(entry.url, entry.name)
      return
    }
    // showSaveFilePicker 必须在用户手势内同步调用
    picker({ suggestedName: entry.name }).then(
      (handle) => startJob(entry, handle),
      (e) => {
        if (!isAbortError(e)) nativeDownload(entry.url, entry.name)
      },
    )
    return
  }

  startJob(entry)
}

/** 手动重试：内存模式从已攒下的 Blob 继续；落盘模式重新打开并 seek 到断点 */
export function retryDownload(id: number): void {
  const job = jobs.get(id)
  if (!job || job.item.status !== 'error') return
  job.item.status = 'pending'
  job.item.error = undefined
  job.item.attempt = 0
  job.controller = new AbortController()

  if (job.handle) {
    void (async () => {
      try {
        const writable = await job.handle!.createWritable({ keepExistingData: true })
        await writable.seek(job.loaded)
        job.writable = writable
        await runJob(job)
      } catch (e) {
        await failJob(job, e)
      }
    })()
  } else {
    void runJob(job)
  }
}

export function cancelDownload(id: number): void {
  jobs.get(id)?.controller.abort()
}

/** 清空已完成 / 失败的条目（进行中的会保留） */
export function clearDownloads(): void {
  for (const it of [...downloads.items]) {
    if (it.status === 'done' || it.status === 'error') {
      jobs.delete(it.id)
      downloads.items.splice(downloads.items.indexOf(it), 1)
    }
  }
}
