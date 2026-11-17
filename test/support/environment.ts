import { inject } from "vitest";

declare module "vitest" { interface ProvidedContext { databaseUrl: string } }

process.env.DATABASE_URL = inject("databaseUrl") as string;
process.env.DIRECT_URL = process.env.DATABASE_URL;
process.env.TICKET_SECRET_HASH = "test-only-ticket-secret-not-used-outside-disposable-tests";
process.env.ASAAS_WEBHOOK_SECRET = "test-only-webhook-secret";
