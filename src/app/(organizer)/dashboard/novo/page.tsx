"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Calendar, MapPin, AlignLeft, Info } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export default function NovoEventoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Event Data
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [venue, setVenue] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  // Batches Data
  const [batches, setBatches] = useState([
    { name: "1º Lote", price: 0, totalQty: 100, startAt: "", endAt: "" }
  ]);

  const addBatch = () => {
    setBatches([...batches, { name: `${batches.length + 1}º Lote`, price: 0, totalQty: 100, startAt: "", endAt: "" }]);
  };

  const removeBatch = (index: number) => {
    setBatches(batches.filter((_, i) => i !== index));
  };

  const updateBatch = (index: number, field: string, value: any) => {
    const newBatches = [...batches];
    newBatches[index] = { ...newBatches[index], [field]: value };
    setBatches(newBatches);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          date,
          venue,
          address,
          city,
          state,
          batches: batches.map(b => ({
            ...b,
            price: Number(b.price),
            totalQty: Number(b.totalQty),
            startAt: b.startAt ? new Date(b.startAt).toISOString() : undefined,
            endAt: b.endAt ? new Date(b.endAt).toISOString() : undefined,
          }))
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao criar evento");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-2 hover:bg-muted rounded-full transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Novo Evento</h1>
              <p className="text-muted-fg">Preencha os dados do seu evento e os lotes de ingressos</p>
            </div>
          </div>
          <ThemeToggle />
        </header>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Informações Gerais */}
          <div className="bg-card border border-card-border rounded-xl p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2 border-b border-border pb-4">
              <Info className="text-brand" size={20} />
              <h2 className="text-xl font-bold">Informações Básicas</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Nome do Evento</label>
                <input 
                  type="text" 
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-brand focus:border-transparent outline-none transition-all"
                  placeholder="Ex: Festa de Ano Novo 2027"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Descrição</label>
                <textarea 
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-brand focus:border-transparent outline-none transition-all"
                  placeholder="Descreva as atrações e detalhes do evento..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Data e Hora de Início</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-fg" size={18} />
                  <input 
                    type="datetime-local" 
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-brand focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Nome do Local</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-fg" size={18} />
                  <input 
                    type="text" 
                    required
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-brand focus:border-transparent outline-none transition-all"
                    placeholder="Ex: Club Vibe"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Endereço Completo</label>
                <input 
                  type="text" 
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-brand focus:border-transparent outline-none transition-all"
                  placeholder="Rua Exemplo, 123"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Cidade</label>
                <input 
                  type="text" 
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-brand focus:border-transparent outline-none transition-all"
                  placeholder="São Paulo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Estado</label>
                <input 
                  type="text" 
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-brand focus:border-transparent outline-none transition-all"
                  placeholder="SP"
                />
              </div>
            </div>
          </div>

          {/* Lotes */}
          <div className="bg-card border border-card-border rounded-xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <AlignLeft className="text-brand" size={20} />
                <h2 className="text-xl font-bold">Lotes e Preços</h2>
              </div>
              <button 
                type="button" 
                onClick={addBatch}
                className="flex items-center gap-1.5 text-sm font-medium text-brand hover:text-brand-dark transition-colors"
              >
                <Plus size={16} />
                Adicionar Lote
              </button>
            </div>

            <div className="space-y-6">
              {batches.map((batch, index) => (
                <div key={index} className="p-5 border border-border rounded-xl bg-muted/30 relative">
                  {batches.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => removeBatch(index)}
                      className="absolute top-4 right-4 text-muted-fg hover:text-red-500 transition-colors"
                      title="Remover Lote"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 pr-8">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-muted-fg">Nome do Lote</label>
                      <input 
                        type="text" 
                        required
                        value={batch.name}
                        onChange={(e) => updateBatch(index, "name", e.target.value)}
                        className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-brand outline-none"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium mb-1 text-muted-fg">Preço (R$)</label>
                        <input 
                          type="number" 
                          required
                          step="0.01"
                          min="0"
                          value={batch.price}
                          onChange={(e) => updateBatch(index, "price", e.target.value)}
                          className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-brand outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1 text-muted-fg">Quantidade</label>
                        <input 
                          type="number" 
                          required
                          min="1"
                          value={batch.totalQty}
                          onChange={(e) => updateBatch(index, "totalQty", e.target.value)}
                          className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-brand outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-brand/5 border border-brand/20 p-4 rounded-lg">
                    <p className="text-sm font-semibold text-brand-dark mb-3">Virada de Lote (Opcional)</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium mb-1 text-muted-fg">Início das Vendas</label>
                        <input 
                          type="datetime-local" 
                          value={batch.startAt}
                          onChange={(e) => updateBatch(index, "startAt", e.target.value)}
                          className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-brand outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1 text-muted-fg">Fim das Vendas</label>
                        <input 
                          type="datetime-local" 
                          value={batch.endAt}
                          onChange={(e) => updateBatch(index, "endAt", e.target.value)}
                          className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-brand outline-none"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-fg mt-2">
                      Se não for preenchido, o lote ficará disponível assim que o evento for publicado até esgotar ou a data do evento chegar.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <Link 
              href="/dashboard"
              className="px-6 py-3 rounded-lg border border-border hover:bg-muted font-medium transition-colors"
            >
              Cancelar
            </Link>
            <button 
              type="submit"
              disabled={loading}
              className="px-8 py-3 rounded-lg bg-brand text-white hover:bg-brand-dark font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Salvando...
                </>
              ) : (
                "Criar Evento"
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
