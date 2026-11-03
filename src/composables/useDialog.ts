// 对话框管理（确认 / 输入 / 编辑文本），DialogHost.vue 渲染
import { reactive } from 'vue'

export interface ConfirmReq {
  title: string
  message?: string
  danger?: boolean
  okText?: string
}

export interface PromptReq {
  title: string
  label?: string
  value?: string
  placeholder?: string
  okText?: string
}

export interface EditReq {
  title: string
  text: string
  /** 文件后缀（用于编辑器的语法高亮） */
  ext?: string
  save: (text: string) => Promise<boolean>
}

export interface MoveReq {
  /** 被移动条目的名称 */
  name: string
  /** 被移动条目的完整路径 */
  fromPath: string
  isDir: boolean
  /** 打开时浏览的起始目录 */
  startPath: string
}

export const dialogs = reactive({
  confirm: null as (ConfirmReq & { resolve: (v: boolean) => void }) | null,
  prompt: null as (PromptReq & { resolve: (v: string | null) => void }) | null,
  edit: null as (EditReq & { resolve: (v: boolean) => void }) | null,
  move: null as (MoveReq & { resolve: (v: string | null) => void }) | null,
})

export function confirmDialog(req: ConfirmReq): Promise<boolean> {
  return new Promise((resolve) => {
    dialogs.confirm = { ...req, resolve }
  })
}

export function promptDialog(req: PromptReq): Promise<string | null> {
  return new Promise((resolve) => {
    dialogs.prompt = { ...req, resolve }
  })
}

export function editDialog(req: EditReq): Promise<boolean> {
  return new Promise((resolve) => {
    dialogs.edit = { ...req, resolve }
  })
}

/** 可视化选择目标文件夹；返回选中的目录路径，取消时为 null */
export function moveDialog(req: MoveReq): Promise<string | null> {
  return new Promise((resolve) => {
    dialogs.move = { ...req, resolve }
  })
}
