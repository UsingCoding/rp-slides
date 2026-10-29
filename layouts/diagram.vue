<!--
  Slide with a heading and one large diagram that fills the remaining space.

  ---
  layout: diagram
  ---

  # Заголовок

  ```mermaid
  sequenceDiagram
    A->>B: hello
  ```

  ::caption::
  Необязательная подпись под диаграммой
-->
<template>
  <div class="slidev-layout diagram">
    <slot />
    <div v-if="$slots.caption" class="diagram-caption">
      <slot name="caption" />
    </div>
  </div>
</template>
