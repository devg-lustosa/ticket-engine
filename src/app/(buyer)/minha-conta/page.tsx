import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, User as UserIcon } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { MinhaContaClient } from "./_components/minha-conta-client";

export default async function MinhaContaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({ where: { authId: user.id } });
  if (!dbUser) redirect("/login");

  return (
    <main className="min-h-dvh bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-muted-fg hover:text-foreground transition-colors"
          >
            <ArrowLeft size={15} />
            Voltar à loja
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Conteúdo */}
      <div className="max-w-2xl mx-auto w-full px-4 py-8 flex-1">
        {/* Título */}
        <div className="mb-6 animate-fade-in">
          <div className="flex items-center gap-2 mb-1">
            <UserIcon size={18} className="text-brand" />
            <h1 className="text-xl font-bold text-foreground">Minha Conta</h1>
          </div>
          <p className="text-sm text-muted-fg">
            Gerencie suas informações pessoais e configurações da plataforma.
          </p>
        </div>

        {/* Interactive Client Component */}
        <MinhaContaClient user={dbUser} />
      </div>
    </main>
  );
}
