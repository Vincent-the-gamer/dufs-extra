<script setup lang="ts">
// Office 全屏预览层：.doc/.docx/.xls/.xlsx 这类宽表格/整页文档在右侧
// 抽屉里放不下，点击「预览」时改为全屏展示（复用 PreviewPanel）。
// 其余文件类型的预览仍走右侧详情抽屉。
import { computed, onBeforeUnmount, onMounted } from "vue";
import { state, closeFull } from "../store";
import { iconNameOf, usesFullscreenPreview } from "../utils/filetype";
import { glass } from "../config";
import { t } from "../i18n";
import { useEntryActions } from "../composables/useEntryActions";
import SvgIcon from "./SvgIcon.vue";
import PreviewPanel from "./preview/PreviewPanel.vue";

const entry = computed(() => state.fullEntry);
const acts = useEntryActions();

// .doc/.docx 是整页排版的阅读型内容：限制内容列宽并居中，避免文字被拉得过宽；
// .xls/.xlsx 是宽表格：需要铺满可用宽度才能看清列
const isPage = computed(() => {
    const e = entry.value;
    return !!e && (e.ext === "doc" || e.ext === "docx");
});

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
                v-if="entry && usesFullscreenPreview(entry)"
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
                        <div class="lm-full__actions">
                            <button
                                class="lm-btn lm-btn--icon"
                                :title="t('open.new')"
                                @click="acts.open(entry)"
                            >
                                <SvgIcon name="external" :size="15" />
                            </button>
                            <button
                                class="lm-btn lm-btn--icon"
                                :title="t('download')"
                                @click="acts.download(entry)"
                            >
                                <SvgIcon name="download" :size="15" />
                            </button>
                            <button
                                class="lm-btn lm-btn--icon"
                                :title="t('copy.link')"
                                @click="acts.copyLink(entry)"
                            >
                                <SvgIcon name="link" :size="15" />
                            </button>
                            <button
                                class="lm-btn lm-btn--icon"
                                :title="t('copy.token')"
                                @click="acts.copyToken(entry)"
                            >
                                <SvgIcon name="key" :size="15" />
                            </button>
                            <button
                                class="lm-btn lm-btn--icon"
                                :title="t('close')"
                                @click="closeFull()"
                            >
                                <SvgIcon name="x" :size="16" />
                            </button>
                        </div>
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
                </div>
            </div>
        </Transition>
    </Teleport>
</template>
