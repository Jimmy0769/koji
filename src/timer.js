export class Timer {
  constructor(now = () => performance.now()) {
    this.now = now;
    this.state = "idle";
    this.planned = 1500;
    this.elapsed = 0;
  }

  get spent() {
    return Math.min(
      this.planned,
      this.elapsed +
        (this.state === "running" ? (this.now() - this.anchor) / 1000 : 0),
    );
  }

  get remaining() {
    return Math.max(0, this.planned - this.spent);
  }

  start(minutes) {
    if (this.state !== "idle") return;
    this.planned = minutes * 60;
    this.elapsed = 0;
    this.startedAt = new Date().toISOString();
    this.anchor = this.now();
    this.state = "running";
  }

  pause() {
    if (this.state !== "running") return;
    this.elapsed = this.spent;
    this.state = "paused";
  }

  resume() {
    if (this.state !== "paused") return;
    this.anchor = this.now();
    this.state = "running";
  }

  finish() {
    if (this.state === "idle") return null;
    const duration = Math.floor(this.spent);
    const finishType = this.remaining <= 0 ? "completed" : "aborted";
    this.state = "idle";
    this.elapsed = 0;
    return {
      id: crypto.randomUUID(),
      startedAt: this.startedAt,
      createdAt: new Date().toISOString(),
      duration,
      plannedDuration: this.planned,
      finishType,
      content: "",
    };
  }
}

export function formatTime(seconds) {
  const n = Math.ceil(seconds);
  const s = String(n % 60).padStart(2, "0");
  const m = String(Math.floor(n / 60) % 60).padStart(2, "0");
  return n >= 6000
    ? `${String(Math.floor(n / 3600)).padStart(2, "0")}:${m}:${s}`
    : `${String(Math.floor(n / 60)).padStart(2, "0")}:${s}`;
}
