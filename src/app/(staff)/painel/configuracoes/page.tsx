import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Settings } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { ConfigForm } from "./_components/config-form";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({ where: { authId: user.id } });
  if (!dbUser || dbUser.role !== "ORGANIZER") {
    redirect("/painel");
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand/20 flex items-center justify-center shrink-0">
              <LayoutDashboard size={16} className="text-brand" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-foreground leading-tight sm:leading-normal">
                Configurações da Conta
              </h1>
              <p className="text-xs text-muted-fg">Organizador</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/painel"
              className="px-2 py-1.5 text-sm text-muted-fg hover:text-foreground transition-colors"
            >
              ← Voltar ao Painel
            </Link>
          </div>
        </div>
      </header>

      {/* Navegação Secundária */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-wrap items-center gap-6 border-b border-border mb-8 pb-4">
          <Link href="/painel" className="text-muted-fg hover:text-foreground font-medium pb-4 -mb-[17px] transition-colors">
            Seus Eventos
          </Link>
          <Link href="/painel/equipe" className="text-muted-fg hover:text-foreground font-medium pb-4 -mb-[17px] transition-colors">
            Gestão de Equipe
          </Link>
          <Link href="/painel/configuracoes" className="text-brand font-medium border-b-2 border-brand pb-4 -mb-[17px]">
            Configurações
          </Link>
        </div>

        <div className="max-w-2xl">
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center">
                <Settings className="text-brand" size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Pagamentos e Repasses</h2>
                <p className="text-sm text-muted-fg">Configure sua conta Asaas para receber automaticamente o valor das vendas.</p>
              </div>
            </div>

            <ConfigForm initialWalletId={dbUser.asaasWalletId || ""} />
          </div>
        </div>
      </div>
    </main>
  );
}
