<script setup>
defineProps({
  view: String,
  pinned: Boolean,
  native: Boolean,
  ready: Boolean,
  busy: Boolean,
});
defineEmits([
  "pin",
  "switch",
  "minimize",
  "close",
  "drag-start",
  "drag-move",
  "drag-end",
]);
</script>
<template>
  <header
    @pointerdown="$emit('drag-start', $event)"
    @pointermove="$emit('drag-move', $event)"
    @pointerup="$emit('drag-end', $event)"
    @pointercancel="$emit('drag-end', $event)"
    @dblclick="!$event.target.closest('button') && $emit('switch')"
  >
    <strong>◷ koji</strong><span>专注当下</span>
    <nav>
      <button
        id="pin"
        title="窗口置顶"
        :class="{ selected: pinned }"
        :aria-pressed="pinned"
        :disabled="!native || !ready || busy"
        @click="$emit('pin')"
      >
        置顶</button
      ><button
        id="view"
        title="切换视图"
        :disabled="!ready || busy"
        @click="$emit('switch')"
      >
        {{ view === "mini" ? "展开" : "小窗" }}</button
      ><button
        v-if="native"
        id="minimize"
        title="最小化"
        :disabled="!ready || busy"
        @click="$emit('minimize')"
      >
        —</button
      ><button
        v-if="native"
        id="quit"
        title="关闭"
        :disabled="!ready || busy"
        @click="$emit('close')"
      >
        ×
      </button>
    </nav>
  </header>
</template>
