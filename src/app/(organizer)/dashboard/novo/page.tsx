import { redirect } from "next/navigation";

export default function LegacyNewEventPage() {
  redirect("/painel/eventos/novo");
}
