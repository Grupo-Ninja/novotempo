import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "JP Agro — Grãos e Transporte",

  description: "Sistema de gestão de contratos e carregamentos",
  manifest: "/manifest.json",
  themeColor: "#1B5E20",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
