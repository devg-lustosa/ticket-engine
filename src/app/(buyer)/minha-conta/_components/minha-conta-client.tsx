"use client";

import { useState } from "react";
import { ShieldCheck, Loader2, User as UserIcon, Camera } from "lucide-react";
import { useRouter } from "next/navigation";
import { AvatarCropper } from "@/components/avatar-cropper";

export function MinhaContaClient({ user }: { user: any }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"dados" | "config">("dados");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: user.name || "",
    cpf: user.cpf || "",
    phone: user.phone || "",
    birthDate: user.birthDate ? new Date(user.birthDate).toISOString().split('T')[0] : "",
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error();
      setIsEditing(false);
      router.refresh();
    } catch (err) {
      alert("Erro ao salvar os dados.");
    } finally {
      setLoading(false);
    }
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

  return (
    <>
      {selectedImage && (
        <AvatarCropper 
          imageSrc={selectedImage} 
          onCancel={() => setSelectedImage(null)} 
          onUploadSuccess={() => setSelectedImage(null)} 
        />
      )}
      <div className="flex items-center gap-6 border-b border-border mb-8 pb-4 animate-fade-in">
        <button 
          onClick={() => setActiveTab("dados")}
          className={`${activeTab === "dados" ? "text-brand border-b-2 border-brand" : "text-muted-fg hover:text-foreground"} font-medium pb-4 -mb-[17px] transition-colors`}
        >
          Meus Dados Cadastrais
        </button>
        <button 
          onClick={() => setActiveTab("config")}
          className={`${activeTab === "config" ? "text-brand border-b-2 border-brand" : "text-muted-fg hover:text-foreground"} font-medium pb-4 -mb-[17px] transition-colors`}
        >
          Configuração
        </button>
      </div>

      <div className="space-y-6 animate-fade-in">
        {activeTab === "dados" && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8 border-b border-border pb-6">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0 border-4 border-background shadow-md">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon size={32} className="text-muted-fg" />
                  )}
                </div>
                <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                  <Camera size={20} className="text-white mb-1" />
                  <span className="text-[10px] text-white font-medium uppercase tracking-wider">Alterar</span>
                  <input type="file" accept="image/png, image/jpeg" className="hidden" onChange={handleFileChange} />
                </label>
              </div>
              
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="text-brand w-5 h-5" />
                  <h2 className="text-xl font-semibold text-foreground">Informações Pessoais</h2>
                </div>
                <p className="text-sm text-muted-fg mt-1">Sua foto é pública e será exibida em eventos que você confirmar presença.</p>
              </div>
            </div>
            
            {isEditing ? (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-fg uppercase tracking-wider font-semibold block mb-1">Nome Completo</label>
                    <input 
                      type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-brand"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-fg uppercase tracking-wider font-semibold block mb-1">E-mail</label>
                    <input type="email" disabled value={user.email} className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm text-muted-fg cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-fg uppercase tracking-wider font-semibold block mb-1">Nickname</label>
                    <input type="text" disabled value={user.nickname || ""} className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm text-muted-fg cursor-not-allowed" />
                    <p className="text-[10px] text-muted-fg mt-1">Nickname não pode ser alterado por aqui.</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-fg uppercase tracking-wider font-semibold block mb-1">CPF</label>
                    <input 
                      type="text" value={formData.cpf} onChange={e => setFormData({...formData, cpf: e.target.value})}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-brand"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-fg uppercase tracking-wider font-semibold block mb-1">Telefone</label>
                    <input 
                      type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-brand"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-fg uppercase tracking-wider font-semibold block mb-1">Data de Nascimento</label>
                    <input 
                      type="date" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-brand"
                    />
                  </div>
                </div>
                <div className="mt-6 flex gap-3 justify-end pt-4 border-t border-border">
                  <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 bg-muted text-foreground font-medium rounded-lg hover:bg-muted/80 text-sm">
                    Cancelar
                  </button>
                  <button type="submit" disabled={loading} className="px-4 py-2 bg-brand text-white font-medium rounded-lg hover:bg-brand/90 text-sm flex items-center gap-2">
                    {loading && <Loader2 className="w-4 h-4 animate-spin"/>} Salvar Dados
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs text-muted-fg uppercase tracking-wider font-semibold mb-1">Nome Completo</p>
                    <p className="text-foreground font-medium">{user.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-fg uppercase tracking-wider font-semibold mb-1">E-mail</p>
                    <p className="text-foreground font-medium">{user.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-fg uppercase tracking-wider font-semibold mb-1">Nickname</p>
                    <p className="text-foreground font-medium">
                      {user.nickname ? user.nickname : <span className="text-muted-fg italic">Não definido</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-fg uppercase tracking-wider font-semibold mb-1">CPF</p>
                    <p className="text-foreground font-medium">
                      {user.cpf || <span className="text-muted-fg italic">Não definido</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-fg uppercase tracking-wider font-semibold mb-1">Telefone</p>
                    <p className="text-foreground font-medium">
                      {user.phone || <span className="text-muted-fg italic">Não definido</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-fg uppercase tracking-wider font-semibold mb-1">Data de Nascimento</p>
                    <p className="text-foreground font-medium">
                      {user.birthDate ? new Date(user.birthDate).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : <span className="text-muted-fg italic">Não definido</span>}
                    </p>
                  </div>
                </div>
                <div className="mt-8 pt-6 border-t border-border flex justify-end">
                  <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-brand text-white font-medium rounded-lg hover:bg-brand/90 transition-colors text-sm">
                    Editar Dados
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === "config" && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm text-center py-16">
            <h3 className="text-lg font-medium text-foreground mb-2">Configurações de Conta</h3>
            <p className="text-muted-fg text-sm">Aqui você poderá alterar sua senha, excluir sua conta ou mudar preferências de notificação (em breve).</p>
          </div>
        )}
      </div>
    </>
  );
}
