import { redirect } from "next/navigation";
import { getCurrentUser } from "@/services/user.service";
import { homeForRole } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();
  redirect(homeForRole(user?.role ?? null));
}
