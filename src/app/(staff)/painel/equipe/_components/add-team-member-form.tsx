"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";

export function AddTeamMemberForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const form = e.currentTarget;
    const formData = new FormData(form);
    const data = {
      email: formData.get("email"),
      role: formData.get("role"),
    };

    try {
      const res = await fetch(`/api/painel/equipe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao adicionar membro");

      form.reset();
      setSuccess("Membro adicionado com sucesso!");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao adicionar membro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div role="alert" className="p-3 bg-red-500/10 border border-red-500/20 text-error text-sm rounded-lg">
          {error}
        </div>
      )}
      
      {success && (
        <div role="status" className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-success text-sm rounded-lg">
          {success}
        </div>
      )}

      <div>
        <label htmlFor="team-email" className="block text-sm font-medium text-foreground mb-1">
          E-mail do usuário
        </label>
        <input
          id="team-email"
          type="email"
          name="email"
          required
          placeholder="email@exemplo.com"
          className="w-full bg-muted border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-fg focus:border-brand focus:ring-1 focus:ring-brand outline-none"
        />
      </div>

      <div>
        <label htmlFor="team-role" className="block text-sm font-medium text-foreground mb-1">
          Cargo
        </label>
        <select
          id="team-role"
          name="role"
          className="w-full bg-muted border border-border rounded-lg px-4 py-2.5 text-foreground focus:border-brand focus:ring-1 focus:ring-brand outline-none"
        >
          <option value="STAFF">Segurança (Acesso ao Scanner)</option>
          <option value="ORGANIZER">Organizador (Acesso Total)</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-brand text-white font-medium rounded-lg px-4 py-2.5 hover:bg-brand/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-2" data-tooltip="Adicionar à Equipe"
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
        Adicionar à Equipe
      </button>
    </form>
  );
}
