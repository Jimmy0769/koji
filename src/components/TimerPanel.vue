<script setup>
defineProps(["minutes", "state", "time", "progress"]);
defineEmits([
  "update:minutes",
  "preset",
  "toggle",
  "stop",
  "drag-start",
  "drag-move",
  "drag-end",
]);
</script>
<template>
  <main
    @pointerdown="$emit('drag-start', $event)"
    @pointermove="$emit('drag-move', $event)"
    @pointerup="$emit('drag-end', $event)"
    @pointercancel="$emit('drag-end', $event)"
  >
    <div class="ring" :style="{ '--progress': progress }">
      <div>
        <div id="time">{{ time }}</div>
        <p id="state">
          {{
            { idle: "准备好，开始专注", running: "专注中", paused: "已暂停" }[
              state
            ]
          }}
        </p>
      </div>
    </div>
    <div class="presets">
      <button
        v-for="n in [15, 25, 45, 60]"
        :key="n"
        :data-min="n"
        :class="{ selected: Number(minutes) === n }"
        :disabled="state !== 'idle'"
        @click="$emit('preset', n)"
      >
        {{ n }} 分钟
      </button>
    </div>
    <label
      >自定义时长
      <input
        id="minutes"
        type="number"
        min="1"
        max="240"
        :value="minutes"
        :disabled="state !== 'idle'"
        @input="$emit('update:minutes', $event.target.value)"
      />
      分钟</label
    >
    <div class="actions">
      <button id="toggle" class="primary" @click="$emit('toggle')">
        {{
          { idle: "开始专注", running: "暂停", paused: "继续" }[state]
        }}</button><button
        v-if="state !== 'idle'"
        id="stop"
        @click="$emit('stop')"
      >
        中止
      </button>
    </div>
    <p class="hint">一次只做一件事，慢慢来。</p>
  </main>
</template>
