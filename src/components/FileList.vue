<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { BOOT_DATA, MAX_PREVIEW_BYTES, glass } from "../config";
import {
    bootPathFor,
    entries,
    load,
    paged,
    pageSize,
    readmeEntry,
    refresh,
    state,
    totalPages,
} from "../store";
import { getText } from "../api/client";
import { checkAuth } from "../api/client";
import { renderMarkdown } from "../utils/highlight";
import { t } from "../i18n";
import { toastS } from "../composables/useToast";
import SvgIcon from "./SvgIcon.vue";
import FileTable from "./FileTable.vue";
import FileCard from "./FileCard.vue";

const route = useRoute();
let booted = false;

// 首次加载：生产环境优先用 dufs 注入的数据（免请求），否则走 ?json
watch(
    () => route.path,
    (p) => {
        if (!booted && BOOT_DATA && bootPathFor(BOOT_DATA) === p) {
            state.data = BOOT_DATA;
            state.path = p;
            state.page = 1;
            state.error = "";
        } else {
            load(p);
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

function goPrev(): void {
    if (state.page > 1) state.page--;
}
function goNext(): void {
    if (state.page < totalPages.value) state.page++;
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

            <div
                v-if="pageSize > 0 && entries.length > pageSize"
                class="lm-pagination"
            >
                <button
                    class="lm-btn lm-btn--sm"
                    :disabled="state.page <= 1"
                    @click="goPrev()"
                >
                    {{ t("prevPage") }}
                </button>
                <span>{{
                    t("page.of", { page: state.page, total: totalPages })
                }}</span>
                <button
                    class="lm-btn lm-btn--sm"
                    :disabled="state.page >= totalPages"
                    @click="goNext()"
                >
                    {{ t("nextPage") }}
                </button>
            </div>
        </template>
    </div>
</template>
