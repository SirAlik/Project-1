import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { inter, ibmPlexArabic } from "@/lib/fonts";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { CommandPalette } from "@/components/CommandPalette";
import { ClientOverlays } from "@/components/ClientOverlays";
// (تنظيف) أُزيلت أدوات التطوير/التصحيح المرئية: شريط DevTokenStrip ("BRAND LOCK") + زر Omni-Inspector (الأيقونة البنفسجية).
// كانت تظهر في بيئة التطوير فقط وبلا قيمة للمستخدم. (مكوّنات التأثيرات القديمة Antigravity/Holographic أُزيلت سابقاً.)
import { GlobalHeader } from "@/components/layout/GlobalHeader";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: {
    default: "سِدرة | نظام تشغيل مدرسي",
    template: "%s | سِدرة",
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
          <ClientOverlays />
          <Providers>
            <div className="relative z-10">
              <GlobalHeader />
              <main className="pt-24 min-h-screen">
                {children}
              </main>
              <ToastContainer />
              <CommandPalette />
            </div>
          </Providers>
        </>
      </body>
    </html>
  );
}
