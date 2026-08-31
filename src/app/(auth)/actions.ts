"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { isValidCPF } from "@/lib/cpf";

export async function login(_prevState: unknown, formData: FormData) {
  const supabase = await createClient();

  const email    = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Retorna o erro para ser exibido na UI via useActionState
    return { error: error.message };
  }

  // Sincronização preguiçosa (Lazy sync) para contas que foram criadas
  // antes da sincronização no signup ser implementada
  if (data.user) {
    try {
      const dbUser = await prisma.user.findUnique({ where: { authId: data.user.id } });
      if (!dbUser) {
        await prisma.user.create({
          data: {
            authId: data.user.id,
            email: data.user.email!,
            name: data.user.user_metadata?.name || "Usuário",
            cpf: data.user.user_metadata?.cpf || null,
            role: "BUYER",
          },
        });
      }
    } catch (e) {
      console.error("Erro ao sincronizar usuário no login", e);
    }
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signup(_prevState: unknown, formData: FormData) {
  const supabase = await createClient();

  const email    = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name     = formData.get("name") as string;
  const cpf      = formData.get("cpf") as string;

  if (!cpf) {
    return { error: "CPF é obrigatório." };
  }

  if (!isValidCPF(cpf)) {
    return { error: "CPF inválido. Por favor, insira um CPF válido." };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        cpf,
        role: "BUYER",
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Cria o usuário imediatamente no Prisma após o cadastro no Supabase
  if (data.user) {
    try {
      await prisma.user.create({
        data: {
          authId: data.user.id,
          email: data.user.email!,
          name: name,
          cpf: cpf,
          role: "BUYER",
        },
      });
    } catch (dbError) {
      console.error("Erro ao sincronizar usuário no Prisma:", dbError);
      // Mesmo se falhar, deixamos passar pois o checkout tenta recriar (lazy)
      // mas logamos o erro.
    }
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
