// 全局 Toast（模块级单例）
import { reactive } from 'vue'

export interface ToastMsg {
  id: number
  text: string
  type: 'success' | 'error' | 'info'
}

export const toasts = reactive({ list: [] as ToastMsg[] })

let uid = 0

export function toast(text: string, type: ToastMsg['type'] = 'info', ms = 3200): void {
  const item: ToastMsg = { id: ++uid, text, type }
  toasts.list.push(item)
  setTimeout(() => {
    const i = toasts.list.findIndex((x) => x.id === item.id)
    if (i >= 0) toasts.list.splice(i, 1)
  }, ms)
}

export function toastS(text: string): void {
  toast(text, 'success')
}

export function toastE(text: string): void {
  toast(text, 'error', 4200)
}
