export const defaultSettings = {
  defaultDurationMinutes: 25,
  normalAlwaysOnTop: false,
  miniAlwaysOnTop: true,
};

export function loadData(storage) {
  let settings = { ...defaultSettings },
    records = [];
  try {
    const data = JSON.parse(storage.getItem("koji") || "{}");
    if (
      Number.isInteger(data.settings?.defaultDurationMinutes) &&
      data.settings.defaultDurationMinutes >= 1 &&
      data.settings.defaultDurationMinutes <= 240
    )
      settings = { ...settings, ...data.settings };
    if (Array.isArray(data.records))
      records = data.records.filter(
        (r) =>
          r &&
          typeof r.id === "string" &&
          typeof r.content === "string" &&
          Number.isFinite(r.duration) &&
          !isNaN(Date.parse(r.createdAt)),
      );
  } catch {
    /* 与旧版本一致：保留原始存储，不覆盖损坏数据。 */
  }
  return { settings, records };
}

export function saveData(storage, data) {
  storage.setItem("koji", JSON.stringify(data));
}

export function shouldOfferRecord(record) {
  return record.finishType === "completed" || record.duration >= 300;
}
