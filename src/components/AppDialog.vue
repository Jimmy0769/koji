<script setup>
import { ref, watch, onUnmounted } from "vue";
import { date, duration, recordMeta } from "../format.js";
const props = defineProps({ modal: Object, failure: String });
const emit = defineEmits([
  "dismiss",
  "save-record",
  "save-settings",
  "delete-record",
]);
const element = ref(),
  content = ref(""),
  minutes = ref(25),
  error = ref("");
watch(
  () => props.modal,
  (modal) => {
    error.value = "";
    if (modal) {
      content.value =
        modal.record?.finishType === "completed" ? "完成了一个番茄钟" : "";
      minutes.value = modal.minutes ?? 25;
      if (!element.value.open) element.value.showModal();
    } else if (element.value?.open) element.value.close();
  },
  { flush: "post" },
);

function saveSettings() {
  const n = Number(minutes.value);
  if (!Number.isInteger(n) || n < 1 || n > 240) {
    error.value = "请输入 1～240 的整数分钟";
    return;
  }
  emit("save-settings", n);
}

function cancel(e) {
  e.preventDefault();
  if (props.modal?.type !== "record") emit("dismiss");
}

onUnmounted(() => element.value?.close());
</script>
<template>
  <dialog ref="element" @cancel="cancel">
    <p v-if="failure" role="alert" class="dialog-error">{{ failure }}</p>
    <template v-if="modal">
      <template v-if="modal.type === 'record'"
        ><h2>
          {{
            modal.record.finishType === "completed"
              ? "本次专注已完成"
              : "本次专注已结束"
          }}
        </h2>
        <p>生成时间：{{ date(modal.record.createdAt) }}</p>
        <p>
          持续时长：{{ duration(modal.record.duration) }}（计划
          {{ duration(modal.record.plannedDuration) }}）
        </p>
        <label
          >这段时间做了什么？（选填，最多 500 字）<textarea
            id="content"
            v-model="content"
            maxlength="500"
            rows="4"
          />
        </label>
        <div class="actions">
          <button id="discard" @click="emit('dismiss')">放弃记录</button
          ><button
            id="save"
            class="primary"
            @click="emit('save-record', content)"
          >
            保存记录
          </button>
        </div></template
      >
      <template v-else-if="modal.type === 'detail'"
        ><h2>记录详情</h2>
        <p id="detail-meta">{{ recordMeta(modal.record) }}</p>
        <p id="detail-text">{{ modal.record.content || "未填写内容" }}</p>
        <button id="close" @click="emit('dismiss')">关闭</button></template
      >
      <template v-else-if="modal.type === 'delete'"
        ><h2>删除这条记录？</h2>
        <p>删除后无法恢复。</p>
        <div class="actions">
          <button id="cancel" @click="emit('dismiss')">取消</button
          ><button id="delete" @click="emit('delete-record', modal.record.id)">
            确认删除
          </button>
        </div></template
      >
      <template v-else-if="modal.type === 'settings'"
        ><h2>设置</h2>
        <label
          >默认倒计时时长
          <input
            id="default"
            v-model="minutes"
            type="number"
            min="1"
            max="240"
          />
          分钟</label
        >
        <p>对下一次新会话生效</p>
        <p id="error" role="alert">{{ error }}</p>
        <div class="actions">
          <button id="cancel" @click="emit('dismiss')">取消</button
          ><button id="apply" class="primary" @click="saveSettings">
            保存设置
          </button>
        </div></template
      >
    </template>
  </dialog>
</template>
