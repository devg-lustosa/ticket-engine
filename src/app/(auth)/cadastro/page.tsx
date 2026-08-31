"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup } from "../actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { Ticket } from "lucide-react";

export default function CadastroPage() {
  const [state, formAction, isPending] = useActionState(signup, null);

  return (
    <main className="min-h-dvh bg-background flex flex-col">
      {/* Topo */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <Link href="/" className="flex items-center gap-2 font-bold text-foreground hover:opacity-80 transition-opacity">
          <div className="bg-gradient-to-br from-brand to-purple-600 p-1.5 rounded-lg shadow-sm shadow-brand/20">
            <Ticket className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold">Ticket Engine</span>
        </Link>
        <ThemeToggle />
      </header>

      {/* Conteúdo central */}
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm animate-fade-in">

          {/* Título */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Crie sua conta
            </h1>
            <p className="mt-2 text-sm text-muted-fg">
              Garanta seu ingresso em segundos
            </p>
          </div>

          {/* Card */}
          <div className="bg-card border border-card-border rounded-2xl p-6 shadow-sm">

            {/* Erro */}
            {state?.error && (
              <div className="mb-5 rounded-xl bg-error/10 border border-error/20 px-4 py-3 text-sm text-error font-medium">
                {state.error}
              </div>
            )}

            <form className="space-y-4" id="signup-form" action={formAction}>
              {/* Nome */}
              <div className="space-y-1.5">
                <label htmlFor="name" className="block text-sm font-medium text-foreground">
                  Nome completo
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  placeholder="João da Silva"
                  className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm text-foreground placeholder:text-muted-fg outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>

              {/* CPF */}
              <div className="space-y-1.5">
                <label htmlFor="cpf" className="block text-sm font-medium text-foreground">
                  CPF
                </label>
                <input
                  id="cpf"
                  name="cpf"
                  type="text"
                  autoComplete="off"
                  required
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm text-foreground placeholder:text-muted-fg outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>

              {/* E-mail */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-sm font-medium text-foreground">
                  E-mail
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="voce@email.com"
                  className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm text-foreground placeholder:text-muted-fg outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>

              {/* Senha */}
              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-foreground">
                  Senha
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  placeholder="Mínimo 8 caracteres"
                  minLength={8}
                  className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm text-foreground placeholder:text-muted-fg outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>

              {/* Submit */}
              <button
                id="signup-submit"
                type="submit"
                disabled={isPending}
                className="mt-2 w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand/20 transition hover:bg-brand-dark active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isPending ? "Criando conta..." : "Criar conta"}
              </button>
            </form>
          </div>

          {/* Rodapé */}
          <p className="mt-6 text-center text-sm text-muted-fg">
            Já tem conta?{" "}
            <Link href="/login" className="font-semibold text-brand hover:text-brand-dark transition-colors">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
