import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { DashboardShell } from "@/components/DashboardShell";
import { AnalyticsProvider } from "@/providers/AnalyticsProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Automata - Tu asistente 24/7",
  description: "Panel de control para tu asistente virtual",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-background flex h-screen overflow-hidden text-foreground`}>
        <AnalyticsProvider>
          <DashboardShell>
            {children}
          </DashboardShell>
        </AnalyticsProvider>
      </body>
    </html>
  );
}
