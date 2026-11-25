import { test } from "node:test";
import assert from "node:assert/strict";
import { Timer, formatTime } from "./timer.js";
test("暂停时间不计入专注，继续后从暂停点恢复", () => {
  let now = 0;
  const t = new Timer(() => now);
  t.start(25);
  now = 120000;
  t.pause();
  now += 600000;
  assert.equal(t.spent, 120);
  t.resume();
  now += 180000;
  const r = t.finish();
  assert.equal(r.duration, 300);
  assert.equal(r.finishType, "aborted");
  assert.equal(t.finish(), null);
});
test("归零优先于中止，超时不超过计划时长", () => {
  let now = 0;
  const t = new Timer(() => now);
  t.start(1);
  now = 90000;
  assert.equal(t.remaining, 0);
  assert.equal(t.finish().finishType, "completed");
});
test("显示 99 分钟及小时边界", () => {
  assert.equal(formatTime(5940), "99:00");
  assert.equal(formatTime(6000), "01:40:00");
  assert.equal(formatTime(0), "00:00");
});
