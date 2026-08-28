import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { DollarSign, Ticket, CheckSquare, TrendingUp, Wallet, Percent } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({ where: { authId: user.id } });
  if (!dbUser || dbUser.role !== "ORGANIZER") {
    redirect("/meus-ingressos");
  }

  // Busca estatísticas gerais (Bruto)
  // 1. Total faturado (Payments pagos)
  const payments = await prisma.payment.findMany({
    where: { status: "PAID" },
    select: { amount: true, paidAt: true },
  });

  const totalRevenue = payments.reduce(
    (acc, p) => acc + Number(p.amount),
    0
  );

  const platformFee = totalRevenue * 0.05; // 5% fee
  const netRevenue = totalRevenue - platformFee;

  // 2. Total Ingressos Vendidos (ACTIVE + USED)
  const ticketsSold = await prisma.ticket.count({
    where: { status: { in: ["ACTIVE", "USED"] } },
  });

  // 3. Total de Check-ins (USED)
  const checkins = await prisma.ticket.count({
    where: { status: "USED" },
  });

  // 4. Agrupamento de vendas por dia (para o gráfico)
  // Como é um MVP, vamos agrupar no formato dd/MM localmente
  const salesByDate: Record<string, number> = {};

  payments.forEach((p) => {
    if (!p.paidAt) return;
    const dateStr = new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    }).format(p.paidAt);

    if (!salesByDate[dateStr]) salesByDate[dateStr] = 0;
    salesByDate[dateStr] += Number(p.amount);
  });

  const chartData = Object.keys(salesByDate)
    .sort() // ordena pelas datas (dias)
    .map((date) => ({
      date,
      vendas: salesByDate[date],
    }));

  // Se não houver dados ainda, exibe um mock
  if (chartData.length === 0) {
    const today = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date());
    chartData.push({ date: today, vendas: 0 });
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-400">Visão geral do seu evento</p>
        </header>

        {/* Cards de Métricas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Ingressos Vendidos */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-400 font-medium">Ingressos Vendidos</h3>
              <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center text-accent">
                <Ticket size={20} />
              </div>
            </div>
            <p className="text-3xl font-bold">{ticketsSold}</p>
          </div>

          {/* Faturamento Bruto */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-400 font-medium">Faturamento Bruto</h3>
              <div className="w-10 h-10 bg-brand/10 rounded-full flex items-center justify-center text-brand">
                <DollarSign size={20} />
              </div>
            </div>
            <p className="text-3xl font-bold">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(totalRevenue)}
            </p>
          </div>

          {/* Taxa da Plataforma */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-400 font-medium">Taxa do Site (5%)</h3>
              <div className="w-10 h-10 bg-red-500/10 rounded-full flex items-center justify-center text-red-400">
                <Percent size={20} />
              </div>
            </div>
            <p className="text-3xl font-bold text-red-400">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(platformFee)}
            </p>
          </div>

          {/* Faturamento Líquido */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-400 font-medium">Sua Receita</h3>
              <div className="w-10 h-10 bg-success/10 rounded-full flex items-center justify-center text-success">
                <Wallet size={20} />
              </div>
            </div>
            <p className="text-3xl font-bold text-success">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(netRevenue)}
            </p>
          </div>

          {/* Check-ins Realizados */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-sm sm:col-span-2 lg:col-span-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-400 font-medium">Check-ins (Portaria)</h3>
              <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-400">
                <CheckSquare size={20} />
              </div>
            </div>
            <p className="text-3xl font-bold">
              {checkins}
              <span className="text-sm font-normal text-gray-500 ml-2">
                / {ticketsSold}
              </span>
            </p>
            <div className="mt-3 w-full bg-gray-800 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{
                  width: ticketsSold > 0 ? `${(checkins / ticketsSold) * 100}%` : "0%",
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Gráfico */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center mb-6">
            <TrendingUp size={20} className="text-gray-400 mr-2" />
            <h3 className="text-lg font-medium">Desempenho de Vendas (Diário)</h3>
          </div>
          <SalesChart data={chartData} />
        </div>
      </div>
    </main>
  );
}
