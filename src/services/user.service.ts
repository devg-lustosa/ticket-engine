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
      select: { name: true, email: true, role: true, nickname: true, cpf: true, birthDate: true, avatarUrl: true, hideFromAttendees: true },
    });

    if (!dbUser) {
      return {
        name: authUser.user_metadata?.name || authUser.email?.split("@")[0] || "Usuário",
        email: authUser.email || "",
        role: "USER",
        hideFromAttendees: false
      };
    }

    return dbUser;
  } catch (error) {
    console.error("Error fetching current user:", error);
    return null;
  }
}

export async function updatePrivacySettings(hideFromAttendees: boolean) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    if (!authUser) {
      throw new Error("Unauthorized");
    }

    await prisma.user.update({
      where: { authId: authUser.id },
      data: { hideFromAttendees },
    });
    
    return { success: true };
  } catch (error) {
    console.error("Error updating privacy settings:", error);
    throw error;
  }
}
