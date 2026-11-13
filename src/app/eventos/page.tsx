import Image from "next/image";
import Link from "next/link";
import { Calendar, MapPin, ArrowRight } from "lucide-react";
import { getPublishedEvents } from "@/services/event.service";

export const revalidate = 30;
export const metadata = { title: "Próximos eventos" };
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default async function EventsPage() {
  const events = await getPublishedEvents();
  const now = new Date();
  return <main className="flex-1 bg-background">
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div><p className="mb-2 text-sm font-medium text-muted-fg">Sua próxima saída começa aqui</p><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Próximos eventos</h1><p className="mt-3 text-muted-fg">Confira a programação, escolha o evento e reserve seus ingressos.</p></div>
        <Link href="/meus-ingressos" className="nav-control border border-border" data-tooltip="Já comprei · ver meus ingressos">Já comprei · ver meus ingressos <ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
      {!events.length ? <div className="rounded-2xl border border-dashed border-border p-12 text-center"><h2 className="font-semibold">A programação está sendo preparada</h2><p className="mt-2 text-muted-fg">Nenhum próximo evento publicado. Volte em breve para conferir.</p></div> : <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {events.map(event => {
          const eventDate = new Date(event.date);
          const available = event.batches.filter(batch => batch.soldQty < batch.totalQty && (!batch.startAt || new Date(batch.startAt) <= now) && (!batch.endAt || new Date(batch.endAt) >= now));
          const minimum = available.length ? Math.min(...available.map(batch => Number(batch.price))) : null;
          return <article key={event.id} className="overflow-hidden rounded-2xl border border-card-border bg-card shadow-sm">
            <Link href={"/evento/" + event.slug} tabIndex={-1} aria-hidden="true" className="relative block aspect-video bg-muted">{event.coverImage && <Image src={event.coverImage} alt="" fill sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw" className="object-cover" />}</Link>
            <div className="space-y-4 p-5"><h2 className="text-xl font-semibold leading-tight"><Link href={"/evento/" + event.slug}>{event.title}</Link></h2>
              <div className="space-y-2 text-sm text-muted-fg"><p className="flex gap-2"><Calendar size={17} aria-hidden="true" /><time dateTime={eventDate.toISOString()}>{eventDate.toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Sao_Paulo" })}</time></p><p className="flex gap-2"><MapPin size={17} aria-hidden="true" />{event.venue}{event.city ? " · " + event.city : ""}</p></div>
              <div className="border-t border-border pt-4"><p className="mb-3 text-sm">{minimum === null ? "Nenhum lote disponível agora" : minimum === 0 ? "Entrada gratuita" : <>A partir de <strong className="text-lg">{currency.format(minimum)}</strong></>}</p><Link href={"/evento/" + event.slug} className="ui-button w-full" aria-label="Ver ingressos e lotes deste evento" data-tooltip="Ver ingressos e lotes deste evento">{minimum === null ? "Ver detalhes e lotes" : "Escolher ingressos"}<ArrowRight size={17} aria-hidden="true" /></Link></div>
            </div>
          </article>;
        })}
      </div>}
      <p className="mt-6 text-xs text-muted-fg">A disponibilidade é confirmada ao gerar o pedido. Horários de Brasília.</p>
    </div>
  </main>;
}
