"use client";

import { useState } from "react";
import { UserNav } from "@/components/user-nav";
import Link from "next/link";
import { Ticket, Lock, AlertCircle, CheckCircle2 } from "lucide-react";
import { siteConfig } from "@/config/site";
import { ThemeToggle } from "@/components/theme-toggle";

export default function PerfilPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setStatus("error");
      setErrorMessage("As senhas não coincidem.");
      return;
    }
    
    if (password.length < 6) {
      setStatus("error");
      setErrorMessage("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setStatus("loading");
    try {
      const res = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao atualizar a senha");
      }
      
      setStatus("success");
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err.message);
    }
  };

  return (
    <main className="min-h-dvh bg-[var(--background)]">
      <header className="bg-[var(--brand-600)] text-white relative">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
        <div className="relative z-20 mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2 font-bold hover:opacity-90 transition-opacity">
            <Ticket className="h-6 w-6" />
            <span className="hidden sm:inline-block">{siteConfig.name}</span>
          </Link>
          <ThemeToggle />
          {/* Ocultamos o UserNav aqui ou carregamos dummy já que a pessoa JÁ está logada */}
          <Link href="/meus-ingressos" className="text-sm font-medium hover:underline">
            Voltar
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-4 py-12">
        <h1 className="text-2xl font-bold mb-8">Configurações da Conta</h1>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-6">
            <Lock size={20} className="text-gray-500" />
            Trocar Senha
          </h2>

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Nova Senha</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                placeholder="Repita a nova senha"
              />
            </div>

            {status === "error" && (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {status === "success" && (
              <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm flex items-start gap-2">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                <span>Sua senha foi atualizada com sucesso!</span>
              </div>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full bg-black text-white rounded-lg py-2.5 font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {status === "loading" ? "Atualizando..." : "Atualizar Senha"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
