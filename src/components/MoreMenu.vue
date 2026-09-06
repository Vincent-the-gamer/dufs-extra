<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { t } from "../i18n";
import SvgIcon from "./SvgIcon.vue";

export interface MoreItem {
    id: string;
    icon?: string;
    label?: string;
    danger?: boolean;
    divider?: boolean;
}

defineProps<{ items: MoreItem[]; up?: boolean }>();
const emit = defineEmits<{ select: [id: string] }>();

// 共享的活动菜单 id：同一时刻全局只允许一个「⋯」菜单展开，
// 打开新的会先关闭上一个（无论菜单在表格行、卡片还是抽屉里）
const activeId = ref<string | null>(null);
let seq = 0;
const uid = `lm-more-${++seq}`;

const rootEl = ref<HTMLElement | null>(null);
const open = computed(() => activeId.value === uid);

function setOpen(v: boolean): void {
    activeId.value = v ? uid : null;
}

function toggle(): void {
    setOpen(!open.value);
}

// 用捕获阶段监听，保证即便其他控件 @click.stop 也能关掉已展开的菜单
function onDocClick(e: MouseEvent): void {
    if (open.value && rootEl.value && !rootEl.value.contains(e.target as Node))
        setOpen(false);
}

function onKey(e: KeyboardEvent): void {
    if (e.key === "Escape" && open.value) setOpen(false);
}

onMounted(() => {
    document.addEventListener("click", onDocClick, true);
    document.addEventListener("keydown", onKey);
});
onBeforeUnmount(() => {
    document.removeEventListener("click", onDocClick, true);
    document.removeEventListener("keydown", onKey);
    if (open.value) setOpen(false);
});

function pick(id: string): void {
    setOpen(false);
    emit("select", id);
}
</script>

<template>
    <div ref="rootEl" class="lm-more">
        <button
            class="lm-btn lm-btn--icon lm-btn--sm"
            :title="t('more')"
            aria-haspopup="menu"
            @click.stop="toggle()"
        >
            <SvgIcon name="more" :size="16" />
        </button>
        <Transition name="lm-pop">
            <div
                v-if="open"
                class="lm-menu"
                :class="{ 'lm-menu--up': up }"
                role="menu"
            >
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
