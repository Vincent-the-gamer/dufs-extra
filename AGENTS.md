# dufs-extra — 项目共识文档

本文件记录 dufs-extra 项目的**设计共识**与**已核实的技术事实**，所有决策均经用户逐轮确认。

---

## 1. 项目目标

为 [dufs](https://github.com/sigoden/dufs)（Rust 静态文件服务器）做一套自定义前端页面：

- 参考功能实现：[TransparentLC/dufs-material-assets](https://github.com/TransparentLC/dufs-material-assets)（Vue3 + Vuetify + Vite，完整功能集）
- 参考视觉风格：[Yoyo-514/valaxy-theme-lolimeow](https://github.com/Yoyo-514/valaxy-theme-lolimeow)（软萌治愈系、毛玻璃、天蓝品牌色）
- 核心诉求：上传后可见每个文件的**详情信息**、支持**预览**、**复制文件链接**、界面美观

---

## 2. 关键技术事实（已调研核实，基线 dufs v0.46.0）

### 2.1 自定义资源加载方式

- 用法：`dufs --assets <目录>`（或环境变量 `DUFS_ASSETS`、配置文件 `assets:` 字段）。
- 目录**必须包含 `index.html`**，否则启动报错；若有 `404.html` 会作为自定义 404 页。
- `index.html` 支持两个占位符：
  - `__INDEX_DATA__`：目录列表数据，**base64 编码的 JSON**（`IndexData`，见 2.2）。material-assets 用 `JSON.parse(decodeURIComponent(escape(atob("__INDEX_DATA__"))))` 解析。
  - `__ASSETS_PREFIX__`：静态资源 URL 前缀，实际值为 `__dufs_v{VERSION}__/`（如 `__dufs_v0.46.0__/`）。
- `--assets` 目录的**完整目录结构原样静态暴露**在该前缀下：`<prefix>index.css`、`<prefix>index.js`、`<prefix>assets/xxx`、图片、字体等均可引用。
- dufs 对**目录**路径的 GET 请求返回注入过 `__INDEX_DATA__` 的 `index.html`；对**文件**路径的 GET 返回文件本身（不会返回页面）。因此 SPA 可行（history 路由刷新可用），但文件预览必须在 UI 内用对话框/抽屉做，不能靠 URL 跳转。
- 相关 CLI：`--render-spa`（任意路径都返回 index.html）、`--render-index`、`--render-try-index`。

### 2.2 HTTP API（自定义 UI 所需）

- **目录列表 JSON**：请求带 `?json` query 参数（不是 Accept 头）。返回 `IndexData`：

  | 字段 | 类型 | 说明 |
  |---|---|---|
  | `href` | string | 当前目录路径 |
  | `kind` | `"Index"` \| `"Edit"` \| `"View"` | 数据种类 |
  | `uri_prefix` | string | 路径前缀 |
  | `allow_upload` / `allow_delete` / `allow_search` / `allow_archive` | bool | 权限开关 |
  | `dir_exists` | bool | 目录是否存在 |
  | `auth` | bool | 是否配置了账号体系 |
  | `user` | string \| null | 当前登录用户名 |
  | `paths` | array | 见下 |

  `paths` 元素 `PathItem` **只有 4 个字段**：
  ```json
  { "path_type": "Dir" | "SymlinkDir" | "File" | "SymlinkFile",
    "name": "文件名",
    "mtime": 1710000000000,   // 毫秒时间戳
    "size": 12345 }
  ```
  ⚠️ **没有 `content_type`、`etag`、`is_dir`**——类型由 `path_type` 推断，详情面板的字段要靠前端按扩展名推断。

- 其他列表参数：`?simple`（纯名字列表）、`?sort=name|mtime|size&order=desc`（服务端排序）、`?q=<关键词>`（搜索，需 `--allow-search`，结果同 `IndexData`）。

- **写操作**（全部非标准 REST 方法）：
  - 上传：**`PUT` 原始 body**（不是 multipart！）。需 `--allow-upload`；覆盖已有文件还需 `--allow-delete`。成功返回 201。
  - 断点续传：`PATCH` + 请求头 `X-Update-Range: append`。
  - 建目录：`MKCOL`。已存在返回 405。
  - 删除：`DELETE`（目录递归删除）。需 `--allow-delete`。
  - 移动：`MOVE` + `Destination` 头。需 `--allow-upload` + `--allow-delete`。
  - 复制：`COPY` + `Destination` 头。需 `--allow-upload`，仅支持文件。返回 204。
  - 文件编辑：`PUT` 全量覆盖（先 GET 原文再 PUT 保存）。
  - 健康检查：`GET /__dufs__/health`。

- **下载/预览 URL**：直接 `GET 路径` 即为内容，响应 `Content-Disposition: inline`、`Accept-Ranges: bytes`、`ETag`、支持 Range/条件请求。**没有 `?download`、`?raw` 参数**。
  - 文件夹打包：`?zip`（需 `--allow-archive`）。
  - sha256：`?hash`（需 `--allow-hash`，返回十六进制字符串）。

### 2.3 认证

- **无 X-Api-Key、无 cookie、无 session**。只有：
  - HTTP **Basic / Digest**：浏览器原生弹窗，凭据由浏览器自动携带（前端不构造 `Authorization` 头、不存密码）。
  - **下载链接 token**：对文件 `GET ?tokengen` 拿 hex 串，拼成 `?token=<hex>` 附在 **GET** 请求上（仅 GET 有效），**有效期 3 天**。material-assets 从 hex 第 128–144 字符解析过期时间。
  - `CHECKAUTH` 方法：返回当前用户名（未认证返回 401）；带 `?login` 参数强制 401 触发浏览器原生认证弹窗。`LOGOUT` 方法：返回 401 让浏览器清除凭据。
- material-assets 的登录/登出实现：登录按钮 → XHR `CHECKAUTH?login` 触发原生弹窗；登出 → XHR `LOGOUT`。登录/登出按钮显隐由 `IndexData.auth` / `IndexData.user` 决定。

### 2.4 material-assets 构建方式（可直接照抄）

- Vite 8 + Vue 3.5 + vue-router（history 模式）+ Vuetify 4；pnpm。
- 产物：`dist/index.html` + `dist/assets/index-<hash>.js|css` + favicon。
- `after-build.js`：把 `dist/index.html` 里 `<link href="/assets/...">`、`<script src="/assets/...">` 的**绝对路径改写为 `__ASSETS_PREFIX__` 前缀**。
- `createHtmlPlugin`（vite-plugin-html）在产物 index.html 里注入 `window.__DUFS_PREFIX__ = '__ASSETS_PREFIX__'` 和 `window.__INITIAL_DATA__`（解析后的 `__INDEX_DATA__`）。
- 开发模式：固定起一个本地 dufs 做后端，脚本为
  `dufs --path-prefix /prefix/ --auth admin:admin@/:rw --auth guest:guest@/ --enable-cors --allow-all`。

---

## 3. 设计共识（已与用户逐项确认）

### 3.1 交付与架构

- **交付形态**：标准 assets 模式——仓库构建出 `dist/`，用户 `dufs --assets ./dist` 使用。不做嵌入二进制模式。
- **技术栈**：Vue 3 + TS + Vite（沿用现有脚手架，端口 8080）。**无组件库**，手写组件 + 手写 CSS 设计系统（移植 lolimeow 设计令牌）。
- **路由**：SPA + vue-router history 模式；不依赖额外服务端配合。
- **图标**：内联 SVG（material-assets 用 @mdi/js 打包 SVG path 的做法，不用图标字体）。

### 3.2 功能清单（完整集）

- **浏览**：面包屑；README.md 自动展示在目录顶部；**卡片网格 + 表格列表双视图**（工具栏切换，localStorage 记住偏好，小屏自动落卡片）；客户端排序（列头，名称用 natural sort）；服务端搜索 `?q=`（防抖）；可选分页 `limit`（沿用 material-assets 的 `config.limit`）。
- **上传**：拖拽 + 多文件 + 文件夹递归（`dataTransfer.items` + `webkitGetAsEntry`）；XHR `PUT`，body 为 File；并发信号量 5；逐文件进度。
- **文件操作**：新建目录（MKCOL）、新建文件（PUT 空文件后直接进入编辑）、文本编辑（GET 原文 → PUT 保存）、重命名/移动（MOVE + Destination 头）、删除（确认框，DELETE）、zip 打包下载（`?zip`）。
- **认证**：顶栏登录/登出按钮（CHECKAUTH?login / LOGOUT，浏览器原生弹窗）。
- **交互**：行悬停显示操作图标排（预览/下载/复制链接），更多操作收进"⋯"菜单（重命名/移动/删除/编辑/token 链接）。**无右键菜单、无批量操作**（明确不做，material-assets 也没有）。

### 3.3 详情抽屉（右侧，点击文件/卡片打开）

- 展示字段：名称、类型图标（扩展名推断）、大小（人性化格式）、修改时间、完整路径、预览区、下载按钮、复制链接按钮。
- sha256：检测到 `--allow-hash`（请求 `?hash` 成功）才显示，否则隐藏。
- 预览与详情同屏（抽屉内），预览类型同 3.2 预览清单。

### 3.4 复制链接

- **两种都提供**：普通链接 + 带 token 链接（`?tokengen` → `?token=`，3 天有效，可分享给匿名）。用户在详情抽屉/菜单中自选。

### 3.5 预览清单

- 离线可行、**全做**：图片（懒加载原图）、视频（`preload="metadata"` 取首帧）、音频、PDF、文本/代码（prism 高亮 + marked 渲染 Markdown）、字幕（subsrt 转 WebVTT）、音频元数据（jsmediatags）、字体查看器。
- 依赖外部服务、**默认关闭的配置开关**（沿用 material-assets 的 `externalViewer`、`jxlPolyfill` 机制）：微软 Office 在线预览、draw.io、jxl 解码 + Photopea。
- 文本预览注意：dufs 对文件 GET 返回原内容，直接 fetch 即可。

### 3.6 主题（lolimeow 设计令牌）

- **品牌色**：`#66CCFF`（可配置），`color-mix` 派生色阶。
- **表面体系**：毛玻璃（`backdrop-filter: blur(12–20px)` + 1px 描边 + 柔和阴影）；浅色玻璃底 `rgba(249,251,255,.82)`、深色 `rgba(5,8,22,.82)`。
- **圆角**：4 / 8 / 12 / 16 / ∞（卡片 16px，按钮/标签/滚动条胶囊）。
- **颜色**：浅色背景 `#f2f2f7`、深色 `#0b0b10`；正文 `#111` / `#f9fafb`；次要文字 `#48484a` / `#c7c7cc`；弱化 `#8e8e93` / `#9696a8`；成功 `#34c759`、警告 `#ffcc00`、危险 `#ff3b30`。
- **排版**：系统字体栈（`system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans'...`）+ 等宽栈；标题字重 700–900。
- **深浅模式**：跟随系统 + 手动切换（顶栏按钮），偏好存 localStorage。
- **背景图**：深浅各一张（可配置，material-assets 有 `background` 配置项）。
- **装饰（可开关，默认开）**：滚动进度猫爪按钮（SVG 猫爪按滚动进度被品牌色填充）、打字机一言。
- **滚动条**：品牌色胶囊（宽 ~0.55rem，圆角 ∞）。
- **动效基准**：~220ms ease-out；尊重 `prefers-reduced-motion`。

### 3.7 配置注入（沿用 material-assets 机制）

`window.__DUFS_MATERIAL_CONFIG__` 写进 index.html 即生效，键参考：`document`、`page.{title,logo}`、`footer`、`background`、`theme.{light,dark}`、`glassmorphism.*`、`limit`、`externalViewer`、`jxlPolyfill`、`preferPreview`、`codeHighlightMaxLines`、`codeHighlightMaxLineLength`。我们沿用并可按需扩展。

### 3.8 i18n

- **zh-CN + en 自动检测**（`navigator.language`，zh 给中文、其他给英文），无语言切换 UI（与 material-assets 一致，它做 5 语言）。

### 3.9 开发体验

- `pnpm dev`：一键起本地 dufs（`dufs --path-prefix /prefix/ --auth admin:admin@/:rw --auth guest:guest@/ --enable-cors --allow-all`）+ Vite 代理，真实联调上传/认证/token 链路。用户机器已装 dufs v0.46.0。

---

## 4. 明确不做（边界）

- 不做右键菜单、不做多选/批量操作。
- 不做嵌入 dufs 二进制的构建模式。
- 不做独立设置面板 / 用户密码存储——所有可配置项走 `window.__DUFS_MATERIAL_CONFIG__`。
- 目标 dufs 版本 = 0.46.0（最新）；API 细节如有版本差异以该版本源码为准。

## 5. 下一步（实现清单）

1. 清理脚手架（HelloWorld → 项目骨架：路由、布局、i18n、设计令牌 CSS）。
2. API 层（IndexData 类型、请求封装、上传/写操作/认证）。
3. 文件列表双视图 + 排序 + 搜索 + 面包屑 + README 展示。
4. 详情抽屉 + 预览组件族 + 复制链接（普通/token）。
5. 上传（拖拽/文件夹/进度）、文件操作菜单。
6. 主题系统（lolimeow 令牌 + 深浅模式 + 配置注入 + 装饰）。
7. after-build 改写脚本 + `pnpm dev` 联调脚本 + README 使用说明。
