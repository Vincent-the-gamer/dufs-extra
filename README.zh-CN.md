# dufs-extra

为 [dufs](https://github.com/sigoden/dufs) 打造的软萌治愈系UI设计，覆盖浏览 / 上传 / 预览 / 文件管理全链路。

中文 · [English](README.md)

---

## 预览

![preview](./preview/preview.png)

## 简介

[dufs](https://github.com/sigoden/dufs) 是一个 Rust 编写的静态文件服务器。本项目为其提供一套完整的自定义网页界面。

## 功能特性

- **浏览**：面包屑导航、README.md 自动展示、卡片 / 列表双视图（偏好记忆、小屏自动落卡片）、客户端排序（名称自然排序）、服务端搜索（`?q=`）、可选分页（`config.limit`）
- **上传**：拖拽 + 多文件 + 文件夹递归，并发 5 个任务、逐文件进度，新建目录 / 新建文件
- **文件操作**：重命名、移动、删除（确认框）、文本在线编辑、zip 打包下载
- **详情抽屉**：点击文件/卡片右侧滑出，展示名称、类型、大小、修改时间、路径、SHA-256（检测到 `--allow-hash` 时）、预览区、下载与复制链接
- **复制链接**：普通链接 + 带 token 的分享链接（`?tokengen` → `?token=`，3 天有效）
- **预览**：图片、视频、音频、PDF、文本/代码（Prism 高亮）、Markdown、字幕（转 WebVTT）、音频元数据、字体查看器；Office / draw.io / JXL 等外部预览为可选开关
- **认证**：顶栏登录/登出（浏览器原生弹窗，CHECKAUTH / LOGOUT）
- **主题**：深浅模式（跟随系统 + 手动切换）、毛玻璃设计系统、滚动进度猫爪按钮、打字机一言
- **i18n**：中 / 英文自动检测，顶栏按钮一键切换，偏好持久化

## 使用

本项目基于 dufs **≥ 0.46.0** 构建。

在Release下载 `dufs-extra.zip`，解压，运行命令：

```bash
dufs --assets dufs-extra
```

## 环境要求

- dufs **≥ 0.46.0**（API 细节以该版本为准）
- 构建前端需要 Node.js + pnpm

## 快速开始

```bash
pnpm install     # 安装依赖
pnpm build       # 构建并改写产物（vue-tsc + vite + after-build.js）
dufs --assets ./dist   # 交给 dufs 使用
```

构建产物 `dist/` 是标准的 dufs assets 目录：`index.html` 内资源路径已被改写为 `__ASSETS_PREFIX__` 占位符，dufs 启动时会自动注入实际前缀。

启动后浏览器访问 dufs 默认端口 `http://127.0.0.1:5000`。如需上传、删除等写操作，按需给 dufs 加参数：

```bash
dufs --assets ./dist --allow-upload --allow-delete --allow-search --allow-archive --allow-hash
```

## 配置

配置项写在 `dist/index.html` 的 `window.__DUFS_MATERIAL_CONFIG__` 中，改完重新部署即可生效：

```js
window.__DUFS_MATERIAL_CONFIG__ = {
  page: { title: "我的网盘", logo: "/logo.png" },
  footer: "© 2026 …",
  background: { light: "/bg-light.png", dark: "/bg-dark.png" },
  theme: { light: "#66CCFF", dark: "#66CCFF" },
  glassmorphism: { appbar: true, filelist: true, readme: true, preview: true },
  limit: 50,            // 分页，0/缺省为不分页
  externalViewer: true, // Office / draw.io 等在线预览开关
  jxlPolyfill: true,    // JXL 解码 + Photopea 开关
  preferPreview: true,  // 打开文件时优先预览而非下载
  decorations: true,    // 猫爪按钮 / 打字机一言装饰
  codeHighlightMaxLines: 1000,
  codeHighlightMaxLineLength: 500,
}
```

## 开发

```bash
# 构建项目
pnpm run build

# 起一个本地 dufs 做后端（5000 端口，含认证 / 上传 / CORS）
dufs --auth admin:admin@/:rw --auth guest:guest@/ --enable-cors --allow-all --assets dist
```

然后访问 `http://127.0.0.1:5000` 即可联调上传、认证、token 全链路。

## i18n

- 自动检测浏览器语言：`zh*` → 中文，其余 → English
- 顶栏「中 / EN」按钮手动切换，偏好存 `localStorage`（`dufs.lang`）
- 词条位于 `src/i18n.ts`，新增文案需同时补充 `zh` 与 `en` 两份字典

## 项目结构

```
src/
├── api/            # dufs HTTP API 封装（IndexData 类型、请求/写操作/认证）
├── components/     # 顶栏、文件列表双视图、详情抽屉、预览组件族、上传遮罩、对话框…
├── composables/    # 主题、上传、对话框、Toast、文件操作
├── router/         # vue-router（history 模式）
├── styles/         # 设计令牌 + 基础样式 + 组件样式（lolimeow 移植）
├── utils/          # 文件类型推断、格式化、代码高亮、字幕转换…
└── i18n.ts         # 中英词条
```

## 许可

[MIT License](./LICENSE) @ Vincent-the-gamer 2026-现在