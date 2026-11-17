"use client";

import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export function BorderoButton({ eventId, eventTitle }: { eventId: string; eventTitle: string }) {
  const [loading, setLoading] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const handleDownload = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/painel/eventos/${eventId}/bordero`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status} - Erro ao buscar dados do borderô`);
      }
      const data = await res.json();

      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(22);
      doc.text("Borderô de Vendas", 14, 20);
      
      doc.setFontSize(14);
      doc.text(data.eventName, 14, 30);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Data do Evento: ${format(new Date(data.eventDate), "dd/MM/yyyy HH:mm")}`, 14, 38);
      doc.text(`Relatório gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 43);
      
      doc.setFontSize(8);
      doc.text(data.summary.legacyPricingTickets || data.summary.unreconciledCancellations ? "ATENÇÃO: existem pedidos antigos ou estornos que exigem conciliação." : "Comissão e líquido estimados. Concilie taxas e liquidações com o Asaas.", 14, 49);
      doc.setTextColor(0);

      // Resumo Financeiro
      doc.setFontSize(14);
      doc.text("Resumo Financeiro", 14, 55);
      
      autoTable(doc, {
        startY: 60,
        head: [["Descrição", "Valor"]],
        body: [
          ["Receita Bruta Total", formatCurrency(data.summary.grossRevenue)],
          ["Estornos concluídos", formatCurrency(data.summary.refundedAmount)],
          ["Receita após estornos (antes de taxas)", formatCurrency(data.summary.netSales)],
          ["Comissão estimada (10%)", `- ${formatCurrency(data.summary.platformFee)}`],
          ["Líquido estimado (não é extrato Asaas)", formatCurrency(data.summary.netRevenue)],
        ],
        theme: "grid",
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 11 },
        columnStyles: {
          1: { fontStyle: 'bold', halign: 'right' }
        }
      });

      // Lotes e Ingressos
      const currentY = (doc as any).lastAutoTable.finalY + 15;
      doc.setFontSize(14);
      doc.text("Vendas por Lote", 14, currentY);

      const tableData = data.batches.map((b: any) => [
        b.name,
        formatCurrency(b.price),
        b.paidCount.toString(),
        b.cortesiaCount.toString(),
        formatCurrency(b.revenue)
      ]);

      // Adiciona linha de totais
      tableData.push([
        "TOTAL",
        "-",
        data.summary.totalPaidTickets.toString(),
        data.summary.cortesias.toString(),
        formatCurrency(data.summary.grossRevenue)
      ]);

      autoTable(doc, {
        startY: currentY + 5,
        head: [["Lote", "Preço (R$)", "Vendidos", "Cortesias", "Receita (R$)"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [52, 73, 94] },
        willDrawCell: (data) => {
          if (data.row.index === tableData.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [240, 240, 240];
          }
        },
      });

      // Check-in e No-Show
      const yNoShow = (doc as any).lastAutoTable.finalY + 15;
      doc.setFontSize(14);
      doc.text("Métricas de Portaria", 14, yNoShow);

      autoTable(doc, {
        startY: yNoShow + 5,
        head: [["Métrica", "Quantidade"]],
        body: [
          ["Total de Ingressos Válidos (Vendidos + Cortesias)", data.summary.totalTicketsValid.toString()],
          ["Check-ins Realizados na Portaria", data.summary.totalCheckins.toString()],
          ["No-Show (Não compareceram)", `${data.summary.noShowCount} (${data.summary.noShowRate.toFixed(1)}%)`],
        ],
        theme: "plain",
        styles: { fontSize: 11, cellPadding: 3 },
      });

      doc.save(`bordero-${data.eventName.replace(/\s+/g, '-').toLowerCase()}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Erro ao gerar PDF: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="nav-control text-muted-fg"
      data-tooltip="Baixar Borderô (PDF)" aria-label="Baixar Borderô (PDF)"
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}<span className="ml-1 text-xs">Borderô</span>
    </button>
  );
}
