"use client";

import { Children, cloneElement, isValidElement, useId, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { eventDateTimeInput, eventDateTimeToIso } from "@/lib/event-date-time";
import {
  Calendar,
  MapPin,
  Image as ImageIcon,
  FileText,
  Ticket,
  Plus,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Save,
  Upload,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────

interface BatchEntry {
  _key: string;
  name: string;
  price: string;
  totalQty: string;
  endAt: string;
}

interface FormData {
  // Evento
  title: string;
  slug: string;
  dateStart: string;
  doorsOpen: string;
  // Local
  venueName: string;
  rua: string;
  numero: string;
  referencia: string;
  bairro: string;
  city: string;
  state: string;
  // Mídia
  coverImageUrl: string;
  coverImagePreview: string | null;
  // Descrição
  description: string;
}

// ─── Constants ────────────────────────────────────────────────

const STEPS = [
  { id: "evento", label: "Evento", icon: Calendar },
  { id: "local", label: "Local", icon: MapPin },
  { id: "midia", label: "Mídia", icon: ImageIcon },
  { id: "descricao", label: "Descrição", icon: FileText },
  { id: "ingressos", label: "Ingressos", icon: Ticket },
];

const STATES_BR = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

// ─── Helpers ──────────────────────────────────────────────────

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

const emptyBatch = (): BatchEntry => ({
  _key: uid(),
  name: "",
  price: "",
  totalQty: "",
  endAt: "",
});

// ─── Input components ─────────────────────────────────────────

function Field({
  label,
  required,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  const generatedId = useId();
  const controlId = htmlFor ?? generatedId;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={controlId} className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {Children.map(children, child => isValidElement<{ id?: string }>(child) && ["input", "select", "textarea"].includes(String(child.type)) ? cloneElement(child, { id: controlId }) : child)}
      {hint && <p className="text-xs text-muted-fg">{hint}</p>}
    </div>
  );
}

const inputCls =
  "w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-fg focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors";

const textareaCls =
  "w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-fg focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors resize-y min-h-[120px]";

// ─── Main Component ───────────────────────────────────────────

export function EditEventoForm({ organizerId, initialData }: { organizerId: string, initialData: any }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormData>({
    title: initialData.title || "",
    slug: initialData.slug || "",
    dateStart: initialData.date ? eventDateTimeInput(initialData.date) : "",
    doorsOpen: initialData.doorsOpen ? eventDateTimeInput(initialData.doorsOpen) : "",
    venueName: initialData.venue || "",
    rua: initialData.address || "", // Simpificado
    numero: "",
    referencia: "",
    bairro: "",
    city: initialData.city || "",
    state: initialData.state || "",
    coverImageUrl: initialData.coverImage || "",
    coverImagePreview: initialData.coverImage || null,
    description: initialData.description || "",
  });

  const [batches, setBatches] = useState<BatchEntry[]>(
    initialData.batches && initialData.batches.length > 0
      ? initialData.batches.map((b: any) => ({
          _key: uid(),
          name: b.name,
          price: Number(b.price).toFixed(2),
          totalQty: b.totalQty.toString(),
          endAt: b.endAt ? eventDateTimeInput(b.endAt) : "",
        }))
      : [emptyBatch()]
  );

  // ── Handlers ──────────────────────────────────────────────

  function setField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleTitleChange(val: string) {
    setForm((prev) => ({
      ...prev,
      title: val,
      slug: slugify(val),
    }));
  }

  function handleCoverFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setField("coverImagePreview", ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  // ── Batch handlers ─────────────────────────────────────────

  function addBatch() {
    setBatches((prev) => [...prev, emptyBatch()]);
  }

  function removeBatch(key: string) {
    setBatches((prev) => prev.filter((b) => b._key !== key));
  }

  function updateBatch(key: string, field: keyof BatchEntry, value: string) {
    setBatches((prev) =>
      prev.map((b) => (b._key === key ? { ...b, [field]: value } : b))
    );
  }

  // ── Submit ─────────────────────────────────────────────────

  async function handleSubmit() {
    setError(null);
    setIsLoading(true);
    try {
      const address = [form.rua, form.numero, form.referencia, form.bairro]
        .filter(Boolean)
        .join(", ");

      const payload = {
        organizerId,
        title: form.title,
        slug: form.slug,
        date: eventDateTimeToIso(form.dateStart),
        doorsOpen: form.doorsOpen ? eventDateTimeToIso(form.doorsOpen) : null,
        venue: form.venueName,
        address,
        city: form.city,
        state: form.state,
        coverImage: form.coverImageUrl || form.coverImagePreview || null,
        description: buildDescription(form),
        batches: batches.map((b, i) => ({
          name: b.name,
          price: parseFloat(b.price.replace(",", ".")) || 0,
          totalQty: parseInt(b.totalQty) || 0,
          endAt: b.endAt ? eventDateTimeToIso(b.endAt) : null,
          sortOrder: i,
        })),
      };

      const res = await fetch(`/api/painel/eventos/${initialData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao atualizar evento");
      router.push("/painel");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setIsLoading(false);
    }
  }

  function buildDescription(f: FormData) {
    return f.description ?? "";
  }

  // ── Navigation ─────────────────────────────────────────────

  const isLastStep = step === STEPS.length - 1;

  function canProceed() {
    if (step === 0) return form.title && form.dateStart;
    if (step === 1) return form.venueName;
    return true;
  }

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    [form.rua, form.numero, form.bairro, form.city, form.state]
      .filter(Boolean)
      .join(", ")
  )}`;

  // ── Render ─────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm relative">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push("/painel")}
            className="flex items-center gap-2 text-sm text-muted-fg hover:text-foreground transition-colors" data-tooltip="Voltar"
          >
            <ArrowLeft size={16} />
            Voltar
          </button>
          <h1 className="text-base font-semibold">Editar Evento</h1>
          <div className="text-xs text-muted-fg">
            {step + 1} / {STEPS.length}
          </div>
        </div>
      </header>

      {/* Progress */}
      <div className="bg-card/50 border-b border-border">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex overflow-x-auto">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const active = i === step;
              const done = i < step;
              return (
                <button
                  key={s.id}
                  onClick={() => i < step && setStep(i)}
                  className={`flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 whitespace-nowrap transition-colors
                    ${active ? "border-brand text-foreground" : done ? "border-transparent text-success cursor-pointer hover:text-success" : "border-transparent text-muted-fg cursor-default"}`} data-tooltip="Selecionar etapa do formulário"
                >
                  {done ? <CheckCircle2 size={14} /> : <Icon size={14} />}
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {error && (
          <div className="flex items-center gap-2 bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 mb-6 text-sm text-red-300">
            <AlertCircle size={16} className="shrink-0" />
            {error}
            <button onClick={() => setError(null)} className="ml-auto" aria-label="Remover imagem de capa" data-tooltip="Remover imagem de capa">
              <X size={14} />
            </button>
          </div>
        )}

        {/* ── Step 0: Evento ─────────────────────────────────── */}
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-1">Informações do Evento</h2>
              <p className="text-sm text-muted-fg">Dados principais do seu evento</p>
            </div>

            <Field label="Nome do Evento" required>
              <input
                className={inputCls}
                placeholder="Ex: Festa de Verão 2026"
                value={form.title}
                onChange={(e) => handleTitleChange(e.target.value)}
              />
            </Field>

            <Field
              label="Link da Página"
              hint={`↗ Link gerado automaticamente: /evento/${form.slug || "meu-evento"} — edite se quiser personalizar`}
            >
              <input
                className={inputCls}
                placeholder="meu-evento"
                value={form.slug}
                onChange={(e) => setField("slug", slugify(e.target.value))}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
                <Field label="Data e Hora de Início (Brasília)" required>
                <input
                  type="datetime-local"
                  className={inputCls}
                  value={form.dateStart}
                  onChange={(e) => setField("dateStart", e.target.value)}
                />
              </Field>
                <Field label="Abertura das portas">
                <input
                  type="datetime-local"
                  className={inputCls}
                  value={form.doorsOpen}
                  onChange={(e) => setField("doorsOpen", e.target.value)}
                />
              </Field>
            </div>
          </div>
        )}

        {/* ── Step 1: Local ──────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-1">Endereço do Local</h2>
              <p className="text-sm text-muted-fg">Detalhes do local para os participantes</p>
            </div>

            <Field label="Nome da Casa / Espaço" required>
              <input
                className={inputCls}
                placeholder="Ex: Club Inferno, Arena XP..."
                value={form.venueName}
                onChange={(e) => setField("venueName", e.target.value)}
              />
            </Field>

            <div className="grid grid-cols-3 gap-4">
              <Field label="Rua / Avenida" required>
                <input
                  className={inputCls}
                  placeholder="Av. Paulista"
                  value={form.rua}
                  onChange={(e) => setField("rua", e.target.value)}
                  style={{ gridColumn: "span 2" }}
                />
              </Field>
              <Field label="Número">
                <input
                  className={inputCls}
                  placeholder="1000"
                  value={form.numero}
                  onChange={(e) => setField("numero", e.target.value)}
                />
              </Field>
            </div>

            <Field label="Referência">
              <input
                className={inputCls}
                placeholder="Próximo ao metrô, em frente ao shopping..."
                value={form.referencia}
                onChange={(e) => setField("referencia", e.target.value)}
              />
            </Field>

            <Field label="Bairro">
              <input
                className={inputCls}
                placeholder="Bela Vista"
                value={form.bairro}
                onChange={(e) => setField("bairro", e.target.value)}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Cidade">
                <input
                  className={inputCls}
                  value={form.city}
                  onChange={(e) => setField("city", e.target.value)}
                  placeholder="São Paulo"
                />
              </Field>
              <Field label="Estado">
                <select
                  className={inputCls}
                  value={form.state}
                  onChange={(e) => setField("state", e.target.value)}
                >
                  <option value="">Selecione</option>
                  {STATES_BR.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </Field>
            </div>

            {(form.rua || form.city) && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 bg-muted hover:bg-muted border border-border rounded-lg text-sm text-foreground hover:text-foreground transition-colors w-fit" data-tooltip="Ver no Google Maps"
              >
                <MapPin size={15} />
                Ver no Google Maps
                <ExternalLink size={13} className="text-muted-fg" />
              </a>
            )}
          </div>
        )}

        {/* ── Step 2: Mídia ──────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-1">Banner de Capa</h2>
              <p className="text-sm text-muted-fg">Imagem principal que aparece na listagem do evento</p>
            </div>

            {/* Preview */}
            <div
              className="relative w-full aspect-video rounded-xl bg-muted border-2 border-dashed border-border overflow-hidden flex items-center justify-center cursor-pointer hover:border-brand/50 transition-colors group"
              onClick={() => fileInputRef.current?.click()}
            >
              {form.coverImagePreview ? (
                <>
                  <img
                    src={form.coverImagePreview}
                    alt="Preview"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Upload size={24} className="text-white" />
                  </div>
                </>
              ) : (
                <div className="text-center px-4">
                  <Upload size={32} className="text-muted-fg mx-auto mb-3" />
                  <p className="text-sm text-muted-fg">
                    Clique para fazer upload
                  </p>
                  <p className="text-xs text-muted-fg mt-1">PNG, JPG, WEBP — Recomendado 16:9</p>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverFile}
            />

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-muted" />
              <span className="text-xs text-muted-fg">ou use uma URL</span>
              <div className="flex-1 h-px bg-muted" />
            </div>

            <Field label="URL da imagem">
              <input
                className={inputCls}
                placeholder="https://exemplo.com/banner.jpg"
                value={form.coverImageUrl}
                onChange={(e) => {
                  setField("coverImageUrl", e.target.value);
                  setField("coverImagePreview", e.target.value || null);
                }}
              />
            </Field>
          </div>
        )}

        {/* ── Step 3: Descrição ──────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-1">Descrição do Evento</h2>
              <p className="text-sm text-muted-fg">Conte mais sobre o evento para os participantes</p>
            </div>

            <Field label="Descrição" hint="Suporta parágrafos e formatação básica">
              <textarea
                className={textareaCls}
                style={{ minHeight: 200 }}
                placeholder="Descreva o evento: atrações, programação, dress code, o que incluir..."
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
              />
            </Field>

            <Field
              label="Imagem do Mapa / Planta do Evento"
              hint="URL de uma imagem com o mapa do espaço ou planta da área"
            >
              <input
                className={inputCls}
                placeholder="https://exemplo.com/mapa-do-evento.jpg"
                value={""}
                onChange={() => {}}
              />
              <p className="text-xs text-amber-500/80 mt-1 flex items-center gap-1">
                <AlertCircle size={11} />
                Em breve esta imagem aparecerá na página do evento
              </p>
            </Field>
          </div>
        )}

        {/* ── Step 4: Ingressos ──────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-1">Ingressos</h2>
              <p className="text-sm text-muted-fg">
                Configure os lotes e categorias de ingressos
              </p>
            </div>

            <div className="space-y-4">
              {batches.map((batch, idx) => (
                <div
                  key={batch._key}
                  className="bg-card border border-border rounded-xl p-5 space-y-4"
                >
                  {/* Header do lote */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-brand uppercase tracking-wider">
                      Lote {idx + 1}
                    </span>
                    {batches.length > 1 && (
                      <button
                        onClick={() => removeBatch(batch._key)}
                        className="p-1 text-muted-fg hover:text-red-400 transition-colors"
                        data-tooltip="Remover lote" aria-label="Remover lote"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  {/* Nome */}
                  <Field label="Nome do Ingresso" required>
                    <input
                      className={inputCls}
                      placeholder="Ex: Feminino, Masculino, VIP, Camarote..."
                      value={batch.name}
                      onChange={(e) =>
                        updateBatch(batch._key, "name", e.target.value)
                      }
                    />
                  </Field>

                  {/* Preço + Qtd */}
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Preço (R$)" required htmlFor={"batch-price-" + batch._key}>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-fg text-sm">
                          R$
                        </span>
                        <input
                          type="number"
                          id={"batch-price-" + batch._key}
                          min="0"
                          step="0.01"
                          className={inputCls + " pl-9"}
                          placeholder="0,00"
                          value={batch.price}
                          onChange={(e) =>
                            updateBatch(batch._key, "price", e.target.value)
                          }
                        />
                      </div>
                    </Field>
                    <Field label="Quantidade disponível" required>
                      <input
                        type="number"
                        min="1"
                        className={inputCls}
                        placeholder="100"
                        value={batch.totalQty}
                        onChange={(e) =>
                          updateBatch(batch._key, "totalQty", e.target.value)
                        }
                      />
                    </Field>
                  </div>

                  {/* Prazo de venda */}
                  <Field
                    label="Vendas até"
                    hint="Deixe em branco para vender até o início do evento"
                  >
                    <input
                      type="datetime-local"
                      className={inputCls}
                      value={batch.endAt}
                      onChange={(e) =>
                        updateBatch(batch._key, "endAt", e.target.value)
                      }
                    />
                  </Field>
                </div>
              ))}
            </div>

            <button
              onClick={addBatch}
              className="flex items-center gap-2 w-full px-4 py-3 border-2 border-dashed border-border rounded-xl text-sm text-muted-fg hover:border-brand/50 hover:text-brand transition-colors" data-tooltip="Adicionar outro lote / categoria"
            >
              <Plus size={16} />
              Adicionar outro lote / categoria
            </button>
          </div>
        )}

        {/* ── Navigation ─────────────────────────────────────── */}
        <div className="flex items-center justify-between mt-10 pt-6 border-t border-border">
          <button
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-muted-fg hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed" data-tooltip="Anterior"
          >
            <ArrowLeft size={16} />
            Anterior
          </button>

          {isLastStep ? (
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-2.5 bg-brand hover:bg-brand/90 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed" aria-label="Salvar alterações do evento" data-tooltip="Salvar alterações do evento"
            >
              {isLoading ? (
                <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Save size={16} />
              )}
              {isLoading ? "Salvando..." : "Salvar Alterações"}
            </button>
          ) : (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-6 py-2.5 bg-brand hover:bg-brand/90 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed" data-tooltip="Próximo"
            >
              Próximo
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
