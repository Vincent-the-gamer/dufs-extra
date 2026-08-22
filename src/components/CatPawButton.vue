<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { t } from '../i18n'

const progress = ref(0)
const visible = ref(false)

function onScroll(): void {
  const doc = document.documentElement
  const max = doc.scrollHeight - doc.clientHeight
  progress.value = max > 0 ? Math.min(1, window.scrollY / max) : 0
  visible.value = window.scrollY > 240
}

onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))

function toTop(): void {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
  <Transition name="lm-fade">
    <button v-if="visible" class="lm-paw" :title="t('toTop')" @click="toTop()">
      <svg viewBox="0 0 64 64" class="lm-paw__svg" aria-hidden="true">
        <defs>
          <clipPath id="paw-clip">
            <rect x="0" y="0" width="64" :height="64 * progress" />
          </clipPath>
        </defs>
        <g class="lm-paw__outline">
          <ellipse cx="18" cy="20" rx="9" ry="12" transform="rotate(-18 18 20)" />
          <ellipse cx="46" cy="20" rx="9" ry="12" transform="rotate(18 46 20)" />
          <ellipse cx="13" cy="36" rx="8" ry="10" transform="rotate(-32 13 36)" />
          <ellipse cx="51" cy="36" rx="8" ry="10" transform="rotate(32 51 36)" />
          <ellipse cx="32" cy="42" rx="16" ry="13" />
        </g>
        <g class="lm-paw__fill" clip-path="url(#paw-clip)">
          <ellipse cx="18" cy="20" rx="9" ry="12" transform="rotate(-18 18 20)" />
          <ellipse cx="46" cy="20" rx="9" ry="12" transform="rotate(18 46 20)" />
          <ellipse cx="13" cy="36" rx="8" ry="10" transform="rotate(-32 13 36)" />
          <ellipse cx="51" cy="36" rx="8" ry="10" transform="rotate(32 51 36)" />
          <ellipse cx="32" cy="42" rx="16" ry="13" />
        </g>
      </svg>
    </button>
  </Transition>
</template>
