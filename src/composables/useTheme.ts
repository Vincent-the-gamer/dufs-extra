// 主题：深浅模式（跟随系统 + 手动切换），偏好存 localStorage
import { ref } from 'vue'
import { config } from '../config'
// 内置壁纸：?inline 内联为 data URL 打进 bundle，
// 避免 --assets 模式下 __ASSETS_PREFIX__ 前缀解析问题，也无需额外的 dist 拷贝步骤
import wallpaperUrl from '../assets/wallpaper.jpg?inline'

export type ThemeMode = 'light' | 'dark'

function initial(): ThemeMode {
  const saved = localStorage.getItem('dufs.theme')
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export const themeMode = ref<ThemeMode>(initial())

export function applyTheme(): void {
  document.documentElement.dataset.theme = themeMode.value
  localStorage.setItem('dufs.theme', themeMode.value)
  // config.theme.{light,dark} 可覆盖品牌色
  const brand = themeMode.value === 'dark' ? config.theme?.dark : config.theme?.light
  if (brand) document.documentElement.style.setProperty('--lm-c-brand', brand)
  // 背景图：优先 index.html 里配置的链接；未配置则用内联的内置壁纸
  const configured = themeMode.value === 'dark' ? config.background?.dark : config.background?.light
  const bg = configured ?? wallpaperUrl
  document.documentElement.style.setProperty('--lm-bg-image', `url("${bg}")`)
}

export function toggleTheme(): void {
  themeMode.value = themeMode.value === 'dark' ? 'light' : 'dark'
  applyTheme()
}
