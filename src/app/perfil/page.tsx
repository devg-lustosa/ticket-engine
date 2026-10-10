import { getCurrentUser } from "@/services/user.service";
import PerfilForm from "./perfil-form";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Configurações da Conta",
};

export default async function PerfilPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return <PerfilForm initialHideFromAttendees={user.hideFromAttendees ?? false} />;
}
