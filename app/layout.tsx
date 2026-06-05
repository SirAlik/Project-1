import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { inter, tajawal, saudiFont } from "@/lib/fonts";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { CommandPalette } from "@/components/CommandPalette";
import { ClientOverlays } from "@/components/ClientOverlays";
import { DevToolsRoot } from "@/components/dev/DevToolsRoot";
import { DevTokenStrip } from "@/components/dev/DevTokenStrip";
// import { BouncerEffect } from "@/components/ui/BouncerEffect";
// import { AntigravityScene } from "@/components/ui/AntigravityScene";
// import { AntigravitySceneDevOverlay } from "@/components/ui/AntigravitySceneDevOverlay";
// import { AntigravityBouncers } from "@/components/ui/AntigravityBouncers";
import { AntigravityParticlesCanvas } from "@/components/ui/AntigravityParticlesCanvas";
import { GlobalHeader } from "@/components/layout/GlobalHeader";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "أداة فلاح - نظرة مستقبلية",
  description: "نظام إدارة المدارس الذكي - رؤية 2030",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning={true} className={cn(saudiFont.variable, tajawal.variable, "font-sans", geist.variable)}>
      <head />
      <body
        className={`${saudiFont.variable} ${inter.variable} ${tajawal.variable} antialiased`}
      >
        <>
          <AntigravityParticlesCanvas />
          {process.env.NODE_ENV === "development" && <DevTokenStrip />}
          <ClientOverlays />
          <Providers>
            <div className="relative z-10">
              <GlobalHeader />
              <main className="pt-24 min-h-screen">
                {children}
              </main>
              <ToastContainer />
              <CommandPalette />
              <DevToolsRoot />
            </div>
          </Providers>
        </>
      </body>
    </html>
  );
}
