// 列表内拖拽移动：把条目拖到文件夹（列表行 / 卡片 / 面包屑）上完成 MOVE
import { computed, reactive } from 'vue'
import type { FileEntry } from '../api/types'
import { buildUrl, joinPath, move } from '../api/client'
import { prefix, refresh, state } from '../store'
import { t } from '../i18n'
import { dirname } from '../utils/format'
import { toastE, toastS } from './useToast'

/**
 * 内部拖拽的私有 MIME 类型。
 * 用于与「从操作系统拖入文件上传」区分：dragover 阶段只能读 types，
 * 用自定义类型判断是否是页面内的条目拖拽。
 */
export const DRAG_MIME = 'application/x-dufs-entry'

/** 判定落点只需要路径与是否目录（FileEntry 结构上兼容） */
export interface MoveSource {
  path: string
  isDir: boolean
}

// 全局拖拽状态：同一时刻只拖动一个条目
const drag = reactive({
  entry: null as FileEntry | null,
  over: '',
})

/** 正在拖动的条目路径（用于给源条目降透明度） */
export const draggingPath = computed(() => drag.entry?.path ?? '')
/** 正在高亮的目标目录路径 */
export const dropTargetPath = computed(() => drag.over)

/** 有写权限（dufs 的 MOVE 依赖 allow_upload）时才允许拖拽移动 */
export const canDrag = computed(() => !!state.data?.allow_upload)

export function isInternalDrag(e: DragEvent): boolean {
  return !!e.dataTransfer?.types.includes(DRAG_MIME)
}

/** 是否可以把 src 移动到 dir：排除原目录、目录自身及其子目录 */
export function canDropInto(src: MoveSource, dir: string): boolean {
  if (dirname(src.path) === dir) return false
  if (src.isDir && (dir === src.path || dir.startsWith(src.path + '/'))) return false
  return true
}

/** 移动条目到目标目录（拖拽与对话框共用），返回是否成功 */
export async function moveInto(entry: FileEntry, dir: string): Promise<boolean> {
  if (!canDropInto(entry, dir)) {
    toastE(dirname(entry.path) === dir ? t('move.sameDir') : t('move.invalid'))
    return false
  }
  try {
    await move(entry.url, buildUrl(prefix.value, joinPath(dir, entry.name)))
    toastS(t('movedTo', { path: dir }))
    refresh()
    return true
  } catch {
    toastE(t('failed'))
    return false
  }
}

function clearDrag(): void {
  drag.entry = null
  drag.over = ''
}

/**
 * 拖拽事件处理器：
 * - 源条目：@dragstart / @dragend
 * - 目标文件夹：@dragover / @dragleave / @drop（参数为目标目录路径）
 */
export function useDragMove() {
  function onDragStart(e: DragEvent, entry: FileEntry): void {
    if (!canDrag.value || !e.dataTransfer) return
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData(DRAG_MIME, entry.path)
    // 部分浏览器要求存在 text/plain 才会真正开始拖拽
    e.dataTransfer.setData('text/plain', entry.name)
    drag.entry = entry
    drag.over = ''
  }

  function onDragEnd(): void {
    clearDrag()
  }

  function onDragOver(e: DragEvent, dir: string): void {
    const src = drag.entry
    if (!src || !isInternalDrag(e) || !canDropInto(src, dir)) {
      if (drag.over === dir) drag.over = ''
      return
    }
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
    drag.over = dir
  }

  function onDragLeave(e: DragEvent, dir: string): void {
    // 在行内单元格/子元素之间移动也会触发 dragleave，仍在元素内则忽略
    const to = e.relatedTarget as Node | null
    if (to && (e.currentTarget as HTMLElement).contains(to)) return
    if (drag.over === dir) drag.over = ''
  }

  async function onDrop(e: DragEvent, dir: string): Promise<void> {
    if (!isInternalDrag(e)) return
    const src = drag.entry
    clearDrag()
    if (!src || !canDropInto(src, dir)) return
    e.preventDefault()
    e.stopPropagation()
    await moveInto(src, dir)
  }

  return {
    canDrag,
    draggingPath,
    dropTargetPath,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDragLeave,
    onDrop,
  }
}
