<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { FileEntry } from "../../api/types";
import { MAX_AUDIO_META_BYTES } from "../../config";
import jsmediatags from "jsmediatags/dist/jsmediatags.min.js";

const props = defineProps<{ entry: FileEntry }>();

interface AudioMeta {
    title?: string;
    artist?: string;
    album?: string;
    picture?: string;
}

const meta = ref<AudioMeta>({});

onMounted(() => {
    if (props.entry.size > MAX_AUDIO_META_BYTES) return;
    try {
        jsmediatags.read(props.entry.url, {
            onSuccess: (data: unknown) => {
                const tags =
                    (data as { tags?: Record<string, unknown> })?.tags ?? {};
                const pic = tags.picture as
                    | { format?: string; data?: Uint8Array }
                    | undefined;
                meta.value = {
                    title:
                        typeof tags.title === "string" ? tags.title : undefined,
                    artist:
                        typeof tags.artist === "string"
                            ? tags.artist
                            : undefined,
                    album:
                        typeof tags.album === "string" ? tags.album : undefined,
                    picture:
                        pic?.data && pic.format
                            ? `data:${pic.format};base64,${bytesToBase64(pic.data)}`
                            : undefined,
                };
            },
            onError: () => {
                /* 无元数据则静默 */
            },
        });
    } catch {
        /* ignore */
    }
});

function bytesToBase64(bytes: Uint8Array): string {
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
}
</script>

<template>
    <div class="lm-preview__media">
        <img
            v-if="meta.picture"
            :src="meta.picture"
            alt=""
            class="lm-preview__cover"
        />
        <div
            v-if="meta.title || meta.artist || meta.album"
            class="lm-preview__meta"
        >
            <div class="lm-preview__meta-title">
                {{ meta.title || entry.name }}
            </div>
            <div class="lm-sm lm-muted">
                {{ [meta.artist, meta.album].filter(Boolean).join(" · ") }}
            </div>
        </div>
        <audio
            :src="entry.url"
            controls
            preload="metadata"
            class="lm-preview__audio"
        ></audio>
    </div>
</template>
