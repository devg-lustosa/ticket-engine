"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "../actions";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, null);

  return (
    <main className="min-h-dvh flex items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo / Brand */}
        <div className="mb-8 text-center">
          <span className="inline-flex items-center gap-2 text-2xl font-bold text-[var(--foreground)]">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand-500)] text-white text-lg">
              🎟
            </span>
            Ticket Engine
          </span>
          <p className="mt-2 text-sm text-[var(--muted-fg)]">
            Bem-vindo de volta! Acesse sua conta.
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border bg-[var(--card)] p-8 shadow-xl"
          style={{ borderColor: "var(--card-border)" }}
        >
          <h1 className="mb-6 text-xl font-semibold text-[var(--foreground)]">
            Entrar na conta
          </h1>

          {/* Error message */}
          {state?.error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
              {state.error}
            </div>
          )}

          <form className="space-y-4" id="login-form" action={formAction}>
            {/* Email */}
            <div className="space-y-1">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[var(--foreground)]"
              >
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="voce@email.com"
                className="
                  w-full rounded-lg border bg-[var(--muted)] px-4 py-2.5 text-sm
                  text-[var(--foreground)] placeholder:text-[var(--muted-fg)]
                  outline-none transition focus:border-[var(--brand-500)]
                  focus:ring-2 focus:ring-[var(--brand-500)]/20
                "
              />
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[var(--foreground)]"
              >
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="
                  w-full rounded-lg border bg-[var(--muted)] px-4 py-2.5 text-sm
                  text-[var(--foreground)] placeholder:text-[var(--muted-fg)]
                  outline-none transition focus:border-[var(--brand-500)]
                  focus:ring-2 focus:ring-[var(--brand-500)]/20
                "
              />
            </div>

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={isPending}
              className="
                mt-2 w-full rounded-lg bg-[var(--brand-500)] px-4 py-2.5
                text-sm font-semibold text-white shadow-md transition
                hover:bg-[var(--brand-600)] hover:shadow-lg
                active:scale-[0.98] focus-visible:ring-2
                focus-visible:ring-[var(--brand-500)]/60
                disabled:opacity-60 disabled:cursor-not-allowed
              "
            >
              {isPending ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>

        {/* Footer link */}
        <p className="mt-6 text-center text-sm text-[var(--muted-fg)]">
          Não tem conta?{" "}
          <Link
            href="/cadastro"
            className="font-medium text-[var(--brand-500)] hover:underline"
          >
            Criar conta grátis
          </Link>
        </p>
      </div>
    </main>
  );
}
