<template>
  <div class="slide-number">
    <SlideCurrentNo /> / <SlidesTotal />
  </div>
</template>

<style scoped>
.slide-number {
  position: absolute;
  right: 2rem;
  bottom: 1rem;
  color: var(--lecture-secondary);
  font-family: var(--lecture-font-mono);
  font-size: 1rem;
  font-variant-numeric: tabular-nums;
  line-height: 1.5;
  pointer-events: none;
}
</style>
