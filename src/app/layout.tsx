import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ORNEXA - Gestao de Criatorios Ornamentais",
  description: "Sistema ORNEXA para gestao de criatorios de aves ornamentais"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
