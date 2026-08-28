import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Tag, Percent, DollarSign, Calendar, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CreateCouponForm } from "./_components/create-coupon-form";
import { DeleteCouponButton } from "./_components/delete-coupon-button";

export default async function EventCouponsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({ where: { authId: user.id } });
  if (!dbUser || dbUser.role !== "ORGANIZER") {
    redirect("/painel");
  }

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      coupons: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!event || event.organizerId !== dbUser.id) {
    redirect("/painel");
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand/20 flex items-center justify-center">
              <Tag size={16} className="text-brand" />
            </div>
            <div>
              <h1 className="text-base font-semibold">Cupons de Desconto</h1>
              <p className="text-xs text-gray-400 truncate max-w-[200px] sm:max-w-xs">
                {event.title}
              </p>
            </div>
          </div>
          <Link
            href="/painel"
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1"
          >
            <ArrowLeft size={16} />
            Voltar
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulário (Esquerda) */}
        <div className="lg:col-span-1">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl sticky top-28">
            <h2 className="text-lg font-semibold mb-1">Criar Novo Cupom</h2>
            <p className="text-sm text-gray-400 mb-6">
              Defina as regras para o desconto.
            </p>
            <CreateCouponForm eventId={event.id} />
          </div>
        </div>

        {/* Lista (Direita) */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Cupons Cadastrados</h2>
          
          {event.coupons.length === 0 ? (
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-12 flex flex-col items-center justify-center text-center">
              <Tag size={48} className="text-gray-700 mb-4" />
              <h3 className="text-lg font-medium text-gray-300">Nenhum cupom criado</h3>
              <p className="text-gray-500 text-sm mt-1 max-w-sm">
                Crie seu primeiro cupom para alavancar as vendas deste evento.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {event.coupons.map((coupon) => {
                const isExpired = coupon.validUntil && new Date(coupon.validUntil) < new Date();
                const isDepleted = coupon.maxUses && coupon.usedCount >= coupon.maxUses;
                const isInactive = !coupon.active || isExpired || isDepleted;

                return (
                  <div 
                    key={coupon.id} 
                    className={`bg-gray-900 border rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${isInactive ? 'border-gray-800 opacity-60' : 'border-gray-700 hover:border-gray-600'}`}
                  >
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-mono text-lg font-bold text-white tracking-wider bg-gray-950 px-3 py-1 rounded-md border border-gray-800">
                          {coupon.code}
                        </span>
                        {!coupon.active ? (
                          <span className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full border border-red-500/20">Inativo</span>
                        ) : isExpired ? (
                          <span className="text-xs bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-500/20">Expirado</span>
                        ) : isDepleted ? (
                          <span className="text-xs bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-full border border-orange-500/20">Esgotado</span>
                        ) : (
                          <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">Ativo</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
                        <span className="flex items-center gap-1.5">
                          {coupon.discountType === "PERCENTAGE" ? (
                            <><Percent size={14} className="text-brand" /> {Number(coupon.discountValue)}% OFF</>
                          ) : (
                            <><DollarSign size={14} className="text-brand" /> R$ {Number(coupon.discountValue).toFixed(2)} OFF</>
                          )}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <RefreshCw size={14} />
                          Usos: {coupon.usedCount} {coupon.maxUses ? `/ ${coupon.maxUses}` : '(Ilimitado)'}
                        </span>
                        {coupon.validUntil && (
                          <span className="flex items-center gap-1.5">
                            <Calendar size={14} />
                            Até: {format(new Date(coupon.validUntil), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <DeleteCouponButton couponId={coupon.id} eventId={event.id} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
