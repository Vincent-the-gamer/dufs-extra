<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import type { FileEntry } from "../../api/types";
import { buildUrl, getText, joinPath } from "../../api/client";
import { prefix, state } from "../../store";
import { convertSubtitleToVtt } from "../../utils/subtitle";
import { t } from "../../i18n";

const props = defineProps<{ entry: FileEntry }>();

const subUrl = ref("");
const subLabel = ref("");

async function loadSubtitle(): Promise<void> {
    const base = props.entry.name.replace(/\.[^.]+$/, "");
    const cand = state.data?.paths.find(
        (p) =>
            p.name.startsWith(base + ".") &&
            p.name !== props.entry.name &&
            /\.(srt|vtt|ass|ssa)$/i.test(p.name),
    );
    if (!cand) return;
    try {
        const raw = await getText(
            buildUrl(
                prefix.value,
                joinPath(dirnameOf(props.entry.path), cand.name),
            ),
        );
        subUrl.value = URL.createObjectURL(
            new Blob(
                [
                    convertSubtitleToVtt(
                        raw,
                        (
                            cand.name.match(/\.([a-z0-9]+)$/i)?.[1] ?? ""
                        ).toLowerCase(),
                    ),
                ],
                {
                    type: "text/vtt",
                },
            ),
        );
        subLabel.value = cand.name;
    } catch {
        /* 字幕加载失败则静默 */
    }
}

function dirnameOf(path: string): string {
    const parts = path.split("/").filter(Boolean);
    parts.pop();
    return "/" + parts.join("/");
}

onMounted(loadSubtitle);
onBeforeUnmount(() => {
    if (subUrl.value) URL.revokeObjectURL(subUrl.value);
});
</script>

<template>
    <div class="lm-preview__media">
        <video
            :src="entry.url"
            controls
            preload="metadata"
            playsinline
            class="lm-preview__video"
        >
            <track
                v-if="subUrl"
                kind="subtitles"
                :src="subUrl"
                :label="subLabel"
            />
        </video>
        <p v-if="subLabel" class="lm-sm lm-muted">
            {{ t("subtitle.track") }}：{{ subLabel }}
        </p>
    </div>
</template>
