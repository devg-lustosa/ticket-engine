"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup } from "../actions";

export default function CadastroPage() {
  const [state, formAction, isPending] = useActionState(signup, null);

  return (
    <main className="min-h-dvh flex items-center justify-center bg-[var(--background)] px-4 py-12">
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
            Crie sua conta em segundos.
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border bg-[var(--card)] p-8 shadow-xl"
          style={{ borderColor: "var(--card-border)" }}
        >
          <h1 className="mb-6 text-xl font-semibold text-[var(--foreground)]">
            Criar conta
          </h1>

          {/* Error message */}
          {state?.error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
              {state.error}
            </div>
          )}

          <form className="space-y-4" id="signup-form" action={formAction}>
            {/* Name */}
            <div className="space-y-1">
              <label
                htmlFor="name"
                className="block text-sm font-medium text-[var(--foreground)]"
              >
                Nome completo
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                placeholder="João da Silva"
                className="
                  w-full rounded-lg border bg-[var(--muted)] px-4 py-2.5 text-sm
                  text-[var(--foreground)] placeholder:text-[var(--muted-fg)]
                  outline-none transition focus:border-[var(--brand-500)]
                  focus:ring-2 focus:ring-[var(--brand-500)]/20
                "
              />
            </div>

            {/* CPF */}
            <div className="space-y-1">
              <label
                htmlFor="cpf"
                className="block text-sm font-medium text-[var(--foreground)]"
              >
                CPF{" "}
                <span className="text-[var(--muted-fg)] font-normal">
                  (opcional — usado na portaria)
                </span>
              </label>
              <input
                id="cpf"
                name="cpf"
                type="text"
                autoComplete="off"
                placeholder="000.000.000-00"
                maxLength={14}
                className="
                  w-full rounded-lg border bg-[var(--muted)] px-4 py-2.5 text-sm
                  text-[var(--foreground)] placeholder:text-[var(--muted-fg)]
                  outline-none transition focus:border-[var(--brand-500)]
                  focus:ring-2 focus:ring-[var(--brand-500)]/20
                "
              />
            </div>

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
                autoComplete="new-password"
                required
                placeholder="Mínimo 8 caracteres"
                minLength={8}
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
              id="signup-submit"
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
              {isPending ? "Criando conta..." : "Criar conta"}
            </button>
          </form>
        </div>

        {/* Footer link */}
        <p className="mt-6 text-center text-sm text-[var(--muted-fg)]">
          Já tem conta?{" "}
          <Link
            href="/login"
            className="font-medium text-[var(--brand-500)] hover:underline"
          >
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
