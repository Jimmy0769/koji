<script setup>
import { ref, watch, watchEffect, onUnmounted } from "vue";
import TitleBar from "./components/TitleBar.vue";
import TimerPanel from "./components/TimerPanel.vue";
import { useTimer } from "./composables/useTimer.js";
import { usePersistence } from "./composables/usePersistence.js";
import { shouldOfferRecord } from "./storage.js";
import RecordList from "./components/RecordList.vue";
import AppDialog from "./components/AppDialog.vue";
import { useWindow } from "./composables/useWindow.js";

const message = ref(""),
  dialogError = ref(""),
  notice = (text) => {
    message.value = text;
    if (modal.value) dialogError.value = text;
  };
const store = usePersistence(notice),
  modal = ref(null);
const windowState = useWindow(store, modal, notice);

watch(modal, () => (dialogError.value = ""));

const timer = useTimer(
  () => store.settings.value.defaultDurationMinutes,
  (r) => {
    if (shouldOfferRecord(r)) modal.value = { type: "record", record: r };
    else notice("本次专注不足 5 分钟，未生成记录");
  },
  notice,
);

function saveRecord(content) {
  if (
    store.saveRecord({ ...modal.value.record, content: content.slice(0, 500) })
  ) {
    modal.value = null;
    notice("记录已保存");
  }
}

function saveSettings(n) {
  if (store.saveSettings({ defaultDurationMinutes: n })) {
    if (timer.state.value === "idle") timer.setMinutes(n);
    modal.value = null;
  }
}

function deleteRecord(id) {
  if (store.deleteRecord(id)) modal.value = null;
}

watchEffect(
  () => {
    document.body.dataset.state = timer.state.value;
    document.body.dataset.view = windowState.view.value;
  },
  { flush: "post" },
);

onUnmounted(() => {
  delete document.body.dataset.state;
  delete document.body.dataset.view;
});
</script>

<template>
  <TitleBar
    :view="windowState.view.value"
    :pinned="windowState.pinned.value"
    :native="windowState.native"
    :ready="windowState.ready.value"
    :busy="windowState.busy.value || !!modal"
    @switch="windowState.switchView"
    @pin="windowState.togglePin"
    @minimize="windowState.minimize"
    @close="windowState.close"
    @drag-start="windowState.startDrag"
    @drag-move="windowState.moveDrag"
    @drag-end="windowState.endDrag"
  />
  <TimerPanel
    v-model:minutes="timer.minutes.value"
    :state="timer.state.value"
    :time="timer.time.value"
    :progress="timer.progress.value"
    @preset="timer.setMinutes"
    @toggle="!modal && timer.toggle()"
    @stop="timer.stop"
    @drag-start="windowState.startDrag($event, true)"
    @drag-move="windowState.moveDrag"
    @drag-end="windowState.endDrag"
  />
  <RecordList
    :records="store.records.value"
    @settings="
      modal = {
        type: 'settings',
        minutes: store.settings.value.defaultDurationMinutes,
      }
    "
    @detail="modal = { type: 'detail', record: $event }"
    @delete="modal = { type: 'delete', record: $event }"
  />
  <footer id="notice" role="status">{{ message }}</footer>
  <AppDialog
    :modal="modal"
    :failure="dialogError"
    @dismiss="modal = null"
    @save-record="saveRecord"
    @save-settings="saveSettings"
    @delete-record="deleteRecord"
  />
</template>
