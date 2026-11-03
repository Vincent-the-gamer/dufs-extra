<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { state } from "../store";
import { t } from "../i18n";
import { useDragMove } from "../composables/useDragMove";
import SvgIcon from "./SvgIcon.vue";

const router = useRouter();

const { dropTargetPath, onDragOver, onDragLeave, onDrop } = useDragMove();

const segs = computed(() => state.path.split("/").filter(Boolean));

function go(path: string): void {
    router.push(path);
}
</script>

<template>
    <nav class="lm-breadcrumb" aria-label="breadcrumb">
        <button
            class="lm-btn lm-btn--icon lm-btn--sm"
            :class="{ 'is-drop-target': dropTargetPath === '/' }"
            :title="t('home')"
            @click="go('/')"
            @dragover="onDragOver($event, '/')"
            @dragleave="onDragLeave($event, '/')"
            @drop="onDrop($event, '/')"
        >
            <SvgIcon name="home" :size="15" />
        </button>
        <template v-for="(s, i) in segs" :key="i">
            <SvgIcon
                name="chevronRight"
                :size="13"
                class="lm-breadcrumb__sep"
            />
            <button
                v-if="i < segs.length - 1"
                class="lm-breadcrumb__item"
                :class="{
                    'is-drop-target':
                        dropTargetPath === '/' + segs.slice(0, i + 1).join('/'),
                }"
                :title="s"
                @click="go('/' + segs.slice(0, i + 1).join('/'))"
                @dragover="
                    onDragOver($event, '/' + segs.slice(0, i + 1).join('/'))
                "
                @dragleave="
                    onDragLeave($event, '/' + segs.slice(0, i + 1).join('/'))
                "
                @drop="onDrop($event, '/' + segs.slice(0, i + 1).join('/'))"
            >
                {{ s }}
            </button>
            <span v-else class="lm-breadcrumb__item lm-breadcrumb__item--cur">{{
                s
            }}</span>
        </template>
    </nav>
</template>
