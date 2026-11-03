<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import type { FileEntry } from "../api/types";
import type { MoveReq } from "../composables/useDialog";
import { canDropInto } from "../composables/useDragMove";
import { fetchIndex } from "../api/client";
import { prefix } from "../store";
import { getEntryInfo } from "../utils/filetype";
import { dirname, naturalCompare } from "../utils/format";
import { t } from "../i18n";
import SvgIcon from "./SvgIcon.vue";

// 移动目标选择：面包屑导航 + 子文件夹列表，只有目录可作为目标
const props = defineProps<{ req: MoveReq }>();
const emit = defineEmits<{ pick: [dir: string | null] }>();

const cur = ref(props.req.startPath);
const dirs = ref<FileEntry[]>([]);
const loading = ref(false);
const error = ref("");

const src = computed(() => ({
    path: props.req.fromPath,
    isDir: props.req.isDir,
}));
const canPick = computed(() => canDropInto(src.value, cur.value));
const pickHint = computed(() => {
    if (canPick.value) return "";
    return dirname(src.value.path) === cur.value
        ? t("move.sameDir")
        : t("move.invalid");
});

const segs = computed(() => cur.value.split("/").filter(Boolean));

function pathOf(i: number): string {
    return "/" + segs.value.slice(0, i + 1).join("/");
}

async function load(dir: string): Promise<void> {
    cur.value = dir;
    loading.value = true;
    error.value = "";
    try {
        const data = await fetchIndex(prefix.value, dir);
        dirs.value = (data.paths ?? [])
            .filter(
                (p) => p.path_type === "Dir" || p.path_type === "SymlinkDir",
            )
            .map((p) => getEntryInfo(p, prefix.value, dir))
            .sort((a, b) => naturalCompare(a.name, b.name));
    } catch {
        dirs.value = [];
        error.value = t("move.failedLoad");
    } finally {
        loading.value = false;
    }
}

function up(): void {
    if (cur.value === "/") return;
    void load(dirname(cur.value));
}

function pickDir(dir: string): void {
    if (!canDropInto(src.value, dir)) return;
    emit("pick", dir);
}

function onKey(e: KeyboardEvent): void {
    if (e.key === "Escape") emit("pick", null);
}

onMounted(() => {
    document.addEventListener("keydown", onKey);
    void load(cur.value);
});
onBeforeUnmount(() => document.removeEventListener("keydown", onKey));
</script>

<template>
    <div class="lm-dialog-mask" @click.self="emit('pick', null)">
        <div class="lm-dialog lm-dialog--move lm-glass--modal">
            <div class="lm-dialog__title">
                {{ t("move.title", { name: req.name }) }}
            </div>

            <div class="lm-movedlg__bar">
                <button
                    class="lm-btn lm-btn--icon lm-btn--sm"
                    :disabled="cur === '/' || loading"
                    :title="t('move.up')"
                    @click="up()"
                >
                    <SvgIcon name="arrowUp" :size="15" />
                </button>
                <div class="lm-movedlg__crumbs">
                    <button
                        class="lm-movedlg__crumb"
                        :class="{ 'is-cur': !segs.length }"
                        @click="load('/')"
                    >
                        {{ t("move.root") }}
                    </button>
                    <template v-for="(s, i) in segs" :key="i">
                        <SvgIcon
                            name="chevronRight"
                            :size="12"
                            class="lm-movedlg__sep"
                        />
                        <button
                            class="lm-movedlg__crumb"
                            :class="{ 'is-cur': i === segs.length - 1 }"
                            :title="s"
                            @click="load(pathOf(i))"
                        >
                            {{ s }}
                        </button>
                    </template>
                </div>
            </div>

            <div class="lm-movedlg__list">
                <div v-if="loading" class="lm-movedlg__state">
                    <div class="lm-spinner"></div>
                </div>
                <div v-else-if="error" class="lm-movedlg__state lm-c-danger">
                    {{ error }}
                </div>
                <div
                    v-else-if="!dirs.length"
                    class="lm-movedlg__state lm-muted"
                >
                    {{ t("move.empty") }}
                </div>
                <template v-else>
                    <div
                        v-for="d in dirs"
                        :key="d.path"
                        class="lm-movedlg__row"
                    >
                        <button
                            class="lm-movedlg__enter"
                            :title="d.name"
                            @click="load(d.path)"
                        >
                            <SvgIcon name="folder" :size="16" />
                            <span>{{ d.name }}</span>
                        </button>
                        <button
                            class="lm-btn lm-btn--icon lm-btn--sm"
                            :disabled="!canDropInto(src, d.path)"
                            :title="t('move.choose')"
                            @click="pickDir(d.path)"
                        >
                            <SvgIcon name="check" :size="15" />
                        </button>
                    </div>
                </template>
            </div>

            <div class="lm-movedlg__target">
                <SvgIcon name="folderOpen" :size="14" />
                <span class="lm-movedlg__target-path" :title="cur">{{
                    cur
                }}</span>
                <span v-if="pickHint" class="lm-movedlg__hint">{{
                    pickHint
                }}</span>
            </div>

            <div class="lm-dialog__actions">
                <button class="lm-btn" @click="emit('pick', null)">
                    {{ t("cancel") }}
                </button>
                <button
                    class="lm-btn lm-btn--primary"
                    :disabled="!canPick"
                    @click="pickDir(cur)"
                >
                    <SvgIcon name="move" :size="15" />{{ t("move.here") }}
                </button>
            </div>
        </div>
    </div>
</template>
