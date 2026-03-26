import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { NativeAppRuntime } from "@/components/mobile/native-app-runtime";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ornabird - Gestão de Criatórios Ornamentais",
  description: "Sistema Ornabird para gestão de criatórios de aves ornamentais",
  icons: {
    icon: "/ornabird-favicon.png",
    shortcut: "/ornabird-favicon.png",
    apple: "/ornabird-favicon.png"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <NativeAppRuntime />
        <Analytics />
      </body>
    </html>
  );
}
