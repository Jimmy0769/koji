import { ref } from "vue";
import { loadData, saveData } from "../storage.js";

export function usePersistence(notice, storage = window.localStorage) {
  const initial = loadData(storage),
    settings = ref(initial.settings),
    records = ref(initial.records);

  function commit(nextSettings, nextRecords) {
    try {
      saveData(storage, { settings: nextSettings, records: nextRecords });
      settings.value = nextSettings;
      records.value = nextRecords;
      return true;
    } catch {
      notice("保存失败：本地存储不可用，请重试");
      return false;
    }
  }

  return {
    settings,
    records,
    saveRecord: (r) => commit(settings.value, [r, ...records.value]),
    deleteRecord: (id) =>
      commit(
        settings.value,
        records.value.filter((r) => r.id !== id),
      ),
    saveSettings: (patch) =>
      commit({ ...settings.value, ...patch }, records.value),
  };
}
