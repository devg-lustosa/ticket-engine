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
        <h1 className="text-3xl font-extrabold text-foreground mb-8">Configurações da Conta</h1>

        <div className="bg-card border border-border rounded-2xl shadow-sm p-6 md:p-8">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2 mb-6">
            <Lock size={20} className="text-muted-fg" />
            Trocar Senha
          </h2>

          <form onSubmit={handleUpdatePassword} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Nova Senha</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-background border border-border text-foreground placeholder:text-muted-fg/70 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Confirmar Nova Senha</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-background border border-border text-foreground placeholder:text-muted-fg/70 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
                placeholder="Repita a nova senha"
              />
            </div>

            {status === "error" && (
              <div className="p-4 bg-error/10 border border-error/20 text-error rounded-xl text-sm flex items-start gap-3">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <span className="font-medium">{errorMessage}</span>
              </div>
            )}

            {status === "success" && (
              <div className="p-4 bg-success/10 border border-success/20 text-success rounded-xl text-sm flex items-start gap-3">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                <span className="font-medium">Sua senha foi atualizada com sucesso!</span>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full flex items-center justify-center gap-2 bg-brand text-white rounded-xl py-3 font-semibold hover:bg-brand/90 hover:shadow-md transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
              >
                {status === "loading" ? "Atualizando..." : "Atualizar Senha"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
