<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { config } from "../config";
import {
    checkAuth,
    logout,
    mkcol,
    buildUrl,
    joinPath,
    putText,
} from "../api/client";
import { prefix, refresh, setView, state } from "../store";
import { lang, setLang, t } from "../i18n";
import { themeMode, toggleTheme } from "../composables/useTheme";
import { editDialog, promptDialog } from "../composables/useDialog";
import { toastE, toastS } from "../composables/useToast";
import { debounce } from "../utils/format";
import SvgIcon from "./SvgIcon.vue";
import Breadcrumb from "./Breadcrumb.vue";

const emit = defineEmits<{ upload: [] }>();

const title = computed(() => config.page?.title || "dufs");
const brandImg = computed(() => config.page?.logo);

const searchVal = ref("");
watch(
    searchVal,
    debounce((v: string) => {
        state.search = v;
        refresh();
    }, 400),
);

function clearSearch(): void {
    searchVal.value = "";
    state.search = "";
    refresh();
}

async function onLogin(): Promise<void> {
    await checkAuth(prefix.value, state.path);
    await refresh();
    if (state.data?.user) toastS(t("login.done", { user: state.data.user }));
    else toastE(t("login.failed"));
}

async function onLogout(): Promise<void> {
    await logout(prefix.value, state.path);
    await refresh();
    toastS(t("logout.done"));
}

async function newFolder(): Promise<void> {
    const name = await promptDialog({
        title: t("folder.new"),
        label: t("dialog.folderName"),
    });
    if (!name) return;
    try {
        await mkcol(buildUrl(prefix.value, joinPath(state.path, name)));
        toastS(t("created"));
        refresh();
    } catch {
        toastE(t("failed"));
    }
}

async function newFile(): Promise<void> {
    const name = await promptDialog({
        title: t("file.new"),
        label: t("dialog.fileName"),
    });
    if (!name) return;
    const url = buildUrl(prefix.value, joinPath(state.path, name));
    try {
        await putText(url, "");
    } catch {
        toastE(t("failed"));
        return;
    }
    const saved = await editDialog({
        title: t("edit.title", { name }),
        text: "",
        save: async (v) => {
            try {
                await putText(url, v);
                return true;
            } catch {
                return false;
            }
        },
    });
    if (saved) {
        toastS(t("saved"));
        refresh();
    }
}
</script>

<template>
    <header
        class="lm-topbar lm-glass--nav"
        :class="{ 'lm-glass--solid': !(config.glassmorphism?.appbar ?? true) }"
    >
        <div class="lm-topbar__row">
            <div class="lm-topbar__brand">
                <img
                    v-if="brandImg"
                    :src="brandImg"
                    class="lm-topbar__logo"
                    alt=""
                />
                <SvgIcon
                    v-else
                    name="sparkles"
                    :size="20"
                    class="lm-topbar__logo-default"
                />
                <span class="lm-topbar__title">{{ title }}</span>
            </div>
            <div class="lm-topbar__actions">
                <div v-if="state.data?.allow_search" class="lm-topbar__search">
                    <SvgIcon name="search" :size="15" />
                    <input
                        v-model="searchVal"
                        class="lm-search-input"
                        type="search"
                        :placeholder="t('search.ph')"
                        aria-label="search"
                    />
                    <button
                        v-if="searchVal"
                        class="lm-btn lm-btn--icon lm-btn--sm"
                        :title="t('clear')"
                        @click="clearSearch()"
                    >
                        <SvgIcon name="x" :size="13" />
                    </button>
                </div>

                <div class="lm-view-switch" role="group">
                    <button
                        class="lm-btn lm-btn--icon"
                        :class="{ 'is-active': state.view === 'card' }"
                        :title="t('view.card')"
                        @click="setView('card')"
                    >
                        <SvgIcon name="grid" :size="16" />
                    </button>
                    <button
                        class="lm-btn lm-btn--icon"
                        :class="{ 'is-active': state.view === 'table' }"
                        :title="t('view.list')"
                        @click="setView('table')"
                    >
                        <SvgIcon name="list" :size="16" />
                    </button>
                </div>

                <button
                    class="lm-btn lm-btn--icon lm-lang-btn"
                    :title="t('lang.toggle')"
                    aria-label="language"
                    @click="setLang(lang === 'zh' ? 'en' : 'zh')"
                >
                    <span>{{ lang === "zh" ? "EN" : "中" }}</span>
                </button>

                <button
                    class="lm-btn lm-btn--icon"
                    :title="t('theme.toggle')"
                    @click="toggleTheme()"
                >
                    <SvgIcon
                        :name="themeMode === 'dark' ? 'sun' : 'moon'"
                        :size="17"
                    />
                </button>

                <template v-if="state.data?.allow_upload">
                    <button
                        class="lm-btn lm-btn--icon"
                        :title="t('folder.new')"
                        @click="newFolder()"
                    >
                        <SvgIcon name="folderPlus" :size="17" />
                    </button>
                    <button
                        class="lm-btn lm-btn--icon"
                        :title="t('file.new')"
                        @click="newFile()"
                    >
                        <SvgIcon name="filePlus" :size="17" />
                    </button>
                    <button
                        class="lm-btn lm-btn--primary"
                        @click="emit('upload')"
                    >
                        <SvgIcon name="upload" :size="15" />{{ t("upload") }}
                    </button>
                </template>

                <template v-if="state.data?.auth">
                    <button
                        v-if="state.data.user"
                        class="lm-btn"
                        @click="onLogout()"
                    >
                        <SvgIcon name="logout" :size="15" />{{
                            state.data.user
                        }}
                    </button>
                    <button v-else class="lm-btn" @click="onLogin()">
                        <SvgIcon name="login" :size="15" />{{ t("login") }}
                    </button>
                </template>
            </div>
        </div>
        <div class="lm-topbar__crumbs">
            <Breadcrumb />
        </div>
    </header>
</template>
