<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { highlightCode, prismLang } from "../utils/highlight";

// 轻量代码编辑器：透明文字的 textarea 叠在 Prism 高亮层上。
// 两层使用完全相同的字体 / 行高 / padding，滚动位置实时同步。
const props = withDefaults(
    defineProps<{ modelValue: string; ext?: string }>(),
    { ext: "" },
);
const emit = defineEmits<{ "update:modelValue": [value: string] }>();

const taEl = ref<HTMLTextAreaElement | null>(null);
const preEl = ref<HTMLElement | null>(null);

const lang = computed(() => prismLang(props.ext));

const html = computed(() => {
    const body = props.modelValue;
    if (!body) return " ";
    const out = highlightCode(body, lang.value);
    // 末尾换行时补一个占位符，避免高亮层比 textarea 少一行导致滚动错位
    return out.endsWith("\n") ? out + "\n " : out;
});

function onInput(e: Event): void {
    emit("update:modelValue", (e.target as HTMLTextAreaElement).value);
}

function syncScroll(): void {
    const ta = taEl.value;
    const pre = preEl.value;
    if (!ta || !pre) return;
    pre.scrollTop = ta.scrollTop;
    pre.scrollLeft = ta.scrollLeft;
}

// Tab 缩进两个空格（代码编辑的常见预期），保留浏览器默认的 Shift+Tab 焦点行为之外的情况
function onKeydown(e: KeyboardEvent): void {
    if (e.key !== "Tab" || e.altKey || e.ctrlKey || e.metaKey) return;
    const ta = taEl.value;
    if (!ta) return;
    e.preventDefault();
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const value = ta.value;
    emit(
        "update:modelValue",
        value.slice(0, start) + "  " + value.slice(end),
    );
    void nextTick(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
    });
}

onMounted(syncScroll);
watch(
    () => props.modelValue,
    () => void nextTick(syncScroll),
);
</script>

<template>
    <div class="lm-editor">
        <pre ref="preEl" class="lm-editor__hl" aria-hidden="true"><code v-html="html"></code></pre>
        <textarea
            ref="taEl"
            class="lm-editor__input"
            :value="modelValue"
            spellcheck="false"
            autocomplete="off"
            autocapitalize="off"
            autocorrect="off"
            wrap="off"
            @input="onInput"
            @scroll="syncScroll"
            @keydown="onKeydown"
        ></textarea>
    </div>
</template>
