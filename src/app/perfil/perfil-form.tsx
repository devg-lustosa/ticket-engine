"use client";

import { useState } from "react";
import Link from "next/link";
import { Ticket, Lock, AlertCircle, CheckCircle2, EyeOff } from "lucide-react";
import { siteConfig } from "@/config/site";
import { ThemeToggle } from "@/components/theme-toggle";
import { updatePrivacySettings } from "@/services/user.service";

export default function PerfilForm({ initialHideFromAttendees }: { initialHideFromAttendees: boolean }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  
  const [hideProfile, setHideProfile] = useState(initialHideFromAttendees);
  const [privacyStatus, setPrivacyStatus] = useState<"idle" | "saving" | "success" | "error">("idle");

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

  const handleTogglePrivacy = async (checked: boolean) => {
    setHideProfile(checked);
    setPrivacyStatus("saving");
    try {
      await updatePrivacySettings(checked);
      setPrivacyStatus("success");
      setTimeout(() => setPrivacyStatus("idle"), 3000);
    } catch (err) {
      console.error(err);
      setPrivacyStatus("error");
      setHideProfile(!checked); // revert
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
          <Link href="/meus-ingressos" className="text-sm font-medium hover:underline">
            Voltar
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-4 py-12 space-y-8">
        <h1 className="text-3xl font-extrabold text-foreground mb-4">Configurações da Conta</h1>

        {/* Privacidade */}
        <div className="bg-card border border-border rounded-2xl shadow-sm p-6 md:p-8">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2 mb-2">
            <EyeOff size={20} className="text-muted-fg" />
            Privacidade
          </h2>
          <p className="text-sm text-muted-fg mb-6">
            Controle como seu perfil aparece para outros participantes (LGPD).
          </p>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-foreground">Ocultar meu perfil</p>
              <p className="text-sm text-muted-fg mt-1">
                Seu perfil não aparecerá na lista de participantes "Quem vai" dos eventos.
              </p>
            </div>
            
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={hideProfile}
                onChange={(e) => handleTogglePrivacy(e.target.checked)}
                disabled={privacyStatus === "saving"}
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand"></div>
            </label>
          </div>
          {privacyStatus === "saving" && <p className="text-xs text-brand mt-3">Salvando...</p>}
          {privacyStatus === "success" && <p className="text-xs text-success mt-3">Preferência salva com sucesso.</p>}
          {privacyStatus === "error" && <p className="text-xs text-error mt-3">Erro ao salvar. Tente novamente.</p>}
        </div>

        {/* Trocar Senha */}
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

