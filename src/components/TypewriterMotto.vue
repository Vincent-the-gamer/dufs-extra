<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { lang } from "../i18n";

// 随语言切换实时刷新（打字机组件在切换语言后立即用新词库）
const QUOTES = computed(() =>
    lang.value === "zh"
        ? [
              "今天也要好好整理文件呀 🐾",
              "每一份文件都值得被温柔以待",
              "在 dufs 里，收藏你的小宇宙",
              "喵～ 你的文件都井井有条",
              "把日子过成喜欢的模样",
          ]
        : [
              "Have a nice day 🐾",
              "Every file deserves kindness",
              "Keep your little universe tidy",
              "Meow～ all files in order",
              "Make today beautiful",
          ],
);

const shown = ref("");
let index = 0;
let pos = 0;
let deleting = false;
let timer: ReturnType<typeof setTimeout> | undefined;

function tick(): void {
    const quotes = QUOTES.value;
    const q = quotes[index % quotes.length];
    if (!deleting) {
        pos++;
        shown.value = q.slice(0, pos);
        if (pos >= q.length) {
            deleting = true;
            timer = setTimeout(tick, 2200);
        } else {
            timer = setTimeout(tick, 110);
        }
    } else {
        pos--;
        shown.value = q.slice(0, pos);
        if (pos <= 0) {
            deleting = false;
            index = (index + 1) % quotes.length;
            timer = setTimeout(tick, 400);
        } else {
            timer = setTimeout(tick, 40);
        }
    }
}

onMounted(() => {
    timer = setTimeout(tick, 600);
});
onBeforeUnmount(() => clearTimeout(timer));
</script>

<template>
    <div class="lm-motto" aria-hidden="true">
        <span>{{ shown }}<span class="lm-motto__caret"></span></span>
    </div>
</template>
