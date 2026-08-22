import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// dufs 自定义资源：构建产物 dist/ 直接交给 `dufs --assets ./dist`
// 开发模式：8080 起 vite，/prefix 代理到本地 dufs（见 scripts/dev.mjs）
export default defineConfig({
  plugins: [vue()],
  base: '/',
  server: {
    port: 8080,
    proxy: {
      '/prefix': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: false,
      },
    },
  },
})
