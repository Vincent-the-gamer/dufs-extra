<script setup lang="ts">
import { ref, watch } from 'vue'
import { dialogs } from '../composables/useDialog'
import { toastE } from '../composables/useToast'
import { t } from '../i18n'

const promptVal = ref('')
const editVal = ref('')
const saving = ref(false)

watch(
  () => dialogs.prompt,
  (v) => {
    if (v) promptVal.value = v.value ?? ''
  },
)
watch(
  () => dialogs.edit,
  (v) => {
    if (v) {
      editVal.value = v.text
      saving.value = false
    }
  },
)

function confirm(v: boolean): void {
  dialogs.confirm?.resolve(v)
  dialogs.confirm = null
}

function prompt(ok: boolean): void {
  const v = ok ? promptVal.value.trim() : null
  if (ok && !v) {
    toastE(t('name.invalid'))
    return
  }
  dialogs.prompt?.resolve(v)
  dialogs.prompt = null
}

async function editSave(): Promise<void> {
  const d = dialogs.edit
  if (!d || saving.value) return
  saving.value = true
  const ok = await d.save(editVal.value)
  saving.value = false
  if (ok) {
    d.resolve(true)
    dialogs.edit = null
  } else {
    toastE(t('failed'))
  }
}

function editCancel(): void {
  if (saving.value) return
  dialogs.edit?.resolve(false)
  dialogs.edit = null
}
</script>

<template>
  <Teleport to="body">
    <!-- 确认 -->
    <div v-if="dialogs.confirm" class="lm-dialog-mask" @click.self="confirm(false)">
      <div class="lm-dialog lm-glass--modal">
        <div class="lm-dialog__title">{{ dialogs.confirm.title }}</div>
        <p v-if="dialogs.confirm.message" class="lm-dialog__msg">{{ dialogs.confirm.message }}</p>
        <div class="lm-dialog__actions">
          <button class="lm-btn" @click="confirm(false)">{{ t('cancel') }}</button>
          <button
            class="lm-btn"
            :class="dialogs.confirm.danger ? 'lm-btn--danger' : 'lm-btn--primary'"
            @click="confirm(true)"
          >
            {{ dialogs.confirm.okText ?? t('confirm') }}
          </button>
        </div>
      </div>
    </div>

    <!-- 输入 -->
    <div v-if="dialogs.prompt" class="lm-dialog-mask" @click.self="prompt(false)">
      <div class="lm-dialog lm-glass--modal">
        <div class="lm-dialog__title">{{ dialogs.prompt.title }}</div>
        <label v-if="dialogs.prompt.label" class="lm-dialog__label">{{ dialogs.prompt.label }}</label>
        <input
          v-model="promptVal"
          class="lm-input lm-input--block"
          :placeholder="dialogs.prompt.placeholder"
          autofocus
          @keydown.enter="prompt(true)"
        />
        <div class="lm-dialog__actions">
          <button class="lm-btn" @click="prompt(false)">{{ t('cancel') }}</button>
          <button class="lm-btn lm-btn--primary" @click="prompt(true)">
            {{ dialogs.prompt.okText ?? t('confirm') }}
          </button>
        </div>
      </div>
    </div>

    <!-- 编辑文本 -->
    <div v-if="dialogs.edit" class="lm-dialog-mask" @click.self="editCancel()">
      <div class="lm-dialog lm-dialog--wide lm-glass--modal">
        <div class="lm-dialog__title">{{ dialogs.edit.title }}</div>
        <textarea v-model="editVal" class="lm-textarea lm-input--block" rows="18" spellcheck="false"></textarea>
        <div class="lm-dialog__actions">
          <button class="lm-btn" :disabled="saving" @click="editCancel()">{{ t('cancel') }}</button>
          <button class="lm-btn lm-btn--primary" :disabled="saving" @click="editSave()">
            {{ saving ? t('loading') : t('save') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
