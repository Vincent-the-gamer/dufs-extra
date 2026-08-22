<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { t } from "../i18n";
import SvgIcon from "./SvgIcon.vue";

export interface MoreItem {
    id: string;
    icon?: string;
    label?: string;
    danger?: boolean;
    divider?: boolean;
}

defineProps<{ items: MoreItem[] }>();
const emit = defineEmits<{ select: [id: string] }>();

const open = ref(false);

function toggle(): void {
    open.value = !open.value;
}

function onDocClick(e: MouseEvent): void {
    if (open.value && !(e.target as HTMLElement).closest(".lm-more"))
        open.value = false;
}

function onKey(e: KeyboardEvent): void {
    if (e.key === "Escape") open.value = false;
}

onMounted(() => {
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
});
onBeforeUnmount(() => {
    document.removeEventListener("click", onDocClick);
    document.removeEventListener("keydown", onKey);
});

function pick(id: string): void {
    open.value = false;
    emit("select", id);
}
</script>

<template>
    <div class="lm-more">
        <button
            class="lm-btn lm-btn--icon lm-btn--sm"
            :title="t('more')"
            aria-haspopup="menu"
            @click.stop="toggle()"
        >
            <SvgIcon name="more" :size="16" />
        </button>
        <Transition name="lm-pop">
            <div v-if="open" class="lm-menu" role="menu">
                <template v-for="it in items" :key="it.id">
                    <div v-if="it.divider" class="lm-menu__divider"></div>
                    <button
                        v-else
                        class="lm-menu__item"
                        :class="{ 'lm-menu__item--danger': it.danger }"
                        role="menuitem"
                        @click.stop="pick(it.id)"
                    >
                        <SvgIcon v-if="it.icon" :name="it.icon" :size="15" />
                        <span>{{ it.label }}</span>
                    </button>
                </template>
            </div>
        </Transition>
    </div>
</template>
