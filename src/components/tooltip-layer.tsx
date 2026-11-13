"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Tip = { label: string; left: number; top: number; above: boolean; host: HTMLElement };

export function TooltipLayer() {
  const id = useId();
  const [tip, setTip] = useState<Tip | null>(null);
  const target = useRef<HTMLElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    let escapeFrame: number | null = null;
    function clear() {
      if (timer.current) clearTimeout(timer.current);
      if (target.current) {
        const previous = target.current.getAttribute("aria-describedby")?.split(" ").filter(value => value !== id).join(" ");
        if (previous) target.current.setAttribute("aria-describedby", previous);
        else target.current.removeAttribute("aria-describedby");
      }
      target.current = null; setTip(null);
    }
    function show(event: Event) {
      const element = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-tooltip]") : null;
      if (!element?.dataset.tooltip) return;
      if (element === target.current) { if (timer.current) clearTimeout(timer.current); return; }
      clear(); target.current = element;
      element.setAttribute("aria-describedby", [element.getAttribute("aria-describedby"), id].filter(Boolean).join(" "));
      const rect = element.getBoundingClientRect(), edge = Math.min(146, window.innerWidth / 2);
      const above = rect.bottom + 80 > window.innerHeight;
      setTip({ label: element.dataset.tooltip, left: Math.min(window.innerWidth - edge, Math.max(edge, rect.left + rect.width / 2)), top: above ? rect.top - 8 : rect.bottom + 8, above, host: element.closest<HTMLElement>("dialog[open]") ?? document.body });
    }
    function leave(event: Event) {
      const next = (event as MouseEvent).relatedTarget;
      if (next instanceof Element && (target.current?.contains(next) || next.closest(".app-tooltip"))) return;
      timer.current = setTimeout(clear, 100);
    }
    function escape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      clear();
      if (escapeFrame !== null) cancelAnimationFrame(escapeFrame);
      // O menu restaura foco no mesmo Escape; esse foco não deve reabrir a legenda.
      escapeFrame = requestAnimationFrame(() => { escapeFrame = null; clear(); });
    }
    document.addEventListener("pointerover", show);
    document.addEventListener("focusin", show);
    document.addEventListener("pointerout", leave);
    document.addEventListener("focusout", leave);
    document.addEventListener("keydown", escape);
    document.addEventListener("click", clear);
    window.addEventListener("scroll", clear, true);
    window.addEventListener("resize", clear);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      if (escapeFrame !== null) cancelAnimationFrame(escapeFrame);
      document.removeEventListener("pointerover", show); document.removeEventListener("focusin", show);
      document.removeEventListener("pointerout", leave); document.removeEventListener("focusout", leave);
      document.removeEventListener("keydown", escape); window.removeEventListener("scroll", clear, true); window.removeEventListener("resize", clear);
      document.removeEventListener("click", clear);
    };
  }, [id]);
  if (!tip) return null;
  return createPortal(<div id={id} role="tooltip" className="app-tooltip" style={{ left: tip.left, top: tip.top, transform: `translate(-50%, ${tip.above ? "-100%" : "0"})` }} onPointerEnter={() => { if (timer.current) clearTimeout(timer.current); }}>{tip.label}</div>, tip.host);
}
