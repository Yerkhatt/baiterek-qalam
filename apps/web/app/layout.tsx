import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter } from "next/font/google";
import "@/styles/design-tokens.css";
import "@/app/globals.css";
import { LOCALE, messages } from "@/lib/i18n";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
  display: "swap"
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin", "cyrillic"],
  variable: "--font-mono",
  weight: ["400", "500"],
  display: "swap"
});

const meta = messages[LOCALE].meta as { title: string; description: string };

export const metadata: Metadata = {
  title: meta.title,
  description: meta.description
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${inter.variable} ${plexMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
