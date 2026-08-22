<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { prefix, refresh, state } from "../store";
import { collectFilesFromDrop, useUpload } from "../composables/useUpload";
import { toastE } from "../composables/useToast";
import { formatSize } from "../utils/format";
import { t } from "../i18n";
import SvgIcon from "./SvgIcon.vue";

const { items, busy, push, reset } = useUpload(
    () => prefix.value,
    () => state.path,
    refresh,
);

const dragging = ref(false);
const picker = ref<HTMLInputElement>();
let dragDepth = 0;

function onDragEnter(e: DragEvent): void {
    e.preventDefault();
    dragDepth++;
    dragging.value = true;
}

function onDragLeave(e: DragEvent): void {
    e.preventDefault();
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) dragging.value = false;
}

function prevent(e: Event): void {
    e.preventDefault();
}

async function onDrop(e: DragEvent): Promise<void> {
    e.preventDefault();
    dragDepth = 0;
    dragging.value = false;
    if (!state.data?.allow_upload) {
        toastE(t("upload.denied"));
        return;
    }
    if (!e.dataTransfer) return;
    const files = await collectFilesFromDrop(e.dataTransfer);
    if (files.length) push(files);
}

function openPicker(): void {
    if (state.data?.allow_upload) picker.value?.click();
}

function onPick(e: Event): void {
    const input = e.target as HTMLInputElement;
    const files = input.files;
    if (files?.length) {
        push(Array.from(files).map((f) => ({ file: f, rel: f.name })));
    }
    input.value = "";
}

onMounted(() => {
    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragover", prevent);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
});
onBeforeUnmount(() => {
    window.removeEventListener("dragenter", onDragEnter);
    window.removeEventListener("dragover", prevent);
    window.removeEventListener("dragleave", onDragLeave);
    window.removeEventListener("drop", onDrop);
});

defineExpose({ openPicker });
</script>

<template>
    <div>
        <input ref="picker" type="file" multiple hidden @change="onPick" />

        <Transition name="lm-fade">
            <div v-if="dragging" class="lm-drop">
                <div class="lm-drop__box">
                    <SvgIcon name="upload" :size="42" />
                    <p>{{ t("upload.drop") }}</p>
                </div>
            </div>
        </Transition>

        <Transition name="lm-slide-up">
            <div v-if="items.length" class="lm-upload lm-glass--modal">
                <div class="lm-upload__head">
                    <span>{{
                        busy ? t("upload.uploading") : t("all.done")
                    }}</span>
                    <button
                        class="lm-btn lm-btn--icon lm-btn--sm"
                        :title="t('close')"
                        @click="reset()"
                    >
                        <SvgIcon name="x" :size="14" />
                    </button>
                </div>
                <div class="lm-upload__list">
                    <div
                        v-for="it in items"
                        :key="it.id"
                        class="lm-upload__item"
                    >
                        <SvgIcon
                            :name="
                                it.status === 'done'
                                    ? 'check'
                                    : it.status === 'error'
                                      ? 'alert'
                                      : 'file'
                            "
                            :size="14"
                            :class="`lm-upload__icon lm-upload__icon--${it.status}`"
                        />
                        <div class="lm-upload__main">
                            <div class="lm-upload__name">
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
