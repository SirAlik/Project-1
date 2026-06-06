import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { HeroSection } from "@/components/landing/HeroSection";
import { SchoolPulseSection } from "@/components/landing/SchoolPulseSection";
import { RoleIntelligenceSection } from "@/components/landing/RoleIntelligenceSection";
import { DataToActionSection } from "@/components/landing/DataToActionSection";
import { WorkflowSection } from "@/components/landing/WorkflowSection";
import { TrustSection } from "@/components/landing/TrustSection";
import { StudentRoomSection } from "@/components/landing/StudentRoomSection";
import { FinalCTASection } from "@/components/landing/FinalCTASection";
import { LandingFooter } from "@/components/landing/LandingFooter";

/**
 * الصفحة الرئيسية العامة (Landing) لـ Sidra OS.
 * Server Component رفيع: يقرأ الجلسة فقط لتوجيه CTA (لا منطق أعمال)، ثم يركّب أقسام الهبوط المعيارية.
 * يلتزم بالدستور البصري المعتمد: خلفية vanilla (bg-background) · نص charcoal · أكسنت teal/أزرق · بطاقات ناعمة.
 */
export const metadata: Metadata = {
  // الصفحة الرئيسية تشترك في نفس segment مع app/layout.tsx، وقالب الـ template لا ينطبق على نفس الـ segment؛
  // لذلك نضع العنوان كنصّ مطلق كامل ليظهر في التبويب: "الرئيسية | Sidra OS".
  title: "الرئيسية | Sidra OS",
  description:
    "Sidra OS — نظام تشغيل مدرسي يحوّل بيانات مدرستك إلى رؤى وتنبيهات وقرارات لكل دور.",
};

export default async function Home() {
  let isAuthenticated = false;
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    isAuthenticated = !!session;
  } catch {
    isAuthenticated = false;
  }

  const ctaHref = isAuthenticated ? "/portal" : "/login";
  const ctaLabel = isAuthenticated ? "الدخول إلى النظام" : "استكشف النظام";

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <LandingHeader ctaHref={ctaHref} ctaLabel={ctaLabel} />
      <HeroSection ctaHref={ctaHref} ctaLabel={ctaLabel} />
      <SchoolPulseSection />
      <RoleIntelligenceSection />
      <DataToActionSection />
      <WorkflowSection />
      <TrustSection />
      <StudentRoomSection />
      <FinalCTASection ctaHref={ctaHref} ctaLabel={ctaLabel} />
      <LandingFooter />
    </div>
  );
}
