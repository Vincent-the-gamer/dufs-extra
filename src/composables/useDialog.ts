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
  save: (text: string) => Promise<boolean>
}

export const dialogs = reactive({
  confirm: null as (ConfirmReq & { resolve: (v: boolean) => void }) | null,
  prompt: null as (PromptReq & { resolve: (v: string | null) => void }) | null,
  edit: null as (EditReq & { resolve: (v: boolean) => void }) | null,
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
