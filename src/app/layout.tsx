import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { siteConfig } from "@/config/site";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: siteConfig.meta.title,
    template: `%s — ${siteConfig.name}`,
  },
  description: siteConfig.meta.description,
  keywords:    [...siteConfig.meta.keywords],
  metadataBase: new URL(siteConfig.url),
  openGraph: {
    type:        "website",
    locale:      siteConfig.meta.locale,
    url:         siteConfig.url,
    title:       siteConfig.meta.title,
    description: siteConfig.meta.description,
    siteName:    siteConfig.name,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
