// after-build：把 Vite 产物 dist/index.html 改写成 dufs --assets 可直接使用的形态
// 1. 资源路径 /assets/...、/favicon.svg 改写为 __ASSETS_PREFIX__ 前缀（dufs 会注入实际前缀）
// 2. 注入 window.__DUFS_PREFIX__ 与 window.__INITIAL_DATA__（解析 __INDEX_DATA__ 占位符）
// 3. 移除仅开发使用的 __DUFS_API_PREFIX__ 脚本
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)));
const htmlPath = resolve(root, "dist/index.html");
let html = readFileSync(htmlPath, "utf8");

// 1. 资源路径 → __ASSETS_PREFIX__
html = html.replace(
  /(src|href)="\/(assets\/[^"]+)"/g,
  '$1="__ASSETS_PREFIX__$2"',
);
html = html.replace(
  /(src|href)="\/(favicon\.svg)"/g,
  '$1="__ASSETS_PREFIX__$2"',
);

// 2. 移除开发用 API 前缀脚本（独立 script 标签）
html = html.replace(
  /<script>[\s\S]*?window\.__DUFS_API_PREFIX__[\s\S]*?<\/script>/,
  "",
);

// 3. 注入 dufs 运行时占位变量
const inject = [
  "<script>",
  "window.__DUFS_PREFIX__ = '__ASSETS_PREFIX__'",
  'window.__INITIAL_DATA__ = JSON.parse(decodeURIComponent(escape(atob("__INDEX_DATA__"))))',
  "</script>",
].join("\n");
html = html.replace("</body>", inject + "</body>");

writeFileSync(htmlPath, html);
console.log("[after-build] dist/index.html 已改写为 dufs --assets 格式");
