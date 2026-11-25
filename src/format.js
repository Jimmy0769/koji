export const date = (value) =>
  new Date(value).toLocaleString("sv-SE").slice(0, 16);

export const duration = (n) =>
  `${Math.floor(n / 60)} 分钟${n % 60 ? ` ${n % 60} 秒` : ""}`;

export const recordMeta = (r) =>
  `${r.finishType === "completed" ? "完成" : "中止"} · ${date(r.createdAt)} · ${duration(r.duration)}`;
