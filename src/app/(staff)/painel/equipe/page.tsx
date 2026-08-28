import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Users, Shield, Plus, MoreVertical } from "lucide-react";
import { AddTeamMemberForm } from "./_components/add-team-member-form";
import { RemoveTeamMemberButton } from "./_components/remove-team-member-button";

export default async function TeamManagementPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({ where: { authId: user.id } });
  if (!dbUser || dbUser.role !== "ORGANIZER") {
    redirect("/painel");
  }

  // Find all STAFF and ORGANIZERs
  const teamMembers = await prisma.user.findMany({
    where: {
      role: { in: ["STAFF", "ORGANIZER"] }
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand/20 flex items-center justify-center">
              <LayoutDashboard size={16} className="text-brand" />
            </div>
            <div>
              <h1 className="text-base font-semibold">Dashboard de Eventos</h1>
              <p className="text-xs text-gray-400">Organizador</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/" className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors">
              ← Voltar
            </Link>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Navegação Secundária */}
        <div className="flex items-center gap-6 border-b border-gray-800 mb-8 pb-4">
          <Link href="/painel" className="text-gray-400 hover:text-gray-200 font-medium pb-4 -mb-[17px] transition-colors">
            Seus Eventos
          </Link>
          <Link href="/painel/equipe" className="text-brand font-medium border-b-2 border-brand pb-4 -mb-[17px]">
            Gestão de Equipe
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Formulário (Esquerda) */}
          <div className="lg:col-span-1">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl sticky top-28">
              <h2 className="text-lg font-semibold mb-1">Convidar Membro</h2>
              <p className="text-sm text-gray-400 mb-6">
                O usuário já deve ter criado uma conta na plataforma.
              </p>
              <AddTeamMemberForm />
            </div>
          </div>

          {/* Lista (Direita) */}
          <div className="lg:col-span-2">
            <h2 className="text-lg font-semibold mb-4">Membros da Equipe</h2>
            
            <div className="space-y-4">
              {teamMembers.map((member) => (
                <div 
                  key={member.id} 
                  className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors hover:border-gray-700"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center shrink-0">
                      {member.role === "ORGANIZER" ? (
                        <Shield size={18} className="text-brand" />
                      ) : (
                        <Users size={18} className="text-blue-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-white">{member.name}</h3>
                        {member.id === dbUser.id && (
                          <span className="text-[10px] bg-brand/20 text-brand px-2 py-0.5 rounded-full border border-brand/30 uppercase tracking-wider font-bold">Você</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">{member.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2.5 py-1 rounded-md font-medium border ${member.role === 'ORGANIZER' ? 'bg-brand/10 text-brand border-brand/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                      {member.role === "ORGANIZER" ? "Organizador" : "Segurança (Portaria)"}
                    </span>
                    
                    {member.id !== dbUser.id && (
                      <RemoveTeamMemberButton userId={member.id} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
        </div>
      </div>
    </main>
  );
}
