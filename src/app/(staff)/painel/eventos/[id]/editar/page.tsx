import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { EditEventoForm } from "./_components/edit-evento-form";

export default async function EditarEventoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({ where: { authId: user.id } });
  if (!dbUser || dbUser.role !== "ORGANIZER") redirect("/painel");

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      batches: true,
    },
  });

  if (!event || event.organizerId !== dbUser.id) {
    redirect("/painel");
  }

  // Next.js requires plain objects for Client Components.
  // We use JSON parse/stringify to serialize Prisma's Decimal and Date types.
  const serializedEvent = JSON.parse(JSON.stringify(event));

  return <EditEventoForm organizerId={dbUser.id} initialData={serializedEvent} />;
}
