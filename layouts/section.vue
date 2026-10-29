<!--
  Section divider between lecture topics.

  ---
  layout: section
  number: 2
  ---

  # Компенсирующие транзакции

  Короткий подзаголовок
-->
<script setup lang="ts">
defineProps<{
  number?: string | number
}>()
</script>

<template>
  <div class="slidev-layout section">
    <div class="section-content">
      <div v-if="number !== undefined" class="section-number">
        {{ String(number).padStart(2, '0') }}
      </div>
      <slot />
    </div>
  </div>
</template>

<style scoped>
.slidev-layout.section {
  height: 100%;
  display: grid;
  align-items: center;
  background: var(--lecture-bg);
  border-left: 12px solid var(--lecture-primary);
  padding-left: 5rem;
}

.section-number {
  font-family: var(--lecture-font-mono);
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--lecture-primary);
  margin-bottom: 0.5rem;
}

.section-content :deep(h1) {
  font-size: 3.4rem;
  font-weight: 700;
  border-bottom: none;
  margin-bottom: 0.75rem;
  padding-bottom: 0;
}

.section-content :deep(p) {
  color: var(--lecture-secondary);
  font-size: 1.5rem;
  margin: 0;
}
</style>
