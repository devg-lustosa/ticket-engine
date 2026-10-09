"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "../actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { Ticket } from "lucide-react";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, null);

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
              Bem-vindo de volta
            </h1>
            <p className="mt-2 text-sm text-muted-fg">
              Entre na sua conta para continuar
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

            {/* Login Social */}
            <form action="/api/auth/google" method="POST" className="mb-6">
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors active:scale-[0.98]"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continuar com Google
              </button>
            </form>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-fg font-medium">Ou entre com e-mail</span>
              </div>
            </div>

            <form className="space-y-4" id="login-form" action={formAction}>
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
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-medium text-foreground">
                    Senha
                  </label>
                  <Link href="/recuperar-senha" className="text-xs font-semibold text-brand hover:text-brand-dark transition-colors">
                    Esqueci a senha
                  </Link>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm text-foreground placeholder:text-muted-fg outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>

              {/* Submit */}
              <button
                id="login-submit"
                type="submit"
                disabled={isPending}
                className="mt-2 w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand/20 transition hover:bg-brand-dark active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isPending ? "Entrando..." : "Entrar na plataforma"}
              </button>
            </form>
          </div>

          {/* Rodapé */}
          <p className="mt-6 text-center text-sm text-muted-fg">
            Ainda não tem conta?{" "}
            <Link href="/cadastro" className="font-semibold text-brand hover:text-brand-dark transition-colors">
              Criar conta grátis
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
