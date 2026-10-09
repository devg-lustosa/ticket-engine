"use client";

import { useState } from "react";
import { Loader2, AtSign } from "lucide-react";
import { useRouter } from "next/navigation";

export function NicknameModal({ hasNickname }: { hasNickname: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(!hasNickname);
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!nickname) {
      setError("Digite um nickname válido.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/user/nickname", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <div className="bg-card w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-fade-in border border-border">
        <div className="w-12 h-12 bg-brand/10 rounded-2xl flex items-center justify-center mb-5">
          <AtSign className="text-brand w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Escolha seu Nickname</h2>
        <p className="text-sm text-muted-fg mb-6">
          Para interagir com outros usuários e concluir seu perfil, crie um apelido único.
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="relative">
              <input 
                type="text" 
                value={nickname}
                onChange={e => setNickname(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase())}
                placeholder="seunickname"
                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-brand focus:border-brand transition-all outline-none text-foreground"
                maxLength={20}
              />
            </div>
            {error && <p className="text-xs text-error mt-2 ml-1 animate-fade-in">{error}</p>}
          </div>

          <button 
            type="submit"
            disabled={loading || nickname.length < 3}
            className="w-full py-3 bg-brand text-white font-semibold rounded-xl hover:bg-brand/90 transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirmar Nickname"}
          </button>
        </form>
      </div>
    </div>
  );
}
