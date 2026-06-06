import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { inter, ibmPlexArabic } from "@/lib/fonts";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { CommandPalette } from "@/components/CommandPalette";
import { ClientOverlays } from "@/components/ClientOverlays";
import { DevToolsRoot } from "@/components/dev/DevToolsRoot";
import { DevTokenStrip } from "@/components/dev/DevTokenStrip";
// (تنظيف) حُذفت مكوّنات التأثيرات القديمة غير المستخدمة (Antigravity/Holographic) نهائياً من المشروع.
import { GlobalHeader } from "@/components/layout/GlobalHeader";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: {
    default: "Sidra OS | نظام تشغيل مدرسي",
    template: "%s | Sidra OS",
  },
  description:
    "نظام تشغيل مدرسي يحوّل بيانات المدرسة إلى رؤى وتنبيهات ومخاطر وتوصيات وقرارات — بعزل تامّ لكل مدرسة.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning={true} className={cn(ibmPlexArabic.variable, inter.variable, "font-sans")}>
      <head />
      <body
        className="antialiased"
      >
        <>
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
