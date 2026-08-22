// 主题：深浅模式（跟随系统 + 手动切换），偏好存 localStorage
import { ref } from 'vue'
import { config } from '../config'

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
  // config.theme.{light,dark} 可覆盖品牌色 / 背景图
  const brand = themeMode.value === 'dark' ? config.theme?.dark : config.theme?.light
  if (brand) document.documentElement.style.setProperty('--lm-c-brand', brand)
  const bg = themeMode.value === 'dark' ? config.background?.dark : config.background?.light
  if (bg) document.documentElement.style.setProperty('--lm-bg-image', `url("${bg}")`)
}

export function toggleTheme(): void {
  themeMode.value = themeMode.value === 'dark' ? 'light' : 'dark'
  applyTheme()
}
