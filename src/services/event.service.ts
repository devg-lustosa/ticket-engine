import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";

// Separação de Backend: Função que busca eventos com cache do Next.js
export const getPublishedEvents = unstable_cache(
  async () => {
    try {
      const events = await prisma.event.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { date: "asc" },
      });
      return events;
    } catch (error) {
      console.error("Error fetching published events:", error);
      return [];
    }
  },
  ["published-events"], // Cache key
  { revalidate: 30, tags: ["events"] } // Revalida a cada 30 segundos
);

// Busca evento único pelo slug com cache
export const getEventBySlug = unstable_cache(
  async (slug: string) => {
    try {
      const event = await prisma.event.findUnique({
        where: { slug },
        include: {
          batches: {
            orderBy: { sortOrder: "asc" },
          },
          organizer: {
            select: { name: true },
          },
        },
      });
      return event;
    } catch (error) {
      console.error("Error fetching event by slug:", error);
      return null;
    }
  },
  ["event-details"],
  { revalidate: 60, tags: ["event-details"] }
);

export async function getAllEventSlugs() {
  try {
    const events = await prisma.event.findMany({
      select: { slug: true },
      where: { status: "PUBLISHED" }
    });
    return events;
  } catch (error) {
    return [];
  }
}
