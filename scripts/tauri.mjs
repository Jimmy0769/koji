import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, join } from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

// npm 从编辑器或旧终端启动时，可能尚未继承 rustup 的 PATH。
const env = { ...process.env };
const pathKey =
  Object.keys(env).find((key) => key.toLowerCase() === "path") || "PATH";
const cargoName = process.platform === "win32" ? "cargo.exe" : "cargo";
const inPath = spawnSync(cargoName, ["--version"], { env, encoding: "utf8" });

if (inPath.error?.code === "ENOENT") {
  const cargoBin = join(env.CARGO_HOME || join(homedir(), ".cargo"), "bin");
  if (!existsSync(join(cargoBin, cargoName))) {
    console.error(
      "找不到 Cargo。请先按 README 安装 Rust（rustup），或设置 CARGO_HOME / PATH 后重试。",
    );
    process.exit(1);
  }
  env[pathKey] = `${cargoBin}${delimiter}${env[pathKey] || ""}`;
  console.log(`已为本次 Tauri 运行补充 Rust 工具路径：${cargoBin}`);
}

const require = createRequire(import.meta.url);
const cli = require.resolve("@tauri-apps/cli/tauri.js");
const result = spawnSync(process.execPath, [cli, ...process.argv.slice(2)], {
  env,
  stdio: "inherit",
});
if (result.error) {
  console.error(`无法启动 Tauri：${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
