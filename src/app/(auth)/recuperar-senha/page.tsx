"use client";
import Link from "next/link";
import { useActionState } from "react";
import { resetPassword } from "../actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { Ticket, ArrowLeft } from "lucide-react";

export default function RecuperarSenhaPage() {
  const [state, formAction, isPending] = useActionState(resetPassword, null);

  return (
    <main className="min-h-dvh bg-background flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <Link href="/" className="flex items-center gap-2 font-bold text-foreground hover:opacity-80 transition-opacity">
          <div className="bg-gradient-to-br from-brand to-purple-600 p-1.5 rounded-lg shadow-sm shadow-brand/20">
            <Ticket className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold">Ticket Engine</span>
        </Link>
        <ThemeToggle />
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="mb-6">
            <Link href="/login" className="inline-flex items-center gap-2 text-sm text-muted-fg hover:text-foreground transition-colors mb-4">
              <ArrowLeft size={16} /> Voltar
            </Link>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Recuperar senha</h1>
            <p className="mt-2 text-sm text-muted-fg">Digite seu e-mail para receber o link seguro.</p>
          </div>

          <div className="bg-card border border-card-border rounded-2xl p-6 shadow-sm">
            {state?.error && (
              <div className="mb-5 rounded-xl bg-error/10 border border-error/20 px-4 py-3 text-sm text-error font-medium">
                {state.error}
              </div>
            )}
            {state?.success ? (
              <div className="rounded-xl bg-[var(--success)]/10 border border-[var(--success)]/20 px-4 py-3 text-sm text-[var(--success)] font-medium">
                {state.success}
              </div>
            ) : (
              <form className="space-y-4" action={formAction}>
                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-sm font-medium text-foreground">E-mail</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="voce@email.com"
                    className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm text-foreground placeholder:text-muted-fg outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isPending}
                  className="mt-2 w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand/20 transition hover:bg-brand-dark active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isPending ? "Enviando..." : "Enviar link de recuperação"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
