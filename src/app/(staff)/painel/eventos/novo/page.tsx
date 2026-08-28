import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { NovoEventoForm } from "./_components/novo-evento-form";

export default async function NovoEventoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({ where: { authId: user.id } });
  if (!dbUser || dbUser.role !== "ORGANIZER") redirect("/painel");

  return <NovoEventoForm organizerId={dbUser.id} />;
}
