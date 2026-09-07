<script setup lang="ts">
// Office 离线本地预览（无需外网，解析库随本组件按需动态加载）：
// - .xlsx / .xls  → SheetJS：按工作表渲染 HTML 表格
// - .docx         → docx-preview：还原文档排版
// 说明：旧版二进制 .doc 无纯前端渲染方案，不在此组件范围内（见 PreviewPanel）
import { computed, onMounted, ref } from "vue";
import type { FileEntry } from "../../api/types";
import { MAX_OFFICE_BYTES } from "../../config";
import { getBuffer } from "../../api/client";
import { t } from "../../i18n";
import SvgIcon from "../SvgIcon.vue";

const props = defineProps<{ entry: FileEntry }>();

const isDocx = computed(() => props.entry.ext === "docx");

const loading = ref(true);
const failed = ref(false);
const tooLarge = ref(false);

// —— xls / xlsx：SheetJS 逐工作表渲染 ——
interface SheetView {
    name: string;
    html: string;
}
const sheets = ref<SheetView[]>([]);
const sheetClipped = ref(false);

// —— docx：docx-preview 渲染容器 ——
const docxBox = ref<HTMLElement | null>(null);

// 表格防爆上限：行/列超出即截断并在底部提示
const MAX_ROWS = 2000;
const MAX_COLS = 128;
const SIZE_LIMIT = "100 MB";

async function load(): Promise<void> {
    if (props.entry.size > MAX_OFFICE_BYTES) {
        tooLarge.value = true;
        loading.value = false;
        return;
    }
    try {
        const buf = await getBuffer(props.entry.url);
        if (isDocx.value) await renderDocx(buf);
        else await renderSheets(buf);
    } catch {
        failed.value = true;
    } finally {
        loading.value = false;
    }
}

onMounted(() => {
    void load();
});

async function renderSheets(buf: ArrayBuffer): Promise<void> {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(buf, { type: "array", sheetRows: MAX_ROWS });
    const views: SheetView[] = [];
    let clipped = false;
    for (const name of wb.SheetNames) {
        const ws = wb.Sheets[name] as
            | (XLSX.WorkSheet & { "!fullref"?: string })
            | undefined;
        if (!ws || !ws["!ref"]) continue;
        const range = XLSX.utils.decode_range(ws["!ref"]);
        if (ws["!fullref"]) {
            const full = XLSX.utils.decode_range(ws["!fullref"]);
            if (full.e.r > range.e.r || full.e.c > range.e.c) clipped = true;
        }
        // 列数超限：收窄 !ref 后渲染（行已由 sheetRows 截断）
        if (range.e.c >= MAX_COLS) {
            range.e.c = MAX_COLS - 1;
            if (range.e.c < range.s.c) continue;
            ws["!ref"] = XLSX.utils.encode_range(range);
            // 裁掉超出可视范围的合并单元格，避免撑出超宽表格
            ws["!merges"] = (ws["!merges"] ?? [])
                .map((m) => ({
                    s: {
                        r: Math.min(m.s.r, range.e.r),
                        c: Math.min(m.s.c, range.e.c),
                    },
                    e: {
                        r: Math.min(m.e.r, range.e.r),
                        c: Math.min(m.e.c, range.e.c),
                    },
                }))
                .filter((m) => m.e.r >= m.s.r && m.e.c >= m.s.c);
            clipped = true;
        }
        const html = XLSX.utils.sheet_to_html(ws);
        views.push({ name, html: tableInner(html) });
    }
    if (!views.length) throw new Error("empty workbook");
    sheets.value = views;
    sheetClipped.value = clipped;
}

// 截取 sheet_to_html 返回的 <body> 内的内容（去掉外层 html/head 包装）
function tableInner(html: string): string {
    const start = html.indexOf("<body>");
    const end = html.lastIndexOf("</body>");
    return start >= 0 && end > start
        ? html.slice(start + "<body>".length, end)
        : html;
}

async function renderDocx(buf: ArrayBuffer): Promise<void> {
    const box = docxBox.value;
    if (!box) throw new Error("container not ready");
    const mod = await import("docx-preview");
    await mod.renderAsync(buf, box, box, {
        className: "lm-doc",
        inWrapper: true,
        ignoreWidth: true,
        ignoreHeight: true,
        breakPages: false,
        renderComments: false,
        renderChanges: false,
    });
}
</script>

<template>
    <div class="lm-office">
        <template v-if="tooLarge">
            <div class="lm-preview__none">
                <SvgIcon name="alert" :size="40" class="lm-muted" />
                <p>{{ t("preview.tooLarge", { limit: SIZE_LIMIT }) }}</p>
            </div>
        </template>

        <template v-else-if="failed">
            <div class="lm-preview__none">
                <SvgIcon name="alert" :size="40" class="lm-muted" />
                <p>{{ t("office.parseFailed") }}</p>
                <a
                    class="lm-btn lm-btn--primary"
                    :href="entry.url"
                    target="_blank"
                    rel="noopener"
                >
                    <SvgIcon name="download" :size="14" />{{ t("download") }}
                </a>
            </div>
        </template>

        <!-- docx：容器须在解析前就挂载，渲染期间以遮罩显示进度 -->
        <template v-else-if="isDocx">
            <div
                class="lm-office__docx"
                :class="{ 'lm-office--busy': loading }"
            >
                <div v-if="loading" class="lm-office__busy">
                    <p class="lm-muted">{{ t("loading") }}</p>
                </div>
                <div ref="docxBox"></div>
            </div>
        </template>

        <template v-else>
            <div v-if="loading" class="lm-preview__none">
                <p class="lm-muted">{{ t("loading") }}</p>
            </div>
            <template v-else>
                <section
                    v-for="s in sheets"
                    :key="s.name"
                    class="lm-office__sheet"
                >
                    <header class="lm-office__sheet-name">
                        <SvgIcon name="table" :size="13" />{{ s.name }}
                    </header>
                    <div class="lm-office__table" v-html="s.html"></div>
                </section>
                <p v-if="sheetClipped" class="lm-office__note">
                    {{ t("truncated") }}
                </p>
            </template>
        </template>
    </div>
</template>
