"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function getCurrentUser() {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) return null;

    const dbUser = await prisma.user.findUnique({
      where: { authId: authUser.id },
      select: { name: true, email: true, role: true },
    });

    if (!dbUser) {
      return {
        name: authUser.user_metadata?.name || authUser.email?.split("@")[0] || "Usuário",
        email: authUser.email || "",
        role: "USER"
      };
    }

    return dbUser;
  } catch (error) {
    console.error("Error fetching current user:", error);
    return null;
  }
}
