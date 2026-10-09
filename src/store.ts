// 全局轻量状态（无 Pinia，模块级 reactive）
import { computed, reactive } from 'vue'
import type { FileEntry, IndexData } from './api/types'
import { fetchIndex, joinPath } from './api/client'
import { config, BOOT_DATA, DEV_API_PREFIX } from './config'
import { naturalCompare, normalizePath } from './utils/format'
import { getEntryInfo } from './utils/filetype'

export type ViewMode = 'card' | 'table'
export type SortKey = 'name' | 'mtime' | 'size'
export type SortDir = 'asc' | 'desc'

// 分页：默认每页条数；config.limit 可覆盖（0 = 不分页，全部显示）；
// 用户在 UI 上的选择优先并持久化到 localStorage
const DEFAULT_PAGE_SIZE = 20
const PAGE_SIZE_KEY = 'dufs.pageSize'

function initialPageSize(): number {
  const saved = localStorage.getItem(PAGE_SIZE_KEY)
  if (saved !== null) {
    const n = Number(saved)
    if (Number.isInteger(n) && n >= 0) return n
  }
  if (config.limit !== undefined && Number.isFinite(config.limit)) {
    return Math.max(0, Math.floor(config.limit))
  }
  return DEFAULT_PAGE_SIZE
}

function initialView(): ViewMode {
  const saved = localStorage.getItem('dufs.view')
  if (saved === 'card' || saved === 'table') return saved
  return window.innerWidth < 720 ? 'card' : 'table'
}

export const state = reactive({
  loading: false,
  error: '',
  data: null as IndexData | null,
  path: '/',
  search: '',
  sortKey: 'name' as SortKey,
  sortDir: 'asc' as SortDir,
  view: initialView() as ViewMode,
  page: 1,
  pageSize: initialPageSize(),
  fullOpen: false,
  fullEntry: null as FileEntry | null,
})

export const prefix = computed(() => state.data?.uri_prefix || BOOT_DATA?.uri_prefix || DEV_API_PREFIX)

// 由注入的 IndexData.href 反推页面路径（生产首屏免请求）。
// dufs 注入的 href 为 URL 编码形式（如 /%E4%B8%AD/），统一规范化为解码路径
export function bootPathFor(data: IndexData): string {
  const rel = data.uri_prefix && data.href.startsWith(data.uri_prefix)
    ? data.href.slice(data.uri_prefix.length)
    : data.href
  return normalizePath(rel)
}

export const entries = computed<FileEntry[]>(() => {
  const items = state.data?.paths ?? []
  const list = items.map((it) => getEntryInfo(it, prefix.value, state.path))
  const { sortKey, sortDir } = state
  list.sort((a, b) => {
    if (a.isDir !== b.isDir) return Number(b.isDir) - Number(a.isDir)
    let c = 0
    if (sortKey === 'name') c = naturalCompare(a.name, b.name)
    else if (sortKey === 'size') c = a.size - b.size
    else c = a.mtime - b.mtime
    return sortDir === 'asc' ? c : -c
  })
  return list
})

export const totalPages = computed(() =>
  state.pageSize ? Math.max(1, Math.ceil(entries.value.length / state.pageSize)) : 1,
)
export const paged = computed(() =>
  state.pageSize
    ? entries.value.slice((state.page - 1) * state.pageSize, state.page * state.pageSize)
    : entries.value,
)

export function setPageSize(n: number): void {
  const v = Math.max(0, Math.floor(n))
  state.pageSize = v
  state.page = 1
  localStorage.setItem(PAGE_SIZE_KEY, String(v))
}
export const readmeEntry = computed(() =>
  entries.value.find((e) => !e.isDir && /^readme(\.md|\.markdown)?$/i.test(e.name)),
)

export async function load(path: string, opts?: { search?: string; keepPage?: boolean }): Promise<void> {
  state.loading = true
  state.error = ''
  state.path = normalizePath(path)
  try {
    const data = await fetchIndex(prefix.value, state.path, { q: opts?.search ?? state.search })
    state.data = data
    if (opts?.keepPage) {
      // 上传/重命名/删除/编辑等刷新后维持原页码；条目减少导致页数收缩时收敛到最后一页
      const n = data.paths?.length ?? 0
      const total = state.pageSize > 0 ? Math.max(1, Math.ceil(n / state.pageSize)) : 1
      state.page = Math.min(Math.max(1, state.page), total)
    } else {
      state.page = 1
    }
    syncOverlays(data)
  } catch (e) {
    const status = (e as { status?: number })?.status
    state.error = status === 401 ? 'auth' : String((e as Error)?.message ?? e)
  } finally {
    state.loading = false
  }
}

export function refresh(): Promise<void> {
  return load(state.path, { search: state.search, keepPage: true })
}

// 数据刷新后同步全屏预览中的条目：
// - 条目仍在 → 用新数据替换（mtime/size 更新，预览组件随 key 重建重新加载）
// - 条目已不存在（删除/重命名/移动/目录切换）且未在搜索 → 关闭预览
function syncOverlays(data: IndexData): void {
  const cur = state.fullEntry
  if (!cur) return
  const fresh = (data.paths ?? []).find((it) => joinPath(state.path, it.name) === cur.path)
  if (fresh) state.fullEntry = getEntryInfo(fresh, prefix.value, state.path)
  else if (!state.search) closeFull()
}

export function setView(v: ViewMode): void {
  state.view = v
  localStorage.setItem('dufs.view', v)
}

export function setSort(k: SortKey): void {
  if (state.sortKey === k) {
    state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc'
  } else {
    state.sortKey = k
    state.sortDir = 'asc'
  }
}

// 打开全屏预览（所有文件类型的统一预览入口）
export function openFull(e: FileEntry): void {
  state.fullOpen = true
  state.fullEntry = e
}

export function closeFull(): void {
  state.fullOpen = false
  state.fullEntry = null
}
