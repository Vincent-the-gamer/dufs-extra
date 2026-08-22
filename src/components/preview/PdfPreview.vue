<script setup lang="ts">
import type { FileEntry } from '../../api/types'

defineProps<{ entry: FileEntry }>()
</script>

<template>
  <iframe class="lm-preview__frame" :src="entry.url" title="pdf"></iframe>
</template>
