import type { Metadata } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { DashboardLayout } from "./components/layout";
import { ThemeProvider } from "./contexts/ThemeContext";

const outfit = Outfit({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "BioFoul Monitor | Transpetro Dashboard",
  description: "Sistema de monitoramento e predição de biofouling para a frota Transpetro. Otimize eficiência operacional, reduza consumo de combustível e apoie a descarbonização.",
  keywords: ["biofouling", "transpetro", "petrobras", "frota", "monitoramento", "descarbonização"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${outfit.variable} ${jetbrainsMono.variable} antialiased`}>
        <ThemeProvider>
          <DashboardLayout>
            {children}
          </DashboardLayout>
        </ThemeProvider>
      </body>
    </html>
  );
}
