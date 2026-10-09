import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import CompletarPerfilClient from "./completar-perfil-client";

export default async function CompletarPerfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { authId: user.id },
    select: { nickname: true, phone: true, birthDate: true, avatarUrl: true, name: true }
  });

  // Se já tem nickname, assumimos que já completou o perfil principal
  if (dbUser?.nickname) {
    redirect("/");
  }

  return <CompletarPerfilClient user={{ ...dbUser, email: user.email }} />;
}
