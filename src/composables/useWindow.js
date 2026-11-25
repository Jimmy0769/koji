import { computed, onMounted, onUnmounted, ref, watch } from "vue";

export function useWindow(store, modal, notice) {
  const native = !!window.__TAURI_INTERNALS__,
    view = ref(store.settings.value.lastView === "mini" ? "mini" : "normal"),
    ready = ref(!native),
    busy = ref(false);
  let desktop,
    api,
    disposed = false,
    unlisten,
    drag = null,
    queue = Promise.resolve();
  const pinned = computed(
    () => !!store.settings.value[`${view.value}AlwaysOnTop`],
  );
  const size = (v, open = false) =>
    new api.LogicalSize(
      v === "mini" ? (open ? 380 : 220) : 440,
      v === "mini" ? (open ? 380 : 112) : 760,
    );

  function run(action) {
    const job = queue.then(async () => {
      if (disposed) return;
      busy.value = true;
      try {
        return await action();
      } catch (e) {
        notice(`窗口操作失败：${e}`);
      } finally {
        busy.value = false;
      }
    });
    queue = job.catch(() => {});
    return job;
  }

  async function restore(v) {
    await desktop.setSize(size(v));
    const pos = store.settings.value[`${v}WindowPos`],
      monitors = await api.availableMonitors(),
      scale = await desktop.scaleFactor(),
      width = (v === "mini" ? 220 : 440) * scale,
      height = (v === "mini" ? 112 : 760) * scale;
    if (
      pos &&
      Number.isFinite(pos.x) &&
      Number.isFinite(pos.y) &&
      monitors.some(
        (m) =>
          pos.x >= m.position.x &&
          pos.y >= m.position.y &&
          pos.x + width <= m.position.x + m.size.width &&
          pos.y + height <= m.position.y + m.size.height,
      )
    )
      await desktop.setPosition(new api.PhysicalPosition(pos.x, pos.y));
    else await desktop.center();
    await desktop.setAlwaysOnTop(!!store.settings.value[`${v}AlwaysOnTop`]);
  }

  async function switchView() {
    if (!ready.value || busy.value || modal.value) return;
    return run(async () => {
      const old = view.value,
        next = old === "normal" ? "mini" : "normal";
      const pos = desktop ? await desktop.outerPosition() : null;
      try {
        if (desktop) await restore(next);
        const patch = { lastView: next };
        if (pos) patch[`${old}WindowPos`] = { x: pos.x, y: pos.y };
        if (!store.saveSettings(patch)) {
          if (desktop) await restore(old);
          return;
        }
        view.value = next;
      } catch (e) {
        if (desktop) await restore(old);
        throw e;
      }
    });
  }

  function togglePin() {
    if (!native || !ready.value || busy.value) return;
    return run(async () => {
      const key = `${view.value}AlwaysOnTop`,
        old = pinned.value;
      await desktop.setAlwaysOnTop(!old);
      if (!store.saveSettings({ [key]: !old }))
        await desktop.setAlwaysOnTop(old);
    });
  }

  function startDrag(e, miniOnly = false) {
    if (
      !native ||
      !ready.value ||
      busy.value ||
      modal.value ||
      (miniOnly && view.value !== "mini") ||
      e.button !== 0 ||
      e.target.closest("button,input,textarea")
    )
      return;
    e.preventDefault();
    const element = e.currentTarget;
    element.setPointerCapture(e.pointerId);
    drag = {
      element,
      id: e.pointerId,
      x: e.screenX,
      y: e.screenY,
      start: desktop.outerPosition(),
    };
  }

  function moveDrag(e) {
    if (!drag) return;
    const current = drag,
      x = e.screenX,
      y = e.screenY;
    queue = queue.then(async () => {
      if (disposed) return;
      try {
        const p = await current.start;
        await desktop.setPosition(
          new api.PhysicalPosition(
            p.x + Math.round((x - current.x) * devicePixelRatio),
            p.y + Math.round((y - current.y) * devicePixelRatio),
          ),
        );
      } catch (error) {
        notice(`拖动失败：${error}`);
      }
    });
  }

  function endDrag(e) {
    if (!drag) return;
    if (e.type !== "pointercancel") moveDrag(e);
    const current = drag;
    drag = null;
    if (current.element.hasPointerCapture(current.id))
      current.element.releasePointerCapture(current.id);
  }

  watch(
    () => !!modal.value,
    (open) => {
      if (!desktop || view.value !== "mini" || !ready.value) return;
      run(() => desktop.setSize(size("mini", open)));
    },
    { flush: "post" },
  );
  onMounted(async () => {
    if (!native) return;
    try {
      api = await import("@tauri-apps/api/window");
      if (disposed) return;
      desktop = api.getCurrentWindow();
      await restore(view.value);
      if (disposed) return;
      const stop = await desktop.onMoved(({ payload }) => {
        if (!disposed && !busy.value && !modal.value)
          store.saveSettings({
            [`${view.value}WindowPos`]: { x: payload.x, y: payload.y },
          });
      });
      if (disposed) stop();
      else {
        unlisten = stop;
        ready.value = true;
      }
    } catch (e) {
      notice(`窗口恢复失败：${e}`);
    }
  });
  onUnmounted(() => {
    disposed = true;
    unlisten?.();
    if (drag?.element.hasPointerCapture(drag.id))
      drag.element.releasePointerCapture(drag.id);
    drag = null;
  });
  return {
    native,
    view,
    ready,
    busy,
    pinned,
    switchView,
    togglePin,
    startDrag,
    moveDrag,
    endDrag,
    minimize: () => desktop && run(() => desktop.minimize()),
    close: () => desktop && run(() => desktop.close()),
  };
}
