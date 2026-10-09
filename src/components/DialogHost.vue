<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { confirmDialog, dialogs } from "../composables/useDialog";
import { toastE } from "../composables/useToast";
import { t } from "../i18n";

const promptVal = ref("");
const editVal = ref("");
const saving = ref(false);

// 遮罩「点击外部」判定：只有 mousedown 与 mouseup 都落在遮罩本体上，才算一次
// 真正的点击外部。在文本框内按下拖选文字、把鼠标拖到遮罩上再松开时，浏览器会把
// click 派发到二者最近的公共祖先（也就是遮罩），只看 click.target 会误关闭并
// 丢失编辑内容；改为在 mouseup 时同时校验按下点与松开点，就只认「完整的遮罩点击」。
const maskArmed = { confirm: false, prompt: false, edit: false };
function markMaskDown(
    which: "confirm" | "prompt" | "edit",
    e: MouseEvent,
): void {
    maskArmed[which] = e.target === e.currentTarget;
}

const editDirty = computed(
    () => !!dialogs.edit && editVal.value !== dialogs.edit.text,
);

watch(
    () => dialogs.prompt,
    (v) => {
        if (v) promptVal.value = v.value ?? "";
    },
);
watch(
    () => dialogs.edit,
    (v) => {
        if (v) {
            editVal.value = v.text;
            saving.value = false;
        }
    },
);

function confirm(v: boolean): void {
    dialogs.confirm?.resolve(v);
    dialogs.confirm = null;
}

function onConfirmMaskClick(): void {
    const armed = maskArmed.confirm;
    maskArmed.confirm = false;
    if (armed) confirm(false);
}

function prompt(ok: boolean): void {
    const v = ok ? promptVal.value.trim() : null;
    if (ok && !v) {
        toastE(t("name.invalid"));
        return;
    }
    dialogs.prompt?.resolve(v);
    dialogs.prompt = null;
}

function onPromptMaskClick(): void {
    const armed = maskArmed.prompt;
    maskArmed.prompt = false;
    if (armed) prompt(false);
}

async function editSave(): Promise<void> {
    const d = dialogs.edit;
    if (!d || saving.value) return;
    saving.value = true;
    const ok = await d.save(editVal.value);
    saving.value = false;
    if (ok) {
        d.resolve(true);
        dialogs.edit = null;
    } else {
        toastE(t("failed"));
    }
}

async function editCancel(): Promise<void> {
    if (saving.value) return;
    // 有未保存修改时先确认，避免误触遮罩/取消按钮丢失编辑
    if (editDirty.value) {
        const ok = await confirmDialog({
            title: t("edit.discardTitle"),
            message: t("edit.discardMsg"),
            danger: true,
            okText: t("edit.discardOk"),
        });
        if (!ok) return;
    }
    dialogs.edit?.resolve(false);
    dialogs.edit = null;
}

function onEditMaskClick(): void {
    const armed = maskArmed.edit;
    maskArmed.edit = false;
    if (armed) void editCancel();
}
</script>

<template>
    <Teleport to="body">
        <!-- 确认 -->
        <div
            v-if="dialogs.confirm"
            class="lm-dialog-mask"
            :class="{ 'lm-dialog-mask--above': !!dialogs.edit }"
            @mousedown="markMaskDown('confirm', $event)"
            @mouseup.self="onConfirmMaskClick()"
        >
            <div class="lm-dialog lm-glass--modal">
                <div class="lm-dialog__title">{{ dialogs.confirm.title }}</div>
                <p v-if="dialogs.confirm.message" class="lm-dialog__msg">
                    {{ dialogs.confirm.message }}
                </p>
                <div class="lm-dialog__actions">
                    <button class="lm-btn" @click="confirm(false)">
                        {{ t("cancel") }}
                    </button>
                    <button
                        class="lm-btn"
                        :class="
                            dialogs.confirm.danger
                                ? 'lm-btn--danger'
                                : 'lm-btn--primary'
                        "
                        @click="confirm(true)"
                    >
                        {{ dialogs.confirm.okText ?? t("confirm") }}
                    </button>
                </div>
            </div>
        </div>

        <!-- 输入 -->
        <div
            v-if="dialogs.prompt"
            class="lm-dialog-mask"
            @mousedown="markMaskDown('prompt', $event)"
            @mouseup.self="onPromptMaskClick()"
        >
            <div class="lm-dialog lm-glass--modal">
                <div class="lm-dialog__title">{{ dialogs.prompt.title }}</div>
                <label v-if="dialogs.prompt.label" class="lm-dialog__label">{{
                    dialogs.prompt.label
                }}</label>
                <input
                    v-model="promptVal"
                    class="lm-input lm-input--block"
                    :placeholder="dialogs.prompt.placeholder"
                    autofocus
                    @keydown.enter="prompt(true)"
                />
                <div class="lm-dialog__actions">
                    <button class="lm-btn" @click="prompt(false)">
                        {{ t("cancel") }}
                    </button>
                    <button
                        class="lm-btn lm-btn--primary"
                        @click="prompt(true)"
                    >
                        {{ dialogs.prompt.okText ?? t("confirm") }}
                    </button>
                </div>
            </div>
        </div>

        <!-- 编辑文本 -->
        <div
            v-if="dialogs.edit"
            class="lm-dialog-mask"
            @mousedown="markMaskDown('edit', $event)"
            @mouseup.self="onEditMaskClick()"
        >
            <div class="lm-dialog lm-dialog--editor lm-glass--modal">
                <div class="lm-dialog__title">{{ dialogs.edit.title }}</div>
                <textarea
                    v-model="editVal"
                    class="lm-textarea lm-input--block"
                    rows="18"
                    spellcheck="false"
                ></textarea>
                <div class="lm-dialog__actions">
                    <button
                        class="lm-btn"
                        :disabled="saving"
                        @click="editCancel()"
                    >
                        {{ t("cancel") }}
                    </button>
                    <button
                        class="lm-btn lm-btn--primary"
                        :disabled="saving"
                        @click="editSave()"
                    >
                        {{ saving ? t("loading") : t("save") }}
                    </button>
                </div>
            </div>
        </div>
    </Teleport>
</template>
