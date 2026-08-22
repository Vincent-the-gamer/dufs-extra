<script setup lang="ts">
import { toasts } from '../composables/useToast'
import SvgIcon from './SvgIcon.vue'
</script>

<template>
  <div class="lm-toast-host" aria-live="polite">
    <TransitionGroup name="lm-toast">
      <div v-for="x in toasts.list" :key="x.id" class="lm-toast" :class="`lm-toast--${x.type}`">
        <SvgIcon
          :name="x.type === 'success' ? 'check' : x.type === 'error' ? 'alert' : 'info'"
          :size="15"
        />
        <span>{{ x.text }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>
