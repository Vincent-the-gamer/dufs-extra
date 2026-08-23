<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { BOOT_DATA, MAX_PREVIEW_BYTES, glass } from "../config";
import {
    bootPathFor,
    entries,
    load,
    paged,
    readmeEntry,
    refresh,
    setPageSize,
    state,
    totalPages,
} from "../store";
import { getText } from "../api/client";
import { checkAuth } from "../api/client";
import { renderMarkdown } from "../utils/highlight";
import { normalizePath } from "../utils/format";
import { t } from "../i18n";
import { toastS } from "../composables/useToast";
import SvgIcon from "./SvgIcon.vue";
import FileTable from "./FileTable.vue";
import FileCard from "./FileCard.vue";

const route = useRoute();
let booted = false;

// 首次加载：生产环境优先用 dufs 注入的数据（免请求），否则走 ?json
// route.path 是 URL 编码形式，统一规范化为解码路径后再比较/加载
watch(
    () => route.path,
    (p) => {
        const norm = normalizePath(p);
        if (!booted && BOOT_DATA && bootPathFor(BOOT_DATA) === norm) {
            state.data = BOOT_DATA;
            state.path = norm;
            state.page = 1;
            state.error = "";
        } else {
            load(norm);
        }
        booted = true;
    },
    { immediate: true },
);

// README.md 渲染
const readmeHtml = ref("");
watch(
    [() => state.path, () => state.search, () => readmeEntry.value?.mtime],
    async () => {
        readmeHtml.value = "";
        const r = readmeEntry.value;
        if (r && !state.search && r.size < MAX_PREVIEW_BYTES) {
            try {
                readmeHtml.value = renderMarkdown(await getText(r.url));
            } catch {
                readmeHtml.value = "";
            }
        }
    },
    { immediate: true },
);

const showReadme = computed(() => !!readmeHtml.value && glass("readme"));
const showError = computed(() => !!state.error);
const isAuthError = computed(() => state.error === "auth");

async function onLogin(): Promise<void> {
    await checkAuth(state.data?.uri_prefix ?? "/", state.path);
    await refresh();
    if (state.data?.user) toastS(t("login.done", { user: state.data.user }));
}

// 智能页码序列：首尾页 + 当前页前后各 1 页，间隔处以省略号收拢
function pageList(page: number, total: number): (number | "…")[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const want = new Set([1, total, page - 1, page, page + 1]);
    const sorted = [...want]
        .filter((p) => p >= 1 && p <= total)
        .sort((a, b) => a - b);
    const out: (number | "…")[] = [];
    let prev = 0;
    for (const p of sorted) {
        if (p - prev > 1) out.push("…");
        out.push(p);
        prev = p;
    }
    return out;
}

const SIZE_OPTIONS = [20, 50, 100, 200, 0];
// 分页条在条目数超过最小分页选项时显示（保证选“全部”后仍能改回）
const MIN_PAGE_SIZE = Math.min(...SIZE_OPTIONS.filter((n) => n > 0));

function onSizeChange(e: Event): void {
    const v = Number((e.target as HTMLSelectElement).value);
    if (v !== state.pageSize) setPageSize(v);
}

function scrollTop(): void {
    const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
    ).matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
}

function goPage(p: number): void {
    if (p < 1 || p > totalPages.value || p === state.page) return;
    state.page = p;
    scrollTop();
}

function goPrev(): void {
    goPage(state.page - 1);
}
function goNext(): void {
    goPage(state.page + 1);
}
</script>

<template>
    <div class="lm-page">
        <!-- 加载中 -->
        <div v-if="state.loading && !state.data" class="lm-center">
            <div class="lm-spinner"></div>
            <p class="lm-muted">{{ t("loading") }}</p>
        </div>

        <!-- 错误 -->
        <div v-else-if="showError" class="lm-center">
            <SvgIcon
                :name="isAuthError ? 'key' : 'alert'"
                :size="40"
                class="lm-muted"
            />
            <p>{{ isAuthError ? t("auth.required") : t("load.failed") }}</p>
            <div class="lm-center__actions">
                <button
                    v-if="isAuthError"
                    class="lm-btn lm-btn--primary"
                    @click="onLogin()"
                >
                    <SvgIcon name="login" :size="15" />{{ t("login") }}
                </button>
                <button v-else class="lm-btn" @click="refresh()">
                    {{ t("retry") }}
                </button>
            </div>
        </div>

        <!-- 列表 -->
        <template v-else>
            <section v-if="showReadme" class="lm-glass lm-readme">
                <div class="lm-readme__head">
                    <SvgIcon name="file-text" :size="16" />
                    <span>README.md</span>
                </div>
                <div class="lm-markdown" v-html="readmeHtml"></div>
            </section>

            <div v-if="paged.length" :key="state.view">
                <FileTable v-if="state.view === 'table'" :entries="paged" />
                <div v-else class="lm-cards">
                    <FileCard v-for="e in paged" :key="e.path" :entry="e" />
                </div>
            </div>

            <div v-else class="lm-empty">
                <SvgIcon
                    :name="state.search ? 'search' : 'folderOpen'"
                    :size="64"
                />
                <p>{{ state.search ? t("search.empty") : t("empty") }}</p>
            </div>

            <div v-if="entries.length > MIN_PAGE_SIZE" class="lm-pagination">
                <span class="lm-pagination__count">{{
                    t("page.total", { n: entries.length })
                }}</span>

                <div
                    v-if="state.pageSize > 0 && entries.length > state.pageSize"
                    class="lm-pagination__pages"
                >
                    <button
                        class="lm-btn lm-btn--icon lm-btn--sm"
                        :disabled="state.page <= 1"
                        :title="t('prevPage')"
                        :aria-label="t('prevPage')"
                        @click="goPrev()"
                    >
                        <SvgIcon name="chevronLeft" :size="16" />
                    </button>
                    <template
                        v-for="(p, i) in pageList(state.page, totalPages)"
                        :key="i"
                    >
                        <button
                            v-if="p !== '…'"
                            class="lm-pagination__page"
                            :class="{ 'is-active': p === state.page }"
                            @click="goPage(p)"
                        >
                            {{ p }}
                        </button>
                        <span v-else class="lm-pagination__page is-ellipsis"
                            >…</span
                        >
                    </template>
                    <button
                        class="lm-btn lm-btn--icon lm-btn--sm"
                        :disabled="state.page >= totalPages"
                        :title="t('nextPage')"
                        :aria-label="t('nextPage')"
                        @click="goNext()"
                    >
                        <SvgIcon name="chevronRight" :size="16" />
                    </button>
                </div>

                <label class="lm-pagination__size">
                    <span>{{ t("page.size") }}</span>
                    <select
                        class="lm-select"
                        :value="state.pageSize"
                        @change="onSizeChange"
                    >
                        <option v-for="n in SIZE_OPTIONS" :key="n" :value="n">
                            {{ n === 0 ? t("page.all") : n }}
                        </option>
                    </select>
                </label>
            </div>
        </template>
    </div>
</template>
