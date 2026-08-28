"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "../actions";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, null);

  return (
    <main className="relative min-h-dvh flex items-center justify-center bg-[#050505] px-4 overflow-hidden">
      {/* Background glowing orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-brand/20 rounded-full blur-[120px] mix-blend-screen opacity-50" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[100px] mix-blend-screen opacity-50" />

      <div className="relative w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Logo / Brand */}
        <div className="mb-10 text-center">
          <span className="inline-flex items-center gap-3 text-3xl font-bold text-white tracking-tight">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-purple-600 text-white text-2xl shadow-lg shadow-brand/20">
              🎟
            </span>
            Ticket Engine
          </span>
          <p className="mt-4 text-base text-gray-400">
            Acesse sua conta para curtir as melhores festas.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl bg-gray-900/40 backdrop-blur-xl border border-gray-800/60 p-8 shadow-2xl">
          <h1 className="mb-8 text-2xl font-semibold text-white tracking-tight">
            Login
          </h1>

          {/* Error message */}
          {state?.error && (
            <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3.5 text-sm text-red-400 font-medium">
              {state.error}
            </div>
          )}

          <form className="space-y-5" id="login-form" action={formAction}>
            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-300 ml-1"
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
                  w-full rounded-xl border border-gray-800 bg-gray-950/50 px-4 py-3 text-sm
                  text-white placeholder:text-gray-600
                  outline-none transition-all focus:border-brand
                  focus:ring-2 focus:ring-brand/20 focus:bg-gray-950
                "
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-300 ml-1"
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
                  w-full rounded-xl border border-gray-800 bg-gray-950/50 px-4 py-3 text-sm
                  text-white placeholder:text-gray-600
                  outline-none transition-all focus:border-brand
                  focus:ring-2 focus:ring-brand/20 focus:bg-gray-950
                "
              />
            </div>

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={isPending}
              className="
                mt-4 w-full rounded-xl bg-gradient-to-r from-brand to-brand/90 px-4 py-3.5
                text-sm font-semibold text-white shadow-lg shadow-brand/20 transition-all
                hover:shadow-brand/40 hover:scale-[1.02]
                active:scale-[0.98] focus-visible:ring-2
                focus-visible:ring-brand/60
                disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100
              "
            >
              {isPending ? "Entrando..." : "Entrar na plataforma"}
            </button>
          </form>
        </div>

        {/* Footer link */}
        <p className="mt-8 text-center text-sm text-gray-400">
          Ainda não tem conta?{" "}
          <Link
            href="/cadastro"
            className="font-semibold text-brand hover:text-brand/80 transition-colors"
          >
            Criar conta grátis
          </Link>
        </p>
      </div>
    </main>
  );
}
