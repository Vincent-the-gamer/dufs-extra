<script setup lang="ts">
// 统一的全屏预览层：所有文件类型都在这一个大框里预览（尺寸对齐原文档预览）。
// 详细信息和操作按钮统一放在底部，取代原先的右侧详情抽屉。
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { state, closeFull } from "../store";
import { copyText, formatDate, formatSize } from "../utils/format";
import { categoryLabel, iconNameOf } from "../utils/filetype";
import { fetchHash } from "../api/client";
import { glass } from "../config";
import { t } from "../i18n";
import { toastE, toastS } from "../composables/useToast";
import { useEntryActions } from "../composables/useEntryActions";
import SvgIcon from "./SvgIcon.vue";
import MoreMenu from "./MoreMenu.vue";
import PreviewPanel from "./preview/PreviewPanel.vue";

const entry = computed(() => state.fullEntry);
const acts = useEntryActions();

const hash = ref("");
const hashing = ref(false);
const canWrite = computed(() => !!state.data?.allow_upload);
const isText = computed(() => {
    const e = entry.value;
    return (
        !!e &&
        (e.category === "text" ||
            e.category === "code" ||
            e.category === "subtitle")
    );
});

// .doc/.docx 是整页排版的阅读型内容：限制内容列宽并居中，避免文字被拉得过宽；
// 其余类型（图片/视频/代码/表格等）铺满可用宽度
const isPage = computed(() => {
    const e = entry.value;
    return !!e && (e.ext === "doc" || e.ext === "docx");
});

watch(
    () => state.fullEntry,
    () => {
        hash.value = "";
        hashing.value = false;
    },
);

async function computeHash(): Promise<void> {
    if (!entry.value || hashing.value) return;
    hashing.value = true;
    const h = await fetchHash(entry.value.url);
    hashing.value = false;
    if (h) hash.value = h;
    else toastE(t("failed"));
}

async function copyHash(): Promise<void> {
    if (hash.value && (await copyText(hash.value))) toastS(t("copied"));
}

async function copyPath(): Promise<void> {
    if (entry.value && (await copyText(entry.value.path))) toastS(t("copied"));
}

function onKey(e: KeyboardEvent): void {
    if (e.key === "Escape" && state.fullEntry) closeFull();
}

onMounted(() => document.addEventListener("keydown", onKey));
onBeforeUnmount(() => document.removeEventListener("keydown", onKey));
</script>

<template>
    <Teleport to="body">
        <Transition name="lm-fade">
            <div
                v-if="entry"
                class="lm-full-root"
                role="dialog"
                aria-modal="true"
                :aria-label="entry.name"
            >
                <div class="lm-full-mask" @click="closeFull()"></div>
                <div
                    class="lm-full lm-glass--modal"
                    :class="{ 'lm-glass--solid': !glass('preview') }"
                >
                    <header class="lm-full__head">
                        <span class="lm-ic" :class="`lm-cat-${entry.category}`">
                            <SvgIcon :name="iconNameOf(entry)" :size="18" />
                        </span>
                        <span class="lm-full__title" :title="entry.name">{{
                            entry.name
                        }}</span>
                        <button
                            class="lm-btn lm-btn--icon"
                            :title="t('close')"
                            @click="closeFull()"
                        >
                            <SvgIcon name="x" :size="16" />
                        </button>
                    </header>

                    <div
                        class="lm-full__body"
                        :class="{ 'lm-full__body--page': isPage }"
                    >
                        <PreviewPanel
                            :key="`${entry.path}:${entry.mtime}:${entry.size}`"
                            :entry="entry"
                        />
                    </div>

                    <footer class="lm-full__foot">
                        <div class="lm-full__meta">
                            <span>
                                <b>{{ t("type") }}</b>
                                {{ categoryLabel(entry.category)
                                }}<template v-if="entry.ext">
                                    · {{ entry.ext }}</template
                                >
                                <span
                                    v-if="entry.isSymlink"
                                    class="lm-badge lm-badge--symlink"
                                    >{{ t("symlink") }}</span
                                >
                            </span>
                            <span>
                                <b>{{ t("size") }}</b>
                                {{ entry.isDir ? "—" : formatSize(entry.size) }}
                            </span>
                            <span>
                                <b>{{ t("modified") }}</b>
                                {{ formatDate(entry.mtime) }}
                            </span>
                            <span
                                class="lm-full__path"
                                :title="t('copy')"
                                @click="copyPath()"
                            >
                                <b>{{ t("path") }}</b> {{ entry.path }}
                            </span>
                            <span class="lm-full__hash">
                                <b>{{ t("sha256") }}</b>
                                <template v-if="hash">
                                    <code>{{ hash }}</code>
                                    <button
                                        class="lm-btn lm-btn--icon lm-btn--sm"
                                        :title="t('copy')"
                                        @click="copyHash()"
                                    >
                                        <SvgIcon name="copy" :size="13" />
                                    </button>
                                </template>
                                <button
                                    v-else
                                    class="lm-btn lm-btn--sm"
                                    :disabled="hashing"
                                    @click="computeHash()"
                                >
                                    {{
                                        hashing
                                            ? t("loading")
                                            : t("sha256.compute")
                                    }}
                                </button>
                            </span>
                        </div>

                        <div class="lm-full__actions">
                            <button
                                class="lm-btn lm-btn--primary"
                                @click="acts.download(entry)"
                            >
                                <SvgIcon name="download" :size="15" />{{
                                    t("download")
                                }}
                            </button>
                            <button
                                class="lm-btn"
                                @click="acts.copyLink(entry)"
                            >
                                <SvgIcon name="link" :size="15" />{{
                                    t("copy.link")
                                }}
                            </button>
                            <button
                                class="lm-btn"
                                @click="acts.copyToken(entry)"
                            >
                                <SvgIcon name="key" :size="15" />{{
                                    t("copy.token")
                                }}
                            </button>
                            <button
                                v-if="isText && canWrite"
                                class="lm-btn"
                                @click="acts.edit(entry)"
                            >
                                <SvgIcon name="pencil" :size="15" />{{
                                    t("edit")
                                }}
                            </button>
                            <button
                                class="lm-btn lm-btn--icon"
                                :title="t('open.new')"
                                @click="acts.openExternal(entry)"
                            >
                                <SvgIcon name="external" :size="15" />
                            </button>
                            <MoreMenu
                                up
                                :items="acts.menuItems(entry)"
                                @select="acts.handle($event, entry)"
                            />
                        </div>
                    </footer>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>
