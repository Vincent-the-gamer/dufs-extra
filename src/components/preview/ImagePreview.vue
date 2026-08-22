<script setup lang="ts">
import { ref } from 'vue'
import type { FileEntry } from '../../api/types'
import { t } from '../../i18n'

defineProps<{ entry: FileEntry }>()

const dims = ref('')

function onLoad(e: Event): void {
  const img = e.target as HTMLImageElement
  if (img.naturalWidth) dims.value = `${img.naturalWidth} × ${img.naturalHeight}`
}
</script>

<template>
  <figure class="lm-preview__img-wrap">
    <img :src="entry.url" alt="" class="lm-preview__img" @load="onLoad" />
    <figcaption v-if="dims" class="lm-muted lm-sm">{{ t('dims') }}：{{ dims }}</figcaption>
  </figure>
</template>
