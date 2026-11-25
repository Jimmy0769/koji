<script setup>
import { computed } from "vue";
import { recordMeta } from "../format.js";
const props = defineProps({ records: Array });
defineEmits(["settings", "detail", "delete"]);
const groups = computed(() => {
  const today = new Date().toDateString(),
    yesterday = new Date(Date.now() - 86400000).toDateString();
  const result = [];
  for (const r of [...props.records].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  )) {
    const d = new Date(r.createdAt).toDateString(),
      label = d === today ? "今天" : d === yesterday ? "昨天" : "更早";
    if (result.at(-1)?.label !== label) result.push({ label, records: [] });
    result.at(-1).records.push(r);
  }
  return result;
});
</script>
<template>
  <section class="records">
    <div class="records-head">
      <strong>专注记录</strong
      ><button id="settings" @click="$emit('settings')">设置</button>
    </div>
    <p v-if="!records.length" class="empty">
      还没有记录<br />从一次专注开始，留下今天的足迹。
    </p>
    <template v-for="group in groups" :key="group.label"
      ><p class="group">{{ group.label }}</p>
      <article v-for="r in group.records" :key="r.id">
        <p>{{ recordMeta(r) }}</p>
        <p class="content" :title="r.content">
          {{ r.content || "未填写内容" }}
        </p>
        <button @click="$emit('detail', r)">详情</button
        ><button @click="$emit('delete', r)">删除</button>
      </article></template
    >
  </section>
</template>
