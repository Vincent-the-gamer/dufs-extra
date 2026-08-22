// dufs HTTP API 类型（dufs v0.46.0，IndexData 来自 ?json）

export type PathType = 'Dir' | 'SymlinkDir' | 'File' | 'SymlinkFile'
export type DataKind = 'Index' | 'Edit' | 'View'

export interface PathItem {
  path_type: PathType
  name: string
  mtime: number // 毫秒时间戳
  size: number
}

export interface IndexData {
  href: string
  kind: DataKind
  uri_prefix: string
  allow_upload: boolean
  allow_delete: boolean
  allow_search: boolean
  allow_archive: boolean
  dir_exists: boolean
  auth: boolean
  user: string | null
  paths: PathItem[]
}

// 前端推断出的文件类别
export type Category =
  | 'dir'
  | 'image'
  | 'video'
  | 'audio'
  | 'pdf'
  | 'text'
  | 'code'
  | 'archive'
  | 'font'
  | 'doc'
  | 'subtitle'
  | 'drawio'
  | 'other'

// 列表条目（含派生信息）
export interface FileEntry {
  item: PathItem
  name: string
  path: string // 完整路径，以 / 开头
  url: string // 可请求的 URL（含 uri_prefix）
  isDir: boolean
  isSymlink: boolean
  ext: string
  category: Category
  size: number
  mtime: number
}
