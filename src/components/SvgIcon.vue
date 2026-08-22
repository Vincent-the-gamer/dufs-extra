<script setup lang="ts">
import { icons } from '../utils/icons'

withDefaults(defineProps<{ name: string; size?: number | string }>(), { size: 18 })
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-for="(el, i) in icons[name] ?? []" :key="i">
      <component :is="el.tag" v-bind="el.attrs" />
    </template>
  </svg>
</template>
