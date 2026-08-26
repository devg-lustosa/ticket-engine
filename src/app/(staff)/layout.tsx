import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({ where: { authId: user.id } });
  
  if (!dbUser || (dbUser.role !== "STAFF" && dbUser.role !== "ORGANIZER")) {
    redirect("/meus-ingressos");
  }

  return <>{children}</>;
}
