import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import { randomBytes } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { parseEnv } from "node:util";
import { fileURLToPath } from "node:url";
import { assertLocalEnvironment, assertManagedState, localEnvironment, startDecision } from "./local-environment.mjs";

const root = fs.realpathSync(process.cwd()), temp = path.join(root, "supabase/.temp");
if (root !== fs.realpathSync(fileURLToPath(new URL("..", import.meta.url)))) throw new Error("Execute o gerenciador na raiz do Ticket Engine.");
const stateFile = path.join(temp, "local-next-state.json"), lockFile = path.join(temp, "local-manager.lock");
const command = process.argv[2];
if (!["up", "status", "down"].includes(command)) throw new Error("Use local:up, local:status ou local:down.");
fs.mkdirSync(temp, { recursive: true });
let env = { ...process.env };
function runNode(script, args, label) {
  const result = spawnSync(process.execPath, [path.join(root, script), ...args], { cwd: root, env, encoding: "utf8", windowsHide: true, timeout: 180000, maxBuffer: 2 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`${label} falhou. Nenhum reset ou seed foi executado.`);
  return result.stdout;
}
function supabase(args) { return runNode("node_modules/supabase/dist/supabase.js", args, "Supabase"); }
function dockerReady() { return spawnSync("docker", ["info", "--format", "{{.ServerVersion}}"], { encoding: "utf8", windowsHide: true, timeout: 10000 }).status === 0; }
async function portBusy() {
  return new Promise(resolve => { const socket = net.connect({ host: "127.0.0.1", port: 3000 }); socket.once("connect", () => { socket.destroy(); resolve(true); }); socket.once("error", () => resolve(false)); socket.setTimeout(1000, () => { socket.destroy(); resolve(false); }); });
}
function readState() {
  if (!fs.existsSync(stateFile)) return null;
  const value = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  if (value.phase === "stopped" && value.projectRoot === root) return null;
  return assertManagedState(value, root);
}
async function managedStatus(state) {
  if (!state) return null;
  try {
    const response = await fetch(state.controlUrl + "/status", { headers: { "x-local-control": state.token }, signal: AbortSignal.timeout(2000) });
    if (!response.ok) return null;
    const data = await response.json();
    return data.runId === state.runId ? data : null;
  } catch { return null; }
}
async function authReady(status) {
  try { return (await fetch(status.API_URL + "/auth/v1/health", { headers: { apikey: status.ANON_KEY }, signal: AbortSignal.timeout(3000) })).ok; }
  catch { return false; }
}
function acquireLock() {
  try { fs.writeFileSync(lockFile, String(process.pid), { flag: "wx" }); }
  catch (error) {
    if (error.code !== "EEXIST") throw error;
    const pid = Number(fs.readFileSync(lockFile, "utf8"));
    if (!Number.isSafeInteger(pid) || pid < 1) throw new Error("Lock local inválido; confira supabase/.temp/local-manager.lock.");
    try { process.kill(pid, 0); throw new Error("Outra operação local está em execução."); }
    catch (probe) { if (probe.code !== "ESRCH") throw probe; }
    fs.unlinkSync(lockFile);
    fs.writeFileSync(lockFile, String(process.pid), { flag: "wx" });
  }
}
async function stopManaged(state) {
  const known = await managedStatus(state);
  if (!known) throw new Error("O processo não foi reconhecido. Nenhum PID externo foi encerrado.");
  const response = await fetch(state.controlUrl + "/stop", { method: "POST", headers: { "x-local-control": state.token }, signal: AbortSignal.timeout(15000) });
  if (!response.ok || !(await response.json()).stopped) throw new Error("O front não confirmou a parada. Supabase foi preservado.");
}
async function waitManaged() {
  for (let attempt = 0; attempt < 120; attempt++) {
    const status = await managedStatus(readState());
    if (status?.phase === "ready") return;
    if (status?.phase === "failed") throw new Error("O Next não iniciou; confira supabase/.temp/local-next.log.");
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error("Tempo de inicialização excedido; confira local:status e o log local.");
}

try {
  if (command === "status") {
    const state = readState(), status = await managedStatus(state);
    let database = false;
    const docker = dockerReady();
    if (docker) { try { database = await authReady(JSON.parse(supabase(["status", "--output", "json"]))); } catch {} }
    console.log(JSON.stringify({ docker, supabase: database, front: status?.phase ?? (await portBusy() ? "não gerenciado" : "parado"), appUrl: "http://localhost:3000" }, null, 2));
  } else {
    acquireLock();
    const state = readState(), active = await managedStatus(state), busy = await portBusy();
    if (command === "down") {
      if (active) await stopManaged(state);
      else if (busy) throw new Error("Front não gerenciado na porta 3000. Pare-o no terminal original; Supabase foi preservado.");
      supabase(["stop"]);
      console.log("Front gerenciado e Supabase deste projeto parados. Dados locais preservados.");
    } else {
      const decision = startDecision({ managed: Boolean(active), portBusy: busy });
      if (!dockerReady()) throw new Error("Docker indisponível. Abra o Docker Desktop e repita local:up.");
      let status;
      try { status = JSON.parse(supabase(["status", "--output", "json"])); } catch {}
      if (!status || !await authReady(status)) { supabase(["start"]); status = JSON.parse(supabase(["status", "--output", "json"])); }
      if (!await authReady(status)) throw new Error("Auth local não ficou saudável; nenhum reset foi executado.");
      const envFile = path.join(root, ".env");
      if (!fs.existsSync(envFile)) {
        const values = localEnvironment(status, { ticket: randomBytes(32).toString("hex"), webhook: randomBytes(32).toString("hex") });
        fs.writeFileSync(envFile, Object.entries(values).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join("\n") + "\n", { flag: "wx", mode: 0o600 });
      }
      env = { ...env, ...parseEnv(fs.readFileSync(envFile, "utf8")) };
      assertLocalEnvironment(env, status);
      if (decision === "reuse" && active.phase !== "failed") await waitManaged();
      else {
        if (active) await stopManaged(state);
        runNode("node_modules/prisma/build/index.js", ["migrate", "deploy"], "Migrations (banco existente pode exigir baseline; consulte docs)");
        runNode("node_modules/prisma/build/index.js", ["generate"], "Geração do Prisma");
        const log = fs.openSync(path.join(temp, "local-next.log"), "a");
        const runner = spawn(process.execPath, [path.join(root, "scripts/local-runner.mjs")], { cwd: root, env: { ...env, NODE_ENV: "development" }, detached: true, stdio: ["ignore", log, log], windowsHide: true });
        runner.unref(); fs.closeSync(log);
        await waitManaged();
      }
      console.log("Ticket Engine pronto em http://localhost:3000. Processo independente deste terminal. Use local:status e local:down.");
    }
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { if (fs.existsSync(lockFile) && fs.readFileSync(lockFile, "utf8") === String(process.pid)) fs.unlinkSync(lockFile); }
