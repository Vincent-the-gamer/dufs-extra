<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { closeDrawer, state } from "../store";
import { t } from "../i18n";
import { copyText, formatDate, formatSize } from "../utils/format";
import { categoryLabel, iconNameOf } from "../utils/filetype";
import { fetchHash } from "../api/client";
import { glass } from "../config";
import { toastE, toastS } from "../composables/useToast";
import { useEntryActions } from "../composables/useEntryActions";
import SvgIcon from "./SvgIcon.vue";
import MoreMenu from "./MoreMenu.vue";
import PreviewPanel from "./preview/PreviewPanel.vue";

const entry = computed(() => state.drawerEntry);
const router = useRouter();
const acts = useEntryActions();

const hash = ref("");
const hashing = ref(false);
const canWrite = computed(() => !!state.data?.allow_upload);
const isText = computed(() => {
    const e = entry.value;
    return (
        !!e &&
        (e.category === "text" ||
            e.category === "code" ||
            e.category === "subtitle")
    );
});

watch(
    () => state.drawerEntry,
    () => {
        hash.value = "";
        hashing.value = false;
    },
);

async function computeHash(): Promise<void> {
    if (!entry.value || hashing.value) return;
    hashing.value = true;
    const h = await fetchHash(entry.value.url);
    hashing.value = false;
    if (h) hash.value = h;
    else toastE(t("failed"));
}

async function copyHash(): Promise<void> {
    if (hash.value && (await copyText(hash.value))) toastS(t("copied"));
}

async function copyPath(): Promise<void> {
    if (entry.value && (await copyText(entry.value.path))) toastS(t("copied"));
}

function openDir(): void {
    const e = entry.value;
    if (!e) return;
    closeDrawer();
    router.push(e.path);
}
</script>

<template>
    <Teleport to="body">
        <Transition name="lm-fade">
            <div
                v-if="entry"
                class="lm-drawer-mask"
                @click="closeDrawer()"
            ></div>
        </Transition>
        <Transition name="lm-drawer">
            <aside
                v-if="entry"
                class="lm-drawer lm-glass--modal"
                :class="{ 'lm-glass--solid': !glass('preview') }"
            >
                <header class="lm-drawer__head">
                    <span class="lm-ic" :class="`lm-cat-${entry.category}`">
                        <SvgIcon :name="iconNameOf(entry)" :size="20" />
                    </span>
                    <span class="lm-drawer__title" :title="entry.name">{{
                        entry.name
                    }}</span>
                    <button
                        class="lm-btn lm-btn--icon"
                        :title="t('close')"
                        @click="closeDrawer()"
                    >
                        <SvgIcon name="x" :size="16" />
                    </button>
                </header>

                <div class="lm-drawer__body">
                    <div v-if="!entry.isDir" class="lm-drawer__preview">
                        <PreviewPanel
                            :key="`${entry.path}:${entry.mtime}:${entry.size}`"
                            :entry="entry"
                        />
                    </div>

                    <dl class="lm-kv">
                        <dt>{{ t("type") }}</dt>
                        <dd>
                            {{ categoryLabel(entry.category)
                            }}<span v-if="entry.ext"> · {{ entry.ext }}</span>
                            <span
                                v-if="entry.isSymlink"
                                class="lm-badge lm-badge--symlink"
                                >{{ t("symlink") }}</span
                            >
                        </dd>
                        <dt>{{ t("size") }}</dt>
                        <dd>
                            {{ entry.isDir ? "—" : formatSize(entry.size) }}
                        </dd>
                        <dt>{{ t("modified") }}</dt>
                        <dd>{{ formatDate(entry.mtime) }}</dd>
                        <dt>{{ t("path") }}</dt>
                        <dd
                            class="lm-kv__path"
                            :title="t('copy')"
                            @click="copyPath()"
                        >
                            {{ entry.path }}
                        </dd>
                        <template v-if="!entry.isDir">
                            <dt>{{ t("sha256") }}</dt>
                            <dd>
                                <template v-if="hash">
                                    <span class="lm-kv__hash">{{ hash }}</span>
                                    <button
                                        class="lm-btn lm-btn--icon lm-btn--sm"
                                        :title="t('copy')"
                                        @click="copyHash()"
                                    >
                                        <SvgIcon name="copy" :size="13" />
                                    </button>
                                </template>
                                <button
                                    v-else
                                    class="lm-btn lm-btn--sm"
                                    :disabled="hashing"
                                    @click="computeHash()"
                                >
                                    {{
                                        hashing
                                            ? t("loading")
                                            : t("sha256.compute")
                                    }}
                                </button>
                            </dd>
                        </template>
                    </dl>
                </div>

                <footer class="lm-drawer__foot">
                    <button
                        v-if="entry.isDir"
                        class="lm-btn lm-btn--primary"
                        @click="openDir()"
                    >
                        <SvgIcon name="folderOpen" :size="15" />{{ t("open") }}
                    </button>
                    <button
                        v-else
                        class="lm-btn lm-btn--primary"
                        @click="acts.download(entry)"
                    >
                        <SvgIcon name="download" :size="15" />{{
                            t("download")
                        }}
                    </button>
                    <button class="lm-btn" @click="acts.copyLink(entry)">
                        <SvgIcon name="link" :size="15" />{{ t("copy.link") }}
                    </button>
                    <button class="lm-btn" @click="acts.copyToken(entry)">
                        <SvgIcon name="key" :size="15" />{{ t("copy.token") }}
                    </button>
                    <button
                        v-if="isText && canWrite"
                        class="lm-btn"
                        @click="acts.edit(entry)"
                    >
                        <SvgIcon name="pencil" :size="15" />{{ t("edit") }}
                    </button>
                    <MoreMenu
                        up
                        :items="acts.menuItems(entry)"
                        @select="acts.handle($event, entry)"
                    />
                </footer>
            </aside>
        </Transition>
    </Teleport>
</template>
