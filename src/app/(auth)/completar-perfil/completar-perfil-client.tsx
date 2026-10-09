"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Camera, User as UserIcon, Calendar, Phone, AtSign, CheckCircle2 } from "lucide-react";
import { AvatarCropper } from "@/components/avatar-cropper";

export default function CompletarPerfilClient({ user }: { user: any }) {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    nickname: "",
    phone: "",
    birthDate: "",
  });
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatarUrl || null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatPhone = (val: string) => {
    let v = val.replace(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);
    if (v.length > 2) v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
    if (v.length > 10) v = `${v.slice(0, 10)}-${v.slice(10)}`;
    return v;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        alert("A imagem não pode ter mais que 5MB");
        return;
      }
      const reader = new FileReader();
      reader.addEventListener("load", () => setSelectedImage(reader.result?.toString() || null));
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAvatar = async () => {
    // Quando o AvatarCropper termina, ele atualiza o DB e a gente dá refresh.
    // Pra otimizar, recarregamos a página pra pegar a foto nova ou apenas tiramos o modal.
    setSelectedImage(null);
    router.refresh(); 
    // Em um cenário real, poderíamos pegar a URL retornada do cropper e dar setAvatarUrl
    // Mas o refresh já vai puxar do banco via server component.
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar perfil");

      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-dvh bg-background flex flex-col items-center justify-center py-12 px-4">
      {selectedImage && (
        <AvatarCropper 
          imageSrc={selectedImage} 
          onCancel={() => setSelectedImage(null)} 
          onUploadSuccess={handleSaveAvatar} 
        />
      )}

      <div className="w-full max-w-lg bg-card border border-border rounded-3xl p-8 shadow-xl relative overflow-hidden animate-fade-in">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-brand/20 to-purple-600/20" />
        
        <div className="relative flex flex-col items-center text-center mb-8">
          <div className="relative group mb-6">
            <div className="w-28 h-28 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0 border-4 border-card shadow-lg">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <UserIcon size={40} className="text-muted-fg" />
              )}
            </div>
            <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity border-4 border-transparent">
              <Camera size={24} className="text-white mb-1" />
              <span className="text-[10px] text-white font-medium uppercase tracking-wider">Adicionar</span>
              <input type="file" accept="image/png, image/jpeg" className="hidden" onChange={handleFileChange} />
            </label>
            
            {/* Badge de concluído flutuante se tiver foto */}
            {avatarUrl && (
              <div className="absolute bottom-0 right-0 bg-green-500 rounded-full p-1 border-2 border-card">
                <CheckCircle2 size={16} className="text-white" />
              </div>
            )}
          </div>

          <h1 className="text-2xl font-bold text-foreground">Complete seu perfil</h1>
          <p className="text-sm text-muted-fg mt-2 max-w-[280px]">
            Falta muito pouco, {user?.name?.split(" ")[0]}! Só precisamos de mais alguns dados para finalizar.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-error/10 border border-error/20 px-4 py-3 text-sm text-error font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 relative">
          
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Nickname exclusivo</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <AtSign size={16} className="text-muted-fg" />
              </div>
              <input
                type="text"
                required
                value={formData.nickname}
                onChange={(e) => setFormData({ ...formData, nickname: e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, "") })}
                placeholder="seunick"
                className="w-full rounded-xl border border-border bg-muted pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-fg outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <p className="text-[11px] text-muted-fg ml-1">Apenas letras, números, pontos e underlines.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">Telefone</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Phone size={16} className="text-muted-fg" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="(11) 99999-9999"
                  maxLength={15}
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                  className="w-full rounded-xl border border-border bg-muted pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-fg outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">Nascimento</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Calendar size={16} className="text-muted-fg" />
                </div>
                <input
                  type="date"
                  required
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  className="w-full rounded-xl border border-border bg-muted pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-fg outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-brand py-3.5 text-sm font-bold text-white shadow-lg shadow-brand/25 transition hover:bg-brand-dark active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Finalizar Cadastro"}
          </button>
        </form>
      </div>
    </main>
  );
}
