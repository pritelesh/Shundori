import type { Metadata, Viewport } from "next";
import {
  Inter,
  Kaushan_Script,
  Noto_Sans_Bengali,
  Plus_Jakarta_Sans,
} from "next/font/google";
import type { ReactNode } from "react";

import { LanguageProvider } from "@/components/providers/language-provider";
import { siteConfig } from "@/lib/site";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const script = Kaushan_Script({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-kaushan",
  display: "swap",
});

const bengali = Noto_Sans_Bengali({
  subsets: ["bengali", "latin"],
  variable: "--font-noto-bengali",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — Cosmetics & Skincare`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: [
    "Shundori",
    "cosmetics Bangladesh",
    "skincare Bangladesh",
    "makeup Bangladesh",
    "beauty store Dhaka",
  ],
  authors: [{ name: siteConfig.name }],
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: `${siteConfig.name} — Cosmetics & Skincare`,
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} — Cosmetics & Skincare`,
    description: siteConfig.description,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#EEF0E4",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${jakarta.variable} ${script.variable} ${bengali.variable}`}
    >
      <body className="flex min-h-dvh flex-col bg-mist font-sans text-ink-soft antialiased">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
