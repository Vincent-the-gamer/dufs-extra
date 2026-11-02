<script setup lang="ts">
import { computed } from "vue";
import {
    cancelDownload,
    clearDownloads,
    downloads,
    retryDownload,
} from "../composables/useDownload";
import { formatSize } from "../utils/format";
import { t } from "../i18n";
import SvgIcon from "./SvgIcon.vue";

const items = computed(() => downloads.items);
const busy = computed(() =>
    items.value.some(
        (x) => x.status === "pending" || x.status === "downloading",
    ),
);

function iconOf(status: string): string {
    return status === "done"
        ? "check"
        : status === "error"
          ? "alert"
          : "download";
}

function loadedOf(loaded: number, size: number): string {
    return `${formatSize(loaded)} / ${formatSize(size)}`;
}
</script>

<template>
    <div>
        <Transition name="lm-slide-up">
            <div v-if="items.length" class="lm-download lm-glass--modal">
                <div class="lm-download__head">
                    <span>{{
                        busy ? t("download.downloading") : t("all.done")
                    }}</span>
                    <button
                        class="lm-btn lm-btn--icon lm-btn--sm"
                        :title="t('close')"
                        @click="clearDownloads()"
                    >
                        <SvgIcon name="x" :size="14" />
                    </button>
                </div>
                <div class="lm-download__list">
                    <div
                        v-for="it in items"
                        :key="it.id"
                        class="lm-download__item"
                    >
                        <SvgIcon
                            :name="iconOf(it.status)"
                            :size="14"
                            :class="`lm-download__icon lm-download__icon--${it.status}`"
                        />
                        <div class="lm-download__main">
                            <div class="lm-download__name">
                                {{ it.name }}
                                <span class="lm-sm lm-muted">{{
                                    formatSize(it.size)
                                }}</span>
                            </div>
                            <div class="lm-progress">
                                <i
                                    :style="{
                                        width:
                                            Math.round(it.progress * 100) + '%',
                                    }"
                                ></i>
                            </div>
                            <div class="lm-download__meta">
                                <span class="lm-sm lm-muted">
                                    {{ loadedOf(it.loaded, it.size) }}
                                    <template v-if="it.attempt">
                                        ·
                                        {{
                                            t("download.resuming", {
                                                n: it.attempt,
                                            })
                                        }}
                                    </template>
                                </span>
                                <button
                                    v-if="
                                        it.status === 'downloading' ||
                                        it.status === 'pending'
                                    "
                                    class="lm-btn lm-btn--icon lm-btn--sm"
                                    :title="t('download.cancel')"
                                    @click="cancelDownload(it.id)"
                                >
                                    <SvgIcon name="x" :size="13" />
                                </button>
                                <button
                                    v-else-if="it.status === 'error'"
                                    class="lm-btn lm-btn--icon lm-btn--sm"
                                    :title="t('retry')"
                                    @click="retryDownload(it.id)"
                                >
                                    <SvgIcon name="refresh" :size="13" />
                                </button>
                            </div>
                            <div
                                v-if="it.status === 'error' && it.error"
                                class="lm-sm lm-c-danger"
                            >
                                {{ it.error }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Transition>
    </div>
</template>
