import { PrismaClient } from '@prisma/client'

const p = new PrismaClient()

async function simulateWebhook() {
  const pendingPayments = await p.payment.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "desc" },
    take: 1
  })
  
  if (pendingPayments.length === 0) {
    console.log("Nenhum pagamento PENDING encontrado.")
    return
  }
  
  const payment = pendingPayments[0]
  console.log(`[Webhook Simulator] Achou pagamento pendente: ${payment.gatewayId}`)
  
  const res = await fetch("http://localhost:3000/api/webhooks/asaas", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "asaas-access-token": process.env.ASAAS_WEBHOOK_SECRET || "whsec_lDCVDWnQlDEMSgg5vcCB5m_Ya3mQMAh4Na-QZzv8xsw"
    },
    body: JSON.stringify({
      event: "PAYMENT_CONFIRMED",
      payment: {
        id: payment.gatewayId,
        paymentDate: new Date().toISOString().split('T')[0]
      }
    })
  })
  
  console.log(`[Webhook Simulator] Webhook response status: ${res.status}`)
  console.log(await res.text())
}

simulateWebhook()
