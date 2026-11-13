"use client";

export default function EventsError({ retry }: { error: unknown; retry: () => void }) {
  return <main className="flex-1 bg-background">
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Eventos indisponíveis no momento</h1>
      <p role="alert" className="mt-3 text-muted-fg">Não foi possível consultar a programação. Tente novamente em instantes.</p>
      <button type="button" onClick={retry} className="ui-button mt-6">Tentar novamente</button>
    </div>
  </main>;
}
