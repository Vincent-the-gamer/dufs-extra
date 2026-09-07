<script setup lang="ts">
import { computed } from "vue";
import type { FileEntry } from "../../api/types";
import { config } from "../../config";
import { t } from "../../i18n";
import { iconNameOf } from "../../utils/filetype";
import SvgIcon from "../SvgIcon.vue";
import ImagePreview from "./ImagePreview.vue";
import VideoPreview from "./VideoPreview.vue";
import AudioPreview from "./AudioPreview.vue";
import PdfPreview from "./PdfPreview.vue";
import TextPreview from "./TextPreview.vue";
import FontPreview from "./FontPreview.vue";
import OfficePreview from "./OfficePreview.vue";

const props = defineProps<{ entry: FileEntry }>();

// 支持离线本地渲染的 Office 格式（docx 排版渲染；xls/xlsx 表格渲染）
const OFFICE_LOCAL = new Set(["docx", "xls", "xlsx"]);

const kind = computed(() => {
    const e = props.entry;
    if (e.isDir) return "none";
    if (e.ext === "jxl") return "jxl";
    switch (e.category) {
        case "image":
            return "image";
        case "video":
            return "video";
        case "audio":
            return "audio";
        case "pdf":
            return "pdf";
        case "text":
        case "code":
        case "subtitle":
            return "text";
        case "font":
            return "font";
        case "doc":
            return OFFICE_LOCAL.has(e.ext)
                ? "office"
                : config.externalViewer
                  ? "doc"
                  : "external-off";
        case "drawio":
            return config.externalViewer ? "drawio" : "external-off";
        default:
            return "none";
    }
});

const officeUrl = computed(
    () =>
        "https://view.officeapps.live.com/op/embed.aspx?src=" +
        encodeURIComponent(props.entry.url),
);
const drawioUrl = computed(
    () =>
        "https://app.diagrams.net/?embed=1&ui=sketch#U" +
        encodeURIComponent(props.entry.url),
);
const photopeaUrl = computed(
    () => "https://www.photopea.com/#" + encodeURIComponent(props.entry.url),
);
</script>

<template>
    <div class="lm-preview">
        <ImagePreview
            v-if="kind === 'image'"
            :key="entry.path"
            :entry="entry"
        />
        <VideoPreview
            v-else-if="kind === 'video'"
            :key="entry.path"
            :entry="entry"
        />
        <AudioPreview
            v-else-if="kind === 'audio'"
            :key="entry.path"
            :entry="entry"
        />
        <PdfPreview
            v-else-if="kind === 'pdf'"
            :key="entry.path"
            :entry="entry"
        />
        <TextPreview
            v-else-if="kind === 'text'"
            :key="entry.path"
            :entry="entry"
        />
        <FontPreview
            v-else-if="kind === 'font'"
            :key="entry.path"
            :entry="entry"
        />
        <OfficePreview
            v-else-if="kind === 'office'"
            :key="entry.path"
            :entry="entry"
        />
        <iframe
            v-else-if="kind === 'doc'"
            class="lm-preview__frame"
            :src="officeUrl"
            title="office preview"
        ></iframe>
        <iframe
            v-else-if="kind === 'drawio'"
            class="lm-preview__frame"
            :src="drawioUrl"
            title="draw.io"
        ></iframe>
        <div v-else class="lm-preview__none">
            <SvgIcon :name="iconNameOf(entry)" :size="46" class="lm-muted" />
            <p>
                {{
                    kind === "jxl"
                        ? t("jxl.unsupported")
                        : t("preview.unsupported")
                }}
            </p>
            <div class="lm-preview__none-actions">
                <a
                    v-if="kind === 'jxl'"
                    class="lm-btn lm-btn--primary"
                    :href="entry.url"
                    target="_blank"
                    rel="noopener"
                >
                    <SvgIcon name="download" :size="14" />{{ t("download") }}
                </a>
                <a
                    v-if="kind === 'jxl'"
                    class="lm-btn"
                    :href="photopeaUrl"
                    target="_blank"
                    rel="noopener"
                >
                    {{ t("photopea") }}
                </a>
            </div>
            <p v-if="kind === 'external-off'" class="lm-sm">
                {{ t("office.needNetwork") }}
            </p>
        </div>
    </div>
</template>
