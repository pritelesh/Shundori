import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Design System Preview",
  description: "Internal preview of the Shundori interface kit.",
  robots: { index: false, follow: false },
};

export default function DesignPreviewLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
