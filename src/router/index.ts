import { createRouter, createWebHistory } from 'vue-router'
import FileList from '../components/FileList.vue'

// history 模式：dufs 对目录路径返回注入过 __INDEX_DATA__ 的 index.html，刷新可用
export default createRouter({
  history: createWebHistory(),
  routes: [{ path: '/:path(.*)*', name: 'browse', component: FileList }],
})
