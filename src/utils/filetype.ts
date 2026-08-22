// 扩展名 → 类别 / 条目信息
import type { Category, FileEntry, PathItem } from '../api/types'
import { buildUrl, joinPath } from '../api/client'
import { t } from '../i18n'

const EXT_CATEGORY: Record<string, Category> = {
  // 图片
  png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', webp: 'image',
  svg: 'image', bmp: 'image', avif: 'image', ico: 'image', jxl: 'image',
  // 视频
  mp4: 'video', webm: 'video', mkv: 'video', mov: 'video', avi: 'video',
  m4v: 'video', ogv: 'video', flv: 'video', '3gp': 'video',
  // 音频
  mp3: 'audio', wav: 'audio', ogg: 'audio', flac: 'audio', m4a: 'audio',
  aac: 'audio', opus: 'audio', wma: 'audio', mid: 'audio', midi: 'audio',
  // PDF
  pdf: 'pdf',
  // 字体
  woff: 'font', woff2: 'font', ttf: 'font', otf: 'font',
  // 字幕
  srt: 'subtitle', vtt: 'subtitle', ass: 'subtitle', ssa: 'subtitle',
  // 文本
  txt: 'text', md: 'text', markdown: 'text', log: 'text', ini: 'text',
  cfg: 'text', conf: 'text', csv: 'text', tsv: 'text', license: 'text',
  // 代码
  js: 'code', ts: 'code', tsx: 'code', jsx: 'code', json: 'code',
  html: 'code', css: 'code', scss: 'code', less: 'code',
  py: 'code', rb: 'code', go: 'code', rs: 'code', java: 'code',
  c: 'code', h: 'code', cpp: 'code', cxx: 'code', hpp: 'code',
  cs: 'code', php: 'code', swift: 'code', kt: 'code', kts: 'code',
  sh: 'code', bash: 'code', zsh: 'code', yml: 'code', yaml: 'code',
  toml: 'code', xml: 'code', sql: 'code', vue: 'code', svelte: 'code',
  dockerfile: 'code', bat: 'code', ps1: 'code', diff: 'code', patch: 'code',
  // 压缩包
  zip: 'archive', rar: 'archive', '7z': 'archive', tar: 'archive',
  gz: 'archive', bz2: 'archive', xz: 'archive', zst: 'archive', tgz: 'archive',
  // 文档（在线预览走 externalViewer）
  doc: 'doc', docx: 'doc', xls: 'doc', xlsx: 'doc', ppt: 'doc', pptx: 'doc',
  odt: 'doc', ods: 'doc', odp: 'doc', rtf: 'doc', pages: 'doc',
  numbers: 'doc', key: 'doc',
  // 绘图
  drawio: 'drawio',
}

export function categoryOf(ext: string): Category {
  return EXT_CATEGORY[ext] ?? 'other'
}

export function getEntryInfo(item: PathItem, prefix: string, dirPath: string): FileEntry {
  const isDir = item.path_type === 'Dir' || item.path_type === 'SymlinkDir'
  const isSymlink = item.path_type === 'SymlinkDir' || item.path_type === 'SymlinkFile'
  const path = joinPath(dirPath, item.name)
  const url = buildUrl(prefix, path)
  const ext = isDir ? '' : (item.name.split('.').pop() ?? '').toLowerCase()
  const category: Category = isDir ? 'dir' : categoryOf(ext)
  return { item, name: item.name, path, url, isDir, isSymlink, ext, category, size: item.size, mtime: item.mtime }
}

export function categoryLabel(cat: Category): string {
  return t('cat.' + cat)
}

export function iconNameOf(e: FileEntry): string {
  if (e.isDir) return 'folder'
  switch (e.category) {
    case 'image':
      return 'image'
    case 'video':
      return 'film'
    case 'audio':
      return 'music'
    case 'archive':
      return 'archive'
    case 'font':
      return 'type'
    case 'code':
      return 'file-code'
    default:
      return 'file-text'
  }
}
