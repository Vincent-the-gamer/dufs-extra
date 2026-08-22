<script setup lang="ts">
import { computed, ref } from 'vue'
import type { FileEntry } from '../../api/types'
import { config, MAX_PREVIEW_BYTES } from '../../config'
import { getText } from '../../api/client'
import { escapeHtml, highlightCode, prismLang, renderMarkdown } from '../../utils/highlight'
import { t } from '../../i18n'
import SvgIcon from '../SvgIcon.vue'

const props = defineProps<{ entry: FileEntry }>()

const text = ref('')
const tooLarge = ref(false)
const failed = ref(false)

const maxLines = config.codeHighlightMaxLines ?? 1000
const maxLineLen = config.codeHighlightMaxLineLength ?? 1000
const limitLabel = '5 MB'

async function load(): Promise<void> {
  tooLarge.value = false
  failed.value = false
  text.value = ''
  if (props.entry.size > MAX_PREVIEW_BYTES) {
    tooLarge.value = true
    return
  }
  try {
    text.value = await getText(props.entry.url)
  } catch {
    failed.value = true
  }
}
void load()

const isMarkdown = computed(() => props.entry.ext === 'md' || props.entry.ext === 'markdown')

const html = computed(() => {
  if (!text.value) return ''
  let body = text.value
  const lines = body.split('\n')
  if (lines.length > maxLines) {
    body = lines.slice(0, maxLines).join('\n') + `\n… (${t('truncated')})`
  } else if (lines.some((l) => l.length > maxLineLen)) {
    body = lines.map((l) => (l.length > maxLineLen ? l.slice(0, maxLineLen) + ' …' : l)).join('\n')
  }
  if (isMarkdown.value) return renderMarkdown(body)
  const lang = prismLang(props.entry.ext)
  if (lang) {
    return `<pre class="lm-code"><code class="language-${lang}">${highlightCode(body, lang)}</code></pre>`
  }
  return `<pre class="lm-code"><code>${escapeHtml(body)}</code></pre>`
})
</script>

<template>
  <div class="lm-preview__text">
    <div v-if="tooLarge" class="lm-preview__none">
      <SvgIcon name="alert" :size="40" class="lm-muted" />
      <p>{{ t('preview.tooLarge', { limit: limitLabel }) }}</p>
    </div>
    <div v-else-if="failed" class="lm-preview__none">
      <p>{{ t('failed') }}</p>
    </div>
    <div v-else-if="html" class="lm-markdown" v-html="html"></div>
    <div v-else class="lm-preview__none">
      <p class="lm-muted">{{ t('loading') }}</p>
    </div>
  </div>
</template>
