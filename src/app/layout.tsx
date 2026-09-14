import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { PwaRegistration } from "@/components/pwa-registration";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Borttappat!", template: "%s | Borttappat!" },
  description: "Digitalt hittegods för skolor.",
  applicationName: "Borttappat",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Borttappat",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#016247",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="sv" className="h-full antialiased">
      <body className="min-h-full">
        {children}
        <PwaRegistration />
      </body>
    </html>
  );
}
