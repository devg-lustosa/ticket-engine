import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";

process.loadEnvFile(".env");
if (process.platform === "win32" && !process.env.DOCKER_HOST) process.env.DOCKER_HOST = "npipe:////./pipe/dockerDesktopLinuxEngine";
const runId = randomUUID().slice(0, 8), stateFile = path.resolve("supabase/.temp/e2e-state.json");
const env = { ...process.env, TICKET_ENGINE_E2E_RUN_ID: runId, TICKET_ENGINE_BROWSER_RUN: runId };
let server, state;
async function free(port) {
  await new Promise((resolve, reject) => { const probe = net.createServer(); probe.once("error", () => reject(new Error(`Porta ${port} em uso; o processo existente foi preservado.`))); probe.listen(port, "127.0.0.1", () => probe.close(resolve)); });
}
async function command(args) {
  const child = spawn(process.execPath, args, { env, stdio: "inherit", windowsHide: true });
  await new Promise((resolve, reject) => { child.once("error", reject); child.once("exit", code => code === 0 ? resolve() : reject(new Error(`Etapa de testes encerrou com código ${code}.`))); });
}
try {
  await Promise.all([3101, 3102, 3103].map(free));
  server = spawn(process.execPath, ["test/e2e/local-server.mjs"], { env, stdio: "inherit", windowsHide: true });
  const startupDeadline = Date.now() + 240000;
  while (Date.now() < startupDeadline) {
    if (server.exitCode !== null) throw new Error("O ambiente E2E encerrou durante a inicialização.");
    if (fs.existsSync(stateFile)) {
      const candidate = JSON.parse(fs.readFileSync(stateFile, "utf8"));
      if (candidate.runId === runId && candidate.phase === "pronto") { state = candidate; break; }
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  if (!state) throw new Error("Ambiente E2E não ficou pronto no prazo.");
  await command(["--test", "test/e2e/http.test.mjs"]);
  await command(["node_modules/@playwright/test/cli.js", "test", ...process.argv.slice(2)]);
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally {
  if (server && server.exitCode === null && fs.existsSync(stateFile)) {
    const owned = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    if (owned.runId === runId && owned.controlUrl === "http://127.0.0.1:3102" && owned.token) {
      try {
        const exited = new Promise(resolve => server.once("exit", resolve));
        const response = await fetch(owned.controlUrl + "/stop", { method: "POST", headers: { "x-e2e-control": owned.token }, signal: AbortSignal.timeout(30000) });
        if (!response.ok) throw new Error("Limpeza E2E falhou.");
        let timer;
        await Promise.race([exited, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("Limpeza E2E não encerrou.")), 30000); })]).finally(() => clearTimeout(timer));
        const completed = JSON.parse(fs.readFileSync(stateFile, "utf8"));
        if (completed.phase !== "encerrado") throw new Error("Limpeza E2E não confirmada.");
      } catch (error) { console.error(error.message); process.exitCode = 1; server.kill(); }
    } else { console.error("Ambiente não confirmou propriedade para limpeza; conferir e2e-state.json."); process.exitCode = 1; }
  }
}
