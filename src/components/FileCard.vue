<script setup lang="ts">
import { computed, ref } from "vue";
import type { FileEntry } from "../api/types";
import { t } from "../i18n";
import { formatDate, formatSize } from "../utils/format";
import { iconNameOf } from "../utils/filetype";
import { useEntryActions } from "../composables/useEntryActions";
import SvgIcon from "./SvgIcon.vue";
import MoreMenu from "./MoreMenu.vue";
import type { MoreItem } from "./MoreMenu.vue";

const props = defineProps<{ entry: FileEntry }>();

const acts = useEntryActions();
const imgFail = ref(false);

const menuItems = computed<MoreItem[]>(() => acts.menuItems(props.entry));

function onSelect(id: string): void {
    acts.handle(id, props.entry);
}

function open(): void {
    acts.open(props.entry);
}

// 网格视图：仅图片后缀展示预览图（视频取首帧不可靠，其余一律展示文件图标）
const showThumb = computed(
    () =>
        !imgFail.value &&
        props.entry.category === "image" &&
        props.entry.ext !== "jxl",
);
</script>

<template>
    <div
        class="lm-card"
        :class="`lm-cat-${entry.category}`"
        @click="open()"
        @keydown.enter="open()"
        tabindex="0"
    >
        <div class="lm-card__thumb">
            <img
                v-if="showThumb"
                :src="entry.url"
                loading="lazy"
                decoding="async"
                class="lm-card__img"
                alt=""
                @error="imgFail = true"
            />
            <div v-else class="lm-card__icon">
                <SvgIcon :name="iconNameOf(entry)" :size="44" />
            </div>
        </div>
        <div class="lm-card__body">
            <div class="lm-card__name" :title="entry.name">
                {{ entry.name }}
                <span
                    v-if="entry.isSymlink"
                    class="lm-badge lm-badge--symlink"
                    >{{ t("symlink") }}</span
                >
            </div>
            <div class="lm-card__meta">
                <span>{{
                    entry.isDir ? t("cat.folder") : formatSize(entry.size)
                }}</span>
                <span>·</span>
                <span>{{ formatDate(entry.mtime) }}</span>
            </div>
        </div>
        <div class="lm-card__actions" @click.stop>
            <button
                v-if="!entry.isDir"
                class="lm-btn lm-btn--icon lm-btn--sm"
                :title="t('preview')"
                @click="acts.preview(entry)"
            >
                <SvgIcon name="eye" :size="15" />
            </button>
            <button
                class="lm-btn lm-btn--icon lm-btn--sm"
                :title="t('download')"
                @click="acts.download(entry)"
            >
                <SvgIcon name="download" :size="15" />
            </button>
            <button
                class="lm-btn lm-btn--icon lm-btn--sm"
                :title="t('copy.link')"
                @click="acts.copyLink(entry)"
            >
                <SvgIcon name="link" :size="15" />
            </button>
            <MoreMenu :items="menuItems" @select="onSelect" />
        </div>
    </div>
</template>
