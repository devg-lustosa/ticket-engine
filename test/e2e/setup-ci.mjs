import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { localEnvironment } from "../../scripts/local-environment.mjs";

if (!process.env.CI) throw new Error("Este setup é exclusivo do CI; localmente use local:up.");
function cli(args) {
  const result = spawnSync(process.execPath, [path.resolve("node_modules/supabase/dist/supabase.js"), ...args], { encoding: "utf8", stdio: "pipe", timeout: 300000, maxBuffer: 4 * 1024 * 1024 });
  if (result.status !== 0) throw new Error("Supabase do CI não confirmou a operação; a saída privada não foi publicada.");
  return result.stdout;
}
if (process.argv.includes("--stop")) {
  cli(["stop"]);
  console.log("Supabase do job encerrado.");
} else {
  if (fs.existsSync(".env")) throw new Error("O setup de CI não sobrescreve .env existente.");
  cli(["start"]);
  const status = JSON.parse(cli(["status", "--output", "json"]));
  const env = localEnvironment(status, { ticket: randomBytes(32).toString("hex"), webhook: randomBytes(32).toString("hex") });
  fs.writeFileSync(".env", Object.entries(env).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join("\n") + "\n", { flag: "wx", mode: 0o600 });
  console.log("Auth local do job pronto; credenciais efêmeras gravadas somente em .env ignorado.");
}
