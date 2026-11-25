import "./style.css";
import { Timer, formatTime } from "./timer.js";
const timer = new Timer();
let settings = { defaultDurationMinutes: 25 };
let records = [];
try {
  const data = JSON.parse(localStorage.getItem("koji") || "{}");
  if (
    Number.isInteger(data.settings?.defaultDurationMinutes) &&
    data.settings.defaultDurationMinutes >= 1 &&
    data.settings.defaultDurationMinutes <= 240
  )
    settings = data.settings;
  if (Array.isArray(data.records))
    records = data.records.filter(
      (r) =>
        typeof r.id === "string" &&
        typeof r.content === "string" &&
        Number.isFinite(r.duration) &&
        !isNaN(Date.parse(r.createdAt)),
    );
} catch {
  /* 损坏数据保留原值，等待用户处理 */
}
let minutes = settings.defaultDurationMinutes;
function persist() {
  try {
    localStorage.setItem("koji", JSON.stringify({ settings, records }));
    return true;
  } catch {
    notice("保存失败：本地存储不可用，请重试");
    return false;
  }
}
const app = document.querySelector("#app");
app.innerHTML = `<header><strong>◷ koji</strong><span>专注当下</span></header><main><div class="ring"><div><div id="time">25:00</div><p id="state">准备好，开始专注</p></div></div><div class="presets">${[15, 25, 45, 60].map((n) => `<button data-min="${n}">${n} 分钟</button>`).join("")}</div><label>自定义时长 <input id="minutes" type="number" min="1" max="240" value="25"> 分钟</label><div class="actions"><button class="primary" id="toggle">开始专注</button><button id="stop" hidden>中止</button></div><p class="hint">一次只做一件事，慢慢来。</p></main><footer id="notice" role="status"></footer>`;
function setMinutes(n) {
  if (timer.state !== "idle") return;
  if (!Number.isInteger(n) || n < 1 || n > 240) {
    notice("请输入 1～240 的整数分钟");
    return;
  }
  minutes = n;
  document.querySelector("#minutes").value = n;
  update();
}
function notice(text) {
  document.querySelector("#notice").textContent = text;
}
function ended() {
  const record = timer.finish();
  if (!record) return;
  minutes = settings.defaultDurationMinutes;
  document.querySelector("#minutes").value = minutes;
  if (record.finishType === "aborted" && record.duration < 300)
    notice("本次专注不足 5 分钟，未生成记录");
  else recordDialog(record);
  update();
}
function update() {
  const idle = timer.state === "idle";
  document.querySelector("#time").textContent = formatTime(
    idle ? minutes * 60 : timer.remaining,
  );
  document.querySelector("#state").textContent = {
    idle: "准备好，开始专注",
    running: "专注中",
    paused: "已暂停",
  }[timer.state];
  document.querySelector("#toggle").textContent = {
    idle: "开始专注",
    running: "暂停",
    paused: "继续",
  }[timer.state];
  document.querySelector("#stop").hidden = idle;
  document
    .querySelectorAll("[data-min],#minutes")
    .forEach((el) => (el.disabled = !idle));
  document
    .querySelectorAll("[data-min]")
    .forEach((el) =>
      el.classList.toggle("selected", +el.dataset.min === minutes),
    );
  document
    .querySelector(".ring")
    .style.setProperty(
      "--progress",
      `${idle ? 100 : (timer.remaining / timer.planned) * 100}%`,
    );
  document.body.dataset.state = timer.state;
}
document
  .querySelectorAll("[data-min]")
  .forEach((el) => (el.onclick = () => setMinutes(+el.dataset.min)));
document.querySelector("#minutes").onchange = (e) =>
  setMinutes(+e.target.value);
document.querySelector("#toggle").onclick = () => {
  if (timer.state === "idle") {
    const n = +document.querySelector("#minutes").value;
    if (!Number.isInteger(n) || n < 1 || n > 240)
      return notice("请输入 1～240 的整数分钟");
    timer.start(n);
    notice("");
  } else if (timer.remaining <= 0) ended();
  else if (timer.state === "running") timer.pause();
  else timer.resume();
  update();
};
document.querySelector("#stop").onclick = () => {
  if (timer.remaining <= 0 || confirm("确定要中止本次专注吗？")) ended();
};
setInterval(() => {
  if (timer.state === "running" && timer.remaining <= 0) ended();
  update();
}, 200);
update();
const section = document.createElement("section");
section.className = "records";
app.insertBefore(section, document.querySelector("footer"));
const dialog = document.createElement("dialog");
app.append(dialog);
function date(value) {
  return new Date(value).toLocaleString("sv-SE").slice(0, 16);
}
function duration(n) {
  return `${Math.floor(n / 60)} 分钟${n % 60 ? ` ${n % 60} 秒` : ""}`;
}
function modal(html) {
  dialog.innerHTML = html;
  dialog.showModal();
}
function recordDialog(r) {
  modal(
    `<h2>${r.finishType === "completed" ? "本次专注已完成" : "本次专注已结束"}</h2><p>生成时间：${date(r.createdAt)}</p><p>持续时长：${duration(r.duration)}（计划 ${duration(r.plannedDuration)}）</p><label>这段时间做了什么？（选填，最多 500 字）<textarea maxlength="500" rows="4" id="content"></textarea></label><div class="actions"><button id="discard">放弃记录</button><button class="primary" id="save">保存记录</button></div>`,
  );
  if (r.finishType === "completed")
    dialog.querySelector("textarea").value = "完成了一个番茄钟";
  dialog.querySelector("#discard").onclick = () => dialog.close();
  dialog.querySelector("#save").onclick = () => {
    r.content = dialog.querySelector("textarea").value;
    records.unshift(r);
    if (persist()) {
      dialog.close();
      renderRecords();
      notice("记录已保存");
    } else records.shift();
  };
}
function renderRecords() {
  section.innerHTML =
    '<div class="records-head"><strong>专注记录</strong><button id="settings">设置</button></div>';
  if (!records.length)
    section.insertAdjacentHTML(
      "beforeend",
      '<p class="empty">还没有记录<br>从一次专注开始，留下今天的足迹。</p>',
    );
  let last = "";
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  for (const r of [...records].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  )) {
    const day = new Date(r.createdAt).toDateString();
    const group = day === today ? "今天" : day === yesterday ? "昨天" : "更早";
    if (last !== group) {
      const h = document.createElement("p");
      h.className = "group";
      h.textContent = group;
      section.append(h);
      last = group;
    }
    const row = document.createElement("article");
    const meta = document.createElement("p");
    meta.textContent = `${r.finishType === "completed" ? "完成" : "中止"} · ${date(r.createdAt)} · ${duration(r.duration)}`;
    const content = document.createElement("p");
    content.textContent = r.content || "未填写内容";
    content.className = "content";
    content.title = r.content;
    const detail = document.createElement("button");
    detail.textContent = "详情";
    detail.onclick = () => {
      modal(
        '<h2>记录详情</h2><p id="detail-meta"></p><p id="detail-text"></p><button id="close">关闭</button>',
      );
      dialog.querySelector("#detail-meta").textContent = meta.textContent;
      dialog.querySelector("#detail-text").textContent =
        r.content || "未填写内容";
      dialog.querySelector("#close").onclick = () => dialog.close();
    };
    const del = document.createElement("button");
    del.textContent = "删除";
    del.onclick = () => {
      modal(
        '<h2>删除这条记录？</h2><p>删除后无法恢复。</p><div class="actions"><button id="cancel">取消</button><button id="delete">确认删除</button></div>',
      );
      dialog.querySelector("#cancel").onclick = () => dialog.close();
      dialog.querySelector("#delete").onclick = () => {
        const previous = records;
        records = records.filter((x) => x.id !== r.id);
        if (persist()) {
          dialog.close();
          renderRecords();
        } else records = previous;
      };
    };
    row.append(meta, content, detail, del);
    section.append(row);
  }
  section.querySelector("#settings").onclick = () => {
    modal(
      `<h2>设置</h2><label>默认倒计时时长 <input id="default" type="number" min="1" max="240" value="${settings.defaultDurationMinutes}"> 分钟</label><p>对下一次新会话生效</p><p id="error" role="alert"></p><div class="actions"><button id="cancel">取消</button><button class="primary" id="apply">保存设置</button></div>`,
    );
    dialog.querySelector("#cancel").onclick = () => dialog.close();
    dialog.querySelector("#apply").onclick = () => {
      const n = +dialog.querySelector("#default").value;
      if (!Number.isInteger(n) || n < 1 || n > 240) {
        dialog.querySelector("#error").textContent = "请输入 1～240 的整数分钟";
        return;
      }
      const old = settings;
      settings = { ...settings, defaultDurationMinutes: n };
      if (persist()) {
        if (timer.state === "idle") setMinutes(n);
        dialog.close();
      } else settings = old;
    };
  };
}
dialog.addEventListener("cancel", (e) => {
  if (dialog.querySelector("#save")) e.preventDefault();
});
renderRecords();
document.querySelector("#minutes").value = minutes;
// 同一 WebView 调整形态，计时状态不会因切换窗口重新创建。
const native = !!window.__TAURI_INTERNALS__;
let desktop,
  view = settings.lastView === "mini" ? "mini" : "normal",
  switching = false;
settings = { normalAlwaysOnTop: false, miniAlwaysOnTop: true, ...settings };
const tools = document.createElement("nav");
tools.innerHTML =
  '<button id="pin" title="窗口置顶">置顶</button><button id="view" title="切换视图">小窗</button><button id="minimize" title="最小化">—</button><button id="quit" title="关闭">×</button>';
document.querySelector("header").append(tools);
async function positionView() {
  if (!desktop) return;
  const { LogicalSize, PhysicalPosition, availableMonitors } =
    await import("@tauri-apps/api/window");
  await desktop.setSize(
    new LogicalSize(view === "mini" ? 220 : 440, view === "mini" ? 112 : 760),
  );
  const pos = settings[`${view}WindowPos`];
  const monitors = await availableMonitors();
  if (
    pos &&
    monitors.some(
      (m) =>
        pos.x >= m.position.x &&
        pos.y >= m.position.y &&
        pos.x + 220 <= m.position.x + m.size.width &&
        pos.y + 112 <= m.position.y + m.size.height,
    )
  )
    await desktop.setPosition(new PhysicalPosition(pos.x, pos.y));
  else await desktop.center();
  await desktop.setAlwaysOnTop(settings[`${view}AlwaysOnTop`]);
}
function viewUI() {
  document.body.dataset.view = view;
  tools.querySelector("#view").textContent = view === "mini" ? "展开" : "小窗";
  tools
    .querySelector("#pin")
    .classList.toggle("selected", settings[`${view}AlwaysOnTop`]);
  tools
    .querySelector("#pin")
    .setAttribute("aria-pressed", String(settings[`${view}AlwaysOnTop`]));
}
async function switchView() {
  if (switching || dialog.open) return;
  switching = true;
  const old = view;
  try {
    if (desktop) settings[`${view}WindowPos`] = await desktop.outerPosition();
    view = view === "normal" ? "mini" : "normal";
    viewUI();
    await positionView();
    settings.lastView = view;
    persist();
  } catch (e) {
    view = old;
    viewUI();
    notice(`窗口切换失败：${e}`);
  } finally {
    switching = false;
  }
}
tools.querySelector("#view").onclick = switchView;
tools.querySelector("#pin").onclick = async () => {
  if (!desktop) return notice("请使用 Tauri 桌面程序验证置顶");
  const key = `${view}AlwaysOnTop`;
  try {
    await desktop.setAlwaysOnTop(!settings[key]);
    settings[key] = !settings[key];
    persist();
    viewUI();
  } catch (e) {
    notice(`置顶失败：${e}`);
  }
};
tools.querySelector("#minimize").onclick = () =>
  desktop?.minimize().catch((e) => notice(String(e)));
tools.querySelector("#quit").onclick = () =>
  desktop?.close().catch((e) => notice(String(e)));
// 捕获指针，使用屏幕坐标差移动；快速拖动也不会因 IPC 尚未返回而丢失。
function installDrag(el, enabled) {
  let drag;
  el.addEventListener("pointerdown", (e) => {
    if (
      !desktop ||
      !enabled() ||
      e.button !== 0 ||
      e.target.closest("button,input")
    )
      return;
    e.preventDefault();
    el.setPointerCapture(e.pointerId);
    drag = { x: e.screenX, y: e.screenY, start: desktop.outerPosition() };
  });
  async function move(e) {
    if (!drag) return;
    const current = drag,
      dx = e.screenX - current.x,
      dy = e.screenY - current.y;
    if (e.type === "pointerup") drag = null;
    try {
      const p = await current.start;
      const { PhysicalPosition } = await import("@tauri-apps/api/window");
      await desktop.setPosition(
        new PhysicalPosition(
          p.x + Math.round(dx * devicePixelRatio),
          p.y + Math.round(dy * devicePixelRatio),
        ),
      );
    } catch (error) {
      notice(`拖动失败：${error}`);
    }
  }
  el.addEventListener("pointermove", move);
  el.addEventListener("pointerup", move);
  el.addEventListener("pointercancel", () => (drag = null));
}
installDrag(document.querySelector("header"), () => true);
installDrag(document.querySelector("main"), () => view === "mini");
document.querySelector("header").ondblclick = (e) => {
  if (!e.target.closest("button")) switchView();
};
if (native) {
  const { getCurrentWindow, LogicalSize } =
    await import("@tauri-apps/api/window");
  desktop = getCurrentWindow();
  switching = true;
  try {
    await positionView();
  } catch (e) {
    notice(`窗口恢复失败：${e}`);
  } finally {
    switching = false;
  }
  await desktop.onMoved(({ payload }) => {
    if (!switching && !dialog.open) {
      settings[`${view}WindowPos`] = { x: payload.x, y: payload.y };
      persist();
    }
  });
  new MutationObserver(async () => {
    if (view !== "mini") return;
    try {
      switching = true;
      await desktop.setSize(
        new LogicalSize(dialog.open ? 380 : 220, dialog.open ? 380 : 112),
      );
    } catch (e) {
      notice(String(e));
    } finally {
      switching = false;
    }
  }).observe(dialog, { attributes: true, attributeFilter: ["open"] });
} else {
  tools.querySelector("#pin").disabled = true;
  tools.querySelector("#minimize").hidden = true;
  tools.querySelector("#quit").hidden = true;
}
viewUI();
