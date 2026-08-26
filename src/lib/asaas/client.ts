import axios from "axios";
import type {
  AsaasCustomer,
  AsaasCustomerInput,
  AsaasPixCharge,
  AsaasPixChargeInput,
  AsaasPixQrCode,
} from "./types";

const ASAAS_BASE_URL =
  process.env.ASAAS_ENV === "production"
    ? "https://api.asaas.com/v3"
    : "https://sandbox.asaas.com/api/v3";

const asaas = axios.create({
  baseURL: ASAAS_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15_000,
});

asaas.interceptors.request.use((config) => {
  const token = process.env.ASAAS_API_KEY;
  console.log("[asaas client] Interceptor rodando. API_KEY carregada:", !!token);
  if (token) {
    // Remove aspas simples se o dotenv tiver mantido (bug comum)
    config.headers["access_token"] = token.replace(/^'|'$/g, '');
  }
  return config;
});

// ─── Customers ────────────────────────────────────────────────────

/**
 * Cria um cliente no Asaas ou retorna existente pelo externalReference.
 */
export async function createOrFindCustomer(
  input: AsaasCustomerInput
): Promise<AsaasCustomer> {
  // Tenta encontrar por e-mail primeiro
  const search = await asaas.get<{ data: AsaasCustomer[] }>(
    `/customers?email=${encodeURIComponent(input.email)}&limit=1`
  );

  if (search.data.data.length > 0) {
    return search.data.data[0];
  }

  const { data } = await asaas.post<AsaasCustomer>("/customers", input);
  return data;
}

// ─── Pix Charges ──────────────────────────────────────────────────

/**
 * Cria uma cobrança Pix no Asaas.
 */
export async function createPixCharge(
  input: AsaasPixChargeInput
): Promise<AsaasPixCharge> {
  const { data } = await asaas.post<AsaasPixCharge>("/payments", {
    ...input,
    billingType: "PIX",
  });
  return data;
}

/**
 * Busca os dados de QR Code Pix de uma cobrança.
 */
export async function getPixQrCode(chargeId: string): Promise<AsaasPixQrCode> {
  const { data } = await asaas.get<AsaasPixQrCode>(
    `/payments/${chargeId}/pixQrCode`
  );
  return data;
}

/**
 * Busca uma cobrança pelo ID.
 */
export async function getCharge(chargeId: string): Promise<AsaasPixCharge> {
  const { data } = await asaas.get<AsaasPixCharge>(`/payments/${chargeId}`);
  return data;
}
