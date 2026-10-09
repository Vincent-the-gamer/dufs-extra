// 文件操作动作（预览/下载/复制链接/复制 token 链接/重命名/移动/删除/编辑/打包）
import { useRouter } from 'vue-router'
import type { FileEntry } from '../api/types'
import { buildUrl, genToken, getText, joinPath, move, putText, remove } from '../api/client'
import { state, refresh, openFull, prefix } from '../store'
import { t } from '../i18n'
import { copyText, dirname, tokenExpiryMs } from '../utils/format'
import { confirmDialog, editDialog, promptDialog } from './useDialog'
import { toastE, toastS } from './useToast'

export interface MenuItem {
  id: string
  icon?: string
  label?: string
  danger?: boolean
  divider?: boolean
}

export function useEntryActions() {
  const router = useRouter()

  const absUrl = (e: FileEntry) => window.location.origin + e.url

  // 点击文件名/行/卡片：目录进入；文件则打开预览（避免直接下载/新标签页的误触）。
  // 需要查看原始文件时用「在浏览器新标签页打开」菜单项（openExternal）。
  function open(e: FileEntry): void {
    if (e.isDir) {
      router.push(e.path)
    } else {
      preview(e)
    }
  }

  // 在浏览器新标签页打开文件本身（dufs 对文件 GET 返回原内容）
  function openExternal(e: FileEntry): void {
    window.open(e.url, '_blank', 'noopener')
  }

  // 预览入口：所有文件类型统一走全屏预览层
  function preview(e: FileEntry): void {
    if (e.isDir) return
    openFull(e)
  }

  function download(e: FileEntry): void {
    const a = document.createElement('a')
    a.href = e.isDir ? e.url + '?zip' : e.url
    a.download = e.name
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  async function copyLink(e: FileEntry): Promise<void> {
    const ok = await copyText(absUrl(e))
    if (ok) toastS(t('copied'))
    else toastE(t('copy.failed'))
  }

  async function copyToken(e: FileEntry): Promise<void> {
    if (!state.data?.auth) {
      toastE(t('token.needLogin'))
      return
    }
    try {
      const hex = await genToken(e.url)
      const ok = await copyText(`${absUrl(e)}?token=${hex}`)
      const exp = tokenExpiryMs(hex)
      const msg = ok ? t('copied') : t('copy.failed')
      toastS(exp ? `${msg} · ${t('token.expire', { date: new Date(exp).toLocaleString() })}` : msg)
    } catch {
      toastE(t('token.needLogin'))
    }
  }

  async function rename(e: FileEntry): Promise<void> {
    const name = await promptDialog({ title: t('rename'), label: t('dialog.newName'), value: e.name })
    if (name == null || !name.trim()) return
    const dest = buildUrl(prefix.value, joinPath(dirname(e.path), name.trim()))
    try {
      await move(e.url, dest)
      toastS(t('renamed'))
      refresh()
    } catch {
      toastE(t('failed'))
    }
  }

  async function moveTo(e: FileEntry): Promise<void> {
    const target = await promptDialog({
      title: t('move'),
      label: t('dialog.moveTarget'),
      placeholder: t('dialog.moveHint'),
    })
    if (target == null || !target.trim()) return
    const destPath = target.trim().startsWith('/')
      ? target.trim()
      : joinPath(dirname(e.path), target.trim())
    try {
      await move(e.url, buildUrl(prefix.value, destPath))
      toastS(t('moved'))
      refresh()
    } catch {
      toastE(t('failed'))
    }
  }

  async function removeEntry(e: FileEntry): Promise<void> {
    const ok = await confirmDialog({
      title: t('dialog.removeTitle'),
      message: t('dialog.removeMsg', { name: e.name }),
      danger: true,
      okText: t('remove'),
    })
    if (!ok) return
    try {
      await remove(e.url)
      toastS(t('removed'))
      refresh()
    } catch {
      toastE(t('failed'))
    }
  }

  async function edit(e: FileEntry): Promise<void> {
    let text: string
    try {
      text = await getText(e.url)
    } catch {
      toastE(t('failed'))
      return
    }
    const saved = await editDialog({
      title: t('edit.title', { name: e.name }),
      text,
      save: async (v) => {
        try {
          await putText(e.url, v)
          return true
        } catch {
          return false
        }
      },
    })
    if (saved) {
      toastS(t('saved'))
      refresh()
    }
  }

  function menuItems(e: FileEntry): MenuItem[] {
    const data = state.data
    const canWrite = !!data?.allow_upload
    const canDelete = !!data?.allow_delete
    const canArchive = !!data?.allow_archive
    const items: MenuItem[] = []

    if (e.isDir) {
      items.push({ id: 'open', icon: 'folderOpen', label: t('open') })
      if (canArchive) items.push({ id: 'zip', icon: 'archive', label: t('zip') })
    } else {
      items.push({ id: 'preview', icon: 'eye', label: t('preview') })
      items.push({ id: 'open', icon: 'external', label: t('open.new') })
      items.push({ id: 'download', icon: 'download', label: t('download') })
    }
    items.push({ divider: true, id: 'd1' })
    items.push({ id: 'copyLink', icon: 'link', label: t('copy.link') })
    items.push({ id: 'copyToken', icon: 'key', label: t('copy.token') })
    if (canWrite) {
      items.push({ divider: true, id: 'd2' })
      if (!e.isDir && (e.category === 'text' || e.category === 'code' || e.category === 'subtitle')) {
        items.push({ id: 'edit', icon: 'pencil', label: t('edit') })
      }
      items.push({ id: 'rename', icon: 'type', label: t('rename') })
      items.push({ id: 'move', icon: 'move', label: t('move') })
    }
    if (canDelete) {
      items.push({ divider: true, id: 'd3' })
      items.push({ id: 'remove', icon: 'trash', label: t('remove'), danger: true })
    }
    return items
  }

  async function handle(id: string, e: FileEntry): Promise<void> {
    switch (id) {
      case 'open':
        if (e.isDir) open(e)
        else openExternal(e)
        break
      case 'preview':
        preview(e)
        break
      case 'download':
      case 'zip':
        download(e)
        break
      case 'copyLink':
        await copyLink(e)
        break
      case 'copyToken':
        await copyToken(e)
        break
      case 'rename':
        await rename(e)
        break
      case 'move':
        await moveTo(e)
        break
      case 'remove':
        await removeEntry(e)
        break
      case 'edit':
        await edit(e)
        break
    }
  }

  return { open, openExternal, preview, download, copyLink, copyToken, rename, moveTo, removeEntry, edit, menuItems, handle }
}
