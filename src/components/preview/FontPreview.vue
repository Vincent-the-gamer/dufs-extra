<script setup lang="ts">
import { onBeforeUnmount } from 'vue'
import type { FileEntry } from '../../api/types'
import { t } from '../../i18n'

const props = defineProps<{ entry: FileEntry }>()

const FAMILY = 'dufs-font-preview'
const SAMPLE =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789 中文测试 你好，世界！'

function fontFormat(ext: string): string {
  switch (ext) {
    case 'woff':
      return 'woff'
    case 'woff2':
      return 'woff2'
    case 'otf':
      return 'opentype'
    default:
      return 'truetype'
  }
}

const style = document.createElement('style')
style.textContent = `@font-face{font-family:'${FAMILY}';src:url('${props.entry.url}') format('${fontFormat(props.entry.ext)}');font-display:block}`
document.head.appendChild(style)

onBeforeUnmount(() => style.remove())
</script>

<template>
  <div class="lm-preview__font">
    <div class="lm-preview__font-sample" :style="{ fontFamily: FAMILY }">{{ SAMPLE }}</div>
    <div class="lm-sm lm-muted">{{ t('cat.font') }} · {{ entry.name }}</div>
  </div>
</template>
