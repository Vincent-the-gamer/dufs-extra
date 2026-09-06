<script setup lang="ts">
import type { FileEntry } from "../api/types";
import { state, setSort } from "../store";
import { t } from "../i18n";
import { formatDate, formatSize } from "../utils/format";
import { iconNameOf } from "../utils/filetype";
import { useEntryActions } from "../composables/useEntryActions";
import SvgIcon from "./SvgIcon.vue";
import MoreMenu from "./MoreMenu.vue";

defineProps<{ entries: FileEntry[] }>();

const acts = useEntryActions();

function arrow(k: "name" | "mtime" | "size"): string {
    if (state.sortKey !== k) return "";
    return state.sortDir === "asc" ? " ↑" : " ↓";
}
</script>

<template>
    <div class="lm-table-wrap lm-glass">
        <table class="lm-table">
            <thead>
                <tr>
                    <th
                        :class="{ 'lm-sort-active': state.sortKey === 'name' }"
                        @click="setSort('name')"
                    >
                        {{ t("name") }}{{ arrow("name") }}
                    </th>
                    <th
                        :class="{ 'lm-sort-active': state.sortKey === 'size' }"
                        @click="setSort('size')"
                    >
                        {{ t("size") }}{{ arrow("size") }}
                    </th>
                    <th
                        :class="{ 'lm-sort-active': state.sortKey === 'mtime' }"
                        @click="setSort('mtime')"
                    >
                        {{ t("modified") }}{{ arrow("mtime") }}
                    </th>
                    <th class="lm-table__ops"></th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="e in entries" :key="e.path" @click="acts.open(e)">
                    <td>
                        <span class="lm-cell-name">
                            <span class="lm-ic" :class="`lm-cat-${e.category}`">
                                <SvgIcon :name="iconNameOf(e)" :size="17" />
                            </span>
                            <span class="lm-cell-name__text" :title="e.name">{{
                                e.name
                            }}</span>
                            <span
                                v-if="e.isSymlink"
                                class="lm-badge lm-badge--symlink"
                                >{{ t("symlink") }}</span
                            >
                        </span>
                    </td>
                    <td class="lm-cell-muted">
                        {{ e.isDir ? "—" : formatSize(e.size) }}
                    </td>
                    <td class="lm-cell-muted">{{ formatDate(e.mtime) }}</td>
                    <td class="lm-table__ops" @click.stop>
                        <button
                            v-if="!e.isDir"
                            class="lm-btn lm-btn--icon lm-btn--sm"
                            :title="t('preview')"
                            @click="acts.preview(e)"
                        >
                            <SvgIcon name="eye" :size="15" />
                        </button>
                        <button
                            class="lm-btn lm-btn--icon lm-btn--sm"
                            :title="t('download')"
                            @click="acts.download(e)"
                        >
                            <SvgIcon name="download" :size="15" />
                        </button>
                        <button
                            class="lm-btn lm-btn--icon lm-btn--sm"
                            :title="t('copy.link')"
                            @click="acts.copyLink(e)"
                        >
                            <SvgIcon name="link" :size="15" />
                        </button>
                        <MoreMenu
                            :items="acts.menuItems(e)"
                            @select="acts.handle($event, e)"
                        />
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>
