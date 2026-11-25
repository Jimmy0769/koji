import { computed, onMounted, onUnmounted, ref } from "vue";
import { Timer, formatTime } from "../timer.js";

export function useTimer(defaultMinutes, onFinish, notice) {
  const engine = new Timer(),
    minutes = ref(defaultMinutes()),
    state = ref("idle"),
    remaining = ref(minutes.value * 60),
    planned = ref(remaining.value);
  let interval;

  function sync() {
    state.value = engine.state;
    remaining.value = engine.remaining;
    planned.value = engine.planned;
  }

  function finish() {
    const r = engine.finish();
    if (!r) return;
    minutes.value = defaultMinutes();
    sync();
    onFinish(r);
  }

  function setMinutes(n) {
    if (state.value !== "idle") return;
    if (!Number.isInteger(n) || n < 1 || n > 240)
      return notice("请输入 1～240 的整数分钟");
    minutes.value = n;
  }

  function toggle() {
    if (state.value === "idle") {
      const n = Number(minutes.value);
      if (!Number.isInteger(n) || n < 1 || n > 240)
        return notice("请输入 1～240 的整数分钟");
      engine.start(n);
      notice("");
    } else if (engine.remaining <= 0) return finish();
    else if (state.value === "running") engine.pause();
    else engine.resume();
    sync();
  }

  function stop() {
    if (
      engine.state !== "idle" &&
      (engine.remaining <= 0 || window.confirm("确定要中止本次专注吗？"))
    )
      finish();
  }

  onMounted(() => {
    interval = setInterval(() => {
      if (engine.state === "running" && engine.remaining <= 0) finish();
      else sync();
    }, 200);
  });
  onUnmounted(() => clearInterval(interval));
  return {
    minutes,
    state,
    setMinutes,
    toggle,
    stop,
    time: computed(() =>
      formatTime(
        state.value === "idle" ? Number(minutes.value) * 60 : remaining.value,
      ),
    ),
    progress: computed(
      () =>
        `${state.value === "idle" ? 100 : (remaining.value / planned.value) * 100}%`,
    ),
  };
}
