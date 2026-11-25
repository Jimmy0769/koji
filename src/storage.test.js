import { test } from "node:test";
import assert from "node:assert/strict";
import { loadData, shouldOfferRecord } from "./storage.js";
import { usePersistence } from "./composables/usePersistence.js";
test("旧存储保留记录及窗口偏好，缺失设置补默认值", () => {
  const record = {
    id: "old",
    content: "旧内容",
    duration: 60,
    createdAt: "2026-11-25T00:00:00Z",
  };
  const data = loadData({
    getItem: () =>
      JSON.stringify({
        settings: {
          defaultDurationMinutes: 45,
          miniWindowPos: { x: 100, y: 200 },
          lastView: "mini",
        },
        records: [record],
      }),
  });
  assert.equal(data.settings.defaultDurationMinutes, 45);
  assert.deepEqual(data.records, [record]);
  assert.equal(data.settings.miniAlwaysOnTop, true);
  assert.deepEqual(data.settings.miniWindowPos, { x: 100, y: 200 });
});
test("写入成功后更新响应式数据；失败时保留原记录、设置和调用方草稿", () => {
  let fail = false,
    saved;
  const messages = [];
  const store = usePersistence((t) => messages.push(t), {
    getItem: () => null,
    setItem: (key, value) => {
      assert.equal(key, "koji");
      if (fail) throw Error("quota");
      saved = JSON.parse(value);
    },
  });
  const draft = { id: "new", content: "草稿" };
  assert.equal(store.saveRecord(draft), true);
  assert.equal(saved.records.length, 1);
  fail = true;
  assert.equal(store.deleteRecord("new"), false);
  assert.equal(store.saveSettings({ defaultDurationMinutes: 60 }), false);
  assert.equal(store.saveRecord({ id: "second" }), false);
  assert.equal(store.records.value.length, 1);
  assert.equal(store.settings.value.defaultDurationMinutes, 25);
  assert.equal(draft.content, "草稿");
  assert.equal(messages.length, 3);
});
test("完成不受五分钟限制；中止在300秒边界生成填写框", () => {
  assert.equal(
    shouldOfferRecord({ finishType: "completed", duration: 60 }),
    true,
  );
  assert.equal(
    shouldOfferRecord({ finishType: "aborted", duration: 299 }),
    false,
  );
  assert.equal(
    shouldOfferRecord({ finishType: "aborted", duration: 300 }),
    true,
  );
});
test("损坏 JSON 不会覆盖原始存储", () => {
  let writes = 0;
  assert.deepEqual(
    loadData({ getItem: () => "{bad", setItem: () => writes++ }).records,
    [],
  );
  assert.equal(writes, 0);
});
