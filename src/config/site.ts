/**
 * src/config/site.ts
 * ─────────────────────────────────────────────────────────────────
 * Central white-label configuration for the Ticket Engine platform.
 * Override these values to rebrand the app for each venue client.
 */

export const siteConfig = {
  /** Display name of the event venue / brand */
  name: "Ticket Engine",

  /** Short tagline shown in meta descriptions */
  tagline: "Ingressos sem intermediários, direto com você.",

  /** Canonical URL — update per deployment/subdomain */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",

  /** Path to the logo asset inside /public */
  logo: "/logo.svg",

  /** Favicon path inside /public */
  favicon: "/favicon.ico",

  /** Contact e-mail shown in footers / support pages */
  supportEmail: "suporte@ticketengine.com.br",

  /** Social media links */
  social: {
    instagram: "",
    whatsapp: "",
    facebook: "",
  },

  /**
   * Brand color palette — matches CSS custom properties in globals.css.
   * Used for server-side metadata and any inline styles.
   */
  colors: {
    primary: "#6366f1",   // --brand-500
    accent:  "#8b5cf6",   // --accent-500
    dark:    "#0d0d14",   // --background (dark)
  },

  /**
   * SEO defaults used in root layout.
   * Each page can override title/description via generateMetadata().
   */
  meta: {
    title:       "Ticket Engine — Ingressos Digitais",
    description: "Compre e valide ingressos com segurança. Sem taxas abusivas.",
    keywords:    ["ingressos", "eventos", "pix", "qr code", "portaria"],
    locale:      "pt_BR",
  },
} as const;

export type SiteConfig = typeof siteConfig;
