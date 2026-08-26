/**
 * Tipos TypeScript para a API do Asaas
 */

export interface AsaasCustomer {
  id: string;
  name: string;
  email: string;
  cpfCnpj?: string;
  phone?: string;
}

export interface AsaasCustomerInput {
  name: string;
  email: string;
  cpfCnpj?: string;
  phone?: string;
  externalReference?: string;
}

export interface AsaasPixCharge {
  id: string;
  status: AsaasPaymentStatus;
  customer: string;
  value: number;
  netValue: number;
  dueDate: string;
  externalReference?: string;
  pixTransaction?: {
    id: string;
    endToEndIdentifier: string;
  };
}

export interface AsaasPixChargeInput {
  customer: string;
  billingType: "PIX";
  value: number;
  dueDate: string;
  description?: string;
  externalReference?: string;
}

export interface AsaasPixQrCode {
  encodedImage: string;   // base64 da imagem do QR Code
  payload: string;        // código Pix Copia e Cola
  expirationDate: string;
}

export type AsaasPaymentStatus =
  | "PENDING"
  | "RECEIVED"
  | "CONFIRMED"
  | "OVERDUE"
  | "REFUNDED"
  | "RECEIVED_IN_CASH"
  | "REFUND_REQUESTED"
  | "CHARGEBACK_REQUESTED"
  | "CHARGEBACK_DISPUTE"
  | "AWAITING_CHARGEBACK_REVERSAL"
  | "DUNNING_REQUESTED"
  | "DUNNING_RECEIVED"
  | "AWAITING_RISK_ANALYSIS";

export type AsaasWebhookEvent =
  | "PAYMENT_CREATED"
  | "PAYMENT_UPDATED"
  | "PAYMENT_CONFIRMED"
  | "PAYMENT_RECEIVED"
  | "PAYMENT_OVERDUE"
  | "PAYMENT_DELETED"
  | "PAYMENT_RESTORED"
  | "PAYMENT_REFUNDED"
  | "PAYMENT_RECEIVED_IN_CASH_UNDONE"
  | "PAYMENT_CHARGEBACK_REQUESTED"
  | "PAYMENT_CHARGEBACK_DISPUTE"
  | "PAYMENT_AWAITING_CHARGEBACK_REVERSAL"
  | "PAYMENT_DUNNING_RECEIVED"
  | "PAYMENT_DUNNING_REQUESTED"
  | "PAYMENT_BANK_SLIP_VIEWED"
  | "PAYMENT_CHECKOUT_VIEWED";

export interface AsaasWebhookPayload {
  event: AsaasWebhookEvent;
  payment: AsaasPixCharge & {
    dateCreated: string;
    originalValue: number;
    interestValue: number;
    originalDueDate: string;
    paymentDate?: string;
    invoiceUrl: string;
    bankSlipUrl?: string;
    transactionReceiptUrl?: string;
    nossoNumero?: string;
    invoiceNumber: string;
    deleted: boolean;
    anticipated: boolean;
    anticipable: boolean;
    lastInvoiceViewedDate?: string;
    lastBankSlipViewedDate?: string;
    billingType: string;
    pixTransaction?: {
      id: string;
      endToEndIdentifier: string;
    };
  };
}
