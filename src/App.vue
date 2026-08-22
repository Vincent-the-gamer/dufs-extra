<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { config } from "./config";
import { applyTheme } from "./composables/useTheme";
import { renderMarkdown } from "./utils/highlight";
import TopBar from "./components/TopBar.vue";
import DetailDrawer from "./components/DetailDrawer.vue";
import UploadOverlay from "./components/UploadOverlay.vue";
import ToastHost from "./components/ToastHost.vue";
import DialogHost from "./components/DialogHost.vue";
import CatPawButton from "./components/CatPawButton.vue";
import TypewriterMotto from "./components/TypewriterMotto.vue";

applyTheme();

const overlay = ref<InstanceType<typeof UploadOverlay>>();
const footerHtml = computed(() =>
    config.footer ? renderMarkdown(config.footer) : "",
);
const decorations = config.decorations !== false;

onMounted(() => {
    document.title = config.page?.title || "dufs";
    if (config.document) document.body.dataset.document = config.document;
});
</script>

<template>
    <div class="app">
        <div class="app-bg" aria-hidden="true">
            <div class="app-bg__img"></div>
            <div class="app-bg__tint"></div>
        </div>

        <TopBar @upload="overlay?.openPicker()" />

        <main class="app-main">
            <RouterView />
        </main>

        <footer v-if="footerHtml" class="app-footer lm-glass">
            <div class="lm-markdown" v-html="footerHtml"></div>
        </footer>

        <DetailDrawer />
        <UploadOverlay ref="overlay" />
        <ToastHost />
        <DialogHost />
        <CatPawButton v-if="decorations" />
        <TypewriterMotto v-if="decorations" />
    </div>
</template>
