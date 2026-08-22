// 上传队列：并发信号量 + 逐文件进度 + 文件夹递归采集
import { computed, reactive, ref } from 'vue'
import { buildUrl, joinPath, upload } from '../api/client'
import { UPLOAD_CONCURRENCY } from '../config'

export type UploadStatus = 'pending' | 'uploading' | 'done' | 'error'

export interface UploadItem {
  id: number
  name: string
  url: string
  size: number
  progress: number
  status: UploadStatus
  error?: string
}

export interface UploadSource {
  file: File
  rel: string // 相对当前目录的路径（文件夹递归时含子路径）
}

let uid = 0
const MAX_FILES = 5000

export function useUpload(getPrefix: () => string, getDir: () => string, onSettled?: () => void) {
  const items = ref<UploadItem[]>([])
  const active = ref(0)
  const queue: { item: UploadItem; file: File }[] = []

  const busy = computed(() => items.value.some((x) => x.status === 'pending' || x.status === 'uploading'))

  function push(sources: UploadSource[]): void {
    const prefix = getPrefix()
    const dir = getDir()
    for (const s of sources) {
      const path = joinPath(dir, s.rel)
      // 必须 reactive 包装后再入队：queue 闭包持有同一代理，
      // 直接改裸对象会绕过 Proxy 的 set 陷阱，进度/状态无法触发渲染
      const item = reactive<UploadItem>({
        id: ++uid,
        name: s.rel || s.file.name,
        url: buildUrl(prefix, path),
        size: s.file.size,
        progress: 0,
        status: 'pending',
      })
      items.value.push(item)
      queue.push({ item, file: s.file })
    }
    pump()
  }

  function pump(): void {
    while (active.value < UPLOAD_CONCURRENCY && queue.length) {
      const { item, file } = queue.shift()!
      active.value++
      item.status = 'uploading'
      upload(item.url, file, (p) => {
        item.progress = p
      })
        .then(() => {
          item.status = 'done'
          item.progress = 1
        })
        .catch((e) => {
          item.status = 'error'
          item.error = (e as Error)?.message ?? ''
        })
        .finally(() => {
          active.value--
          pump()
          if (!queue.length && active.value === 0) {
            setTimeout(() => onSettled?.(), 500)
          }
        })
    }
  }

  function reset(): void {
    queue.length = 0
    items.value = []
  }

  return { items, busy, push, reset }
}

// 从 DataTransfer 递归采集文件（含文件夹）
export async function collectFilesFromDrop(dt: DataTransfer): Promise<UploadSource[]> {
  const out: UploadSource[] = []
  const tasks: Promise<void>[] = []
  const items = Array.from(dt.items ?? [])

  for (const it of items) {
    const entry = it.webkitGetAsEntry?.()
    if (entry) {
      tasks.push(walk(entry, '', out))
    } else if (it.kind === 'file') {
      const f = it.getAsFile()
      if (f) out.push({ file: f, rel: f.name })
    }
  }
  await Promise.all(tasks)
  return out
}

async function walk(entry: FileSystemEntry, base: string, out: UploadSource[]): Promise<void> {
  if (out.length >= MAX_FILES) return
  if (entry.isFile) {
    const f = await new Promise<File | null>((res) =>
      (entry as FileSystemFileEntry).file(res, () => res(null)),
    )
    if (f) out.push({ file: f, rel: base ? `${base}/${f.name}` : f.name })
  } else if (entry.isDirectory) {
    const dir = base ? `${base}/${entry.name}` : entry.name
    const reader = (entry as FileSystemDirectoryEntry).createReader()
    for (;;) {
      const batch = await new Promise<FileSystemEntry[]>((res) =>
        reader.readEntries(res, () => res([])),
      )
      if (!batch.length) break
      await Promise.all(batch.map((e) => walk(e, dir, out)))
    }
  }
}
