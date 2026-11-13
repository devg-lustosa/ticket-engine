import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { randomUUID } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";

const projectRoot = fs.realpathSync(process.cwd());
const stateFile = path.join(projectRoot, "supabase/.temp/local-next-state.json");
const token = randomUUID(), runId = randomUUID(), appUrl = "http://localhost:3000";
let phase = "starting", controlUrl, child, stopping = false;
function writeState() {
  const state = { projectRoot, phase, runId, appUrl, pid: process.pid, childPid: child?.pid,
    ...(phase === "stopped" ? {} : { controlUrl, token }) };
  const temp = stateFile + ".tmp";
  fs.writeFileSync(temp, JSON.stringify(state, null, 2), { mode: 0o600 });
  fs.renameSync(temp, stateFile);
}

async function stopChild() {
  if (!child || !child.pid || child.exitCode !== null) return;
  const exited = new Promise(resolve => child.once("exit", resolve));
  if (process.platform === "win32") {
    // O PID vem do ChildProcess vivo; nunca usamos um PID recuperado do disco.
    try { execFileSync("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], { stdio: "pipe", windowsHide: true }); }
    catch { /* O worker pode encerrar entre o sinal e a enumeração da árvore. */ }
  } else child.kill("SIGTERM");
  let timer;
  await Promise.race([exited, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("O Next não encerrou; conferir o log local.")), 10000); })]).finally(() => clearTimeout(timer));
}

const control = http.createServer(async (request, response) => {
  response.setHeader("Content-Type", "application/json");
  if (request.headers["x-local-control"] !== token) { response.writeHead(403); response.end("{}"); return; }
  if (request.url === "/status" && request.method === "GET") { response.end(JSON.stringify({ phase, runId })); return; }
  if (request.url !== "/stop" || request.method !== "POST" || stopping) { response.writeHead(409); response.end("{}"); return; }
  stopping = true;
  try {
    await stopChild();
    phase = "stopped"; writeState();
    response.end(JSON.stringify({ stopped: true, runId }));
    control.close();
  } catch (error) {
    stopping = false;
    response.writeHead(500); response.end(JSON.stringify({ error: error.message }));
  }
});

await new Promise((resolve, reject) => { control.once("error", reject); control.listen(0, "127.0.0.1", resolve); });
controlUrl = "http://127.0.0.1:" + control.address().port;
child = spawn(process.execPath, [path.join(projectRoot, "node_modules/next/dist/bin/next"), "dev", "--hostname", "127.0.0.1", "--port", "3000"], {
  cwd: projectRoot, env: { ...process.env, NODE_ENV: "development", TICKET_ENGINE_E2E: "0" }, stdio: "inherit", windowsHide: true,
});
child.once("error", () => { phase = "failed"; writeState(); });
child.once("exit", () => { if (!stopping) { phase = "failed"; writeState(); } });
writeState();
for (let attempt = 0; attempt < 90 && phase === "starting"; attempt++) {
  try {
    const response = await fetch(appUrl + "/eventos", { signal: AbortSignal.timeout(3000) });
    if (response.ok) { phase = "ready"; writeState(); break; }
  } catch { /* O compilador e o servidor iniciam antes da primeira resposta. */ }
  await new Promise(resolve => setTimeout(resolve, 500));
}
if (phase === "starting") { phase = "failed"; writeState(); }
