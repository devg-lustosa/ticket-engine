import { requireActor } from "@/lib/api";
import { PortariaClient } from "./portaria-client";

export default async function PortariaPage() {
  const actor = await requireActor(["STAFF", "ORGANIZER"]);
  return <PortariaClient actorId={actor.id} />;
}
