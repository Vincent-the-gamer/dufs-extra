// 全局轻量状态（无 Pinia，模块级 reactive）
import { computed, reactive } from 'vue'
import type { FileEntry, IndexData } from './api/types'
import { fetchIndex } from './api/client'
import { config, BOOT_DATA, DEV_API_PREFIX } from './config'
import { naturalCompare } from './utils/format'
import { getEntryInfo } from './utils/filetype'

export type ViewMode = 'card' | 'table'
export type SortKey = 'name' | 'mtime' | 'size'
export type SortDir = 'asc' | 'desc'

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
  drawerOpen: false,
  drawerEntry: null as FileEntry | null,
})

export const prefix = computed(() => state.data?.uri_prefix || BOOT_DATA?.uri_prefix || DEV_API_PREFIX)

// 由注入的 IndexData.href 反推页面路径（生产首屏免请求）
export function bootPathFor(data: IndexData): string {
  const rel = data.uri_prefix && data.href.startsWith(data.uri_prefix)
    ? data.href.slice(data.uri_prefix.length)
    : data.href
  return '/' + rel.replace(/^\/+|\/+$/g, '')
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

export const pageSize = computed(() => (config.limit && config.limit > 0 ? config.limit : 0))
export const totalPages = computed(() =>
  pageSize.value ? Math.max(1, Math.ceil(entries.value.length / pageSize.value)) : 1,
)
export const paged = computed(() =>
  pageSize.value
    ? entries.value.slice((state.page - 1) * pageSize.value, state.page * pageSize.value)
    : entries.value,
)
export const readmeEntry = computed(() =>
  entries.value.find((e) => !e.isDir && /^readme(\.md|\.markdown)?$/i.test(e.name)),
)

export async function load(path: string, opts?: { search?: string }): Promise<void> {
  state.loading = true
  state.error = ''
  state.path = path
  try {
    const data = await fetchIndex(prefix.value, path, { q: opts?.search ?? state.search })
    state.data = data
    state.page = 1
  } catch (e) {
    const status = (e as { status?: number })?.status
    state.error = status === 401 ? 'auth' : String((e as Error)?.message ?? e)
  } finally {
    state.loading = false
  }
}

export function refresh(): Promise<void> {
  return load(state.path, { search: state.search })
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

export function openEntry(e: FileEntry): void {
  state.drawerOpen = true
  state.drawerEntry = e
}

export function closeDrawer(): void {
  state.drawerOpen = false
}
