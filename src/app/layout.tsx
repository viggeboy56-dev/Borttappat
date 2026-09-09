import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Borttappat!", template: "%s | Borttappat!" },
  description: "Digitalt hittegods för skolor.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="sv" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
