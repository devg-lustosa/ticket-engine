"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ChevronDown } from "lucide-react";

interface ChangeRoleSelectProps {
  email: string;
  currentRole: string;
}

export function ChangeRoleSelect({ email, currentRole }: ChangeRoleSelectProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newRole = e.target.value;
    if (newRole === currentRole) return;

    setLoading(true);
    try {
      const res = await fetch("/api/painel/equipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: newRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Erro ao alterar cargo");
        // Revert select back to old value visually
        e.target.value = currentRole;
      } else {
        router.refresh();
      }
    } catch (error) {
      alert("Erro ao alterar cargo");
      e.target.value = currentRole;
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <select
        defaultValue={currentRole}
        onChange={handleChange}
        disabled={loading}
        className={`appearance-none text-xs px-2.5 py-1 pr-6 rounded-md font-medium border outline-none cursor-pointer transition-colors disabled:opacity-50
          ${currentRole === 'ORGANIZER' 
            ? 'bg-brand/10 text-brand border-brand/20 hover:bg-brand/20' 
            : 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20'
          }`}
      >
        <option value="ORGANIZER">Organizador</option>
        <option value="STAFF">Segurança</option>
      </select>
      {loading && (
        <div className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-fg pointer-events-none">
          <Loader2 size={12} className="animate-spin" />
        </div>
      )}
      {!loading && (
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-fg pointer-events-none opacity-60">
          <ChevronDown size={14} />
        </div>
      )}
    </div>
  );
}
