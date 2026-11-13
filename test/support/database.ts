import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { execFileSync } from "node:child_process";
import type { TestProject } from "vitest/node";

export default async function setup(project: TestProject) {
  const container = await new PostgreSqlContainer("postgres:17.11-alpine3.24")
    .withDatabase("ticket_engine_test").start();
  const databaseUrl = container.getConnectionUri();
  try {
    execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], {
      env: { ...process.env, DATABASE_URL: databaseUrl, DIRECT_URL: databaseUrl }, stdio: "pipe",
    });
    project.provide("databaseUrl", databaseUrl);
    return async () => { await container.stop(); };
  } catch (error) {
    await container.stop();
    throw error;
  }
}
