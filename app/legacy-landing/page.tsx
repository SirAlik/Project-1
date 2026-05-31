"use client";

import React from "react";
import {
    Users,
    Rocket,
    BookOpen,
    Trophy,
    Heart,
    Sparkles,
    ArrowUpRight,
    ShieldCheck,
    Globe,
    Library,
    Atom,
    Palette,
    Trophy as TrophyIcon,
    Activity
} from "lucide-react";

import { LoginCard } from "@/components/landing/LoginCard";
import { KPIStatCard } from "@/components/landing/KPIStatCard";
import { HighlightTile } from "@/components/landing/HighlightTile";
import { LivePulse } from "@/components/landing/LivePulse";

import dynamic from "next/dynamic";

const PublicFeed = dynamic(() => import("@/components/landing/PublicFeed").then(mod => mod.PublicFeed), {
    ssr: false,
    loading: () => <div className="w-full h-[600px] glass-panel rounded-[3rem] animate-pulse bg-white/5" />
});





export default function Home() {
    return (
        <main className="min-h-screen text-white font-saudi relative overflow-hidden bg-transparent" dir="rtl">
            {/* Visual Core: Scattered Parallax Dots - REMOVED */}

            <div className="relative z-10">
                {/* A) Header Section */}
                <header className="max-w-7xl mx-auto px-8 py-8 flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="flex items-center gap-4 group cursor-pointer">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-xl group-hover:rotate-12 transition-transform duration-500">
                            <Globe className="text-primary-foreground w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black tracking-tighter leading-none text-white">مدارس <span className="text-primary italic">الفلاح</span></h1>
                            <p className="text-xs font-bold uppercase tracking-widest text-white/80 mt-1">Smart School OS • 2.0</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <nav className="hidden md:flex items-center gap-8 text-sm font-bold uppercase tracking-widest text-white/90">
                            <a href="#" className="hover:text-white transition-colors">عن المدرسة</a>
                            <a href="#" className="hover:text-white transition-colors">القبول</a>
                            <a href="#" className="hover:text-white transition-colors">تواصل معنا</a>
                        </nav>
                        <div className="w-[1px] h-4 bg-white/20 hidden md:block" />
                    </div>
                </header>

                {/* B) Hero Section */}
                <section className="max-w-7xl mx-auto px-8 pt-12 pb-24 grid lg:grid-cols-2 gap-20 items-center">
                    <div className="order-2 lg:order-1 animate-in fade-in slide-in-from-right-8 duration-1000">
                        <LoginCard />
                    </div>

                    <div className="order-1 lg:order-2 space-y-12 animate-in fade-in slide-in-from-left-8 duration-1000">
                        <div className="space-y-6">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-md">
                                <Sparkles className="w-4 h-4 text-accent" />
                                <span className="text-xs font-bold uppercase tracking-widest text-white">Antigravity • Digital Excellence</span>
                            </div>
                            <h2 className="text-5xl md:text-7xl font-black tracking-tighter leading-tight text-white">
                                مستقبل <br />
                                <span className="text-primary italic">التعليم</span> يبدأ هنا
                            </h2>
                            <p className="text-lg md:text-xl font-medium leading-relaxed max-w-xl text-white/90">
                                تجربة تعليمية ذكية تعتمد على تحليل البيانات وتنمية المهارات، متمحورة حول الطالب لرسم ملامح مستقبل واعد.
                            </p>
                        </div>

                        {/* Headline Public KPIs */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 shadow-lg group hover:border-primary/50 transition-all backdrop-blur-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                        <Users className="w-6 h-6" />
                                    </div>
                                    <ArrowUpRight className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-all text-white" />
                                </div>
                                <div className="text-4xl font-black mb-1 tabular-nums text-white">1,250+</div>
                                <div className="text-xs font-bold uppercase tracking-widest text-white/80">طالب وطالبة</div>
                            </div>

                            <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 shadow-lg group hover:border-accent/50 transition-all backdrop-blur-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                                        <Rocket className="w-6 h-6" />
                                    </div>
                                    <ArrowUpRight className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-all text-white" />
                                </div>
                                <div className="text-4xl font-black mb-1 tabular-nums text-white">450+</div>
                                <div className="text-xs font-bold uppercase tracking-widest text-white/80">نشاط وفعالية</div>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-4 items-center pl-4">
                            <div className="flex -space-x-3 rtl:space-x-reverse">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="w-10 h-10 rounded-full border-4 border-black/20 bg-secondary overflow-hidden ring-1 ring-white/20">
                                        <div className="w-full h-full bg-gradient-to-br from-white/20 to-white/5" />
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs font-bold uppercase tracking-widest text-white/90">+ انضمام لبرنامج التفوق هذا الفصل</p>
                        </div>
                    </div>
                </section>

                {/* F) LIVE SCHOOL PULSE */}
                <section className="max-w-7xl mx-auto px-8 py-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <LivePulse />
                </section>

                {/* C) KPI GRID (Public Metrics) */}
                <section className="max-w-7xl mx-auto px-8 py-24">
                    <div className="text-center mb-16 space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-[0.4em] text-primary">Operational Insights</h3>
                        <h2 className="text-4xl font-black tracking-tighter text-white">أرقام <span className="italic text-white/80">تتحدث</span> عن التميز</h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        <KPIStatCard title="إجمالي الطلاب" value={1250} label="طالب" icon={Users} color="primary" delay={100} />
                        <KPIStatCard title="الأنشطة الفصلية" value={48} label="نشاط" trend={{ value: "12%", isPositive: true }} icon={Rocket} color="accent" delay={200} />
                        <KPIStatCard title="مشاركات الطلاب" value={92} suffix="%" trend={{ value: "5%", isPositive: true }} icon={ShieldCheck} color="primary" delay={300} />
                        <KPIStatCard title="استعارات المكتبة" value={340} label="كتاب" trend={{ value: "24%", isPositive: true }} icon={BookOpen} color="accent" delay={400} />
                        <KPIStatCard title="الجوائز والأوسمة" value={156} label="جائزة" trend={{ value: "8%", isPositive: true }} icon={Trophy} color="accent" delay={500} />
                        <KPIStatCard title="ساعات العمل التطوعي" value={850} label="ساعة" trend={{ value: "45%", isPositive: true }} icon={Heart} color="accent" delay={600} />
                    </div>
                </section>

                {/* D) HIGHLIGHTS SECTION */}
                <section className="max-w-7xl mx-auto px-8 py-24 bg-gradient-to-b from-transparent via-primary/5 to-transparent">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-20">
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold uppercase tracking-[0.4em] text-primary">Specializations</h3>
                            <h2 className="text-4xl md:text-5xl font-black tracking-tighter leading-tight text-white">ما يميز <span className="text-primary italic">مدارسنا</span></h2>
                        </div>
                        <p className="text-base font-medium max-w-sm leading-relaxed text-white/90">
                            نركز على بناء شخصية الطالب من خلال بيئة تعليمية متكاملة تدعم الابتكار والإبداع في مختلف المجالات.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <HighlightTile title="التميز والمسابقات" metric="أول" description="نظام متكامل لدعم المشاركات المحلية والدولية في كافة المسابقات العلمية والرياضية." icon={TrophyIcon} color="accent" delay={100} />
                        <HighlightTile title="المكتبة والقراءة" metric="24/7" description="فهرسة ذكية واستعارات رقمية تضمن وصول الطالب لأكثر من ٥٠ ألف كتاب ومصدر." icon={Library} color="accent" delay={200} />
                        <HighlightTile title="الابتكار والـ STEM" metric="+20" description="معامل متطورة لدعم أبحاث الذكاء الاصطناعي، الروبوتكس، والعلوم المتقدمة." icon={Atom} color="primary" delay={300} />
                        <HighlightTile title="الثقافة والفنون" metric="+12" description="أندية دورية لتنمية المواهب الفنية، المسرحية، والخط العربي الأصيل." icon={Palette} color="accent" delay={400} />
                        <HighlightTile title="الرياضة والصحة" metric="100%" description="برامج رياضية يومية ومتابعة صحية دقيقة لضمان سلامة وتفوق أبنائنا." icon={Activity} color="primary" delay={500} />
                        <HighlightTile title="الشراكة المجتمعية" metric="+35" description="علاقات استراتيجية مع مؤسسات رائدة لتدريب الطلاب وتهيئتهم للمستقبل." icon={Globe} color="accent" delay={600} />
                    </div>
                </section>

                {/* E) RECENT UPDATES */}
                <section className="max-w-7xl mx-auto px-8 py-24">
                    <PublicFeed />
                </section>

                {/* G) FOOTER SECTION */}
                <footer className="max-w-7xl mx-auto px-8 pt-24 pb-12 border-t border-white/10">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-primary">
                                    <Globe className="w-5 h-5" />
                                </div>
                                <h4 className="font-black text-lg text-white">مدارس الفلاح</h4>
                            </div>
                            <p className="text-sm font-medium leading-relaxed text-white/80">
                                منصة تعليمية متطورة تهدف إلى تمكين المؤسسات التعليمية من التحول الرقمي الكامل وفق رؤية المملكة ٢٠٣٠.
                            </p>
                        </div>

                        {[
                            { title: "الروابط السريعة", links: ["الرئيسية", "عن المدرسة", "بوابة القبول", "الأخبار"] },
                            { title: "الخدمات الرقمية", links: ["بوابة الطالب", "بوابة ولي الأمر", "حجز المصادر", "نظام الجودة"] },
                            { title: "تواصل معنا", links: ["الرياض، المملكة العربية السعودية", "+966 123 456 789", "info@alfalah.edu", "خريطة الموقع"] },
                        ].map((col, i) => (
                            <div key={i} className="space-y-6 text-right">
                                <h4 className="text-xs font-bold uppercase tracking-widest text-white/60">{col.title}</h4>
                                <ul className="space-y-4">
                                    {col.links.map((link, j) => (
                                        <li key={j}>
                                            <a href="#" className="text-sm font-bold hover:text-primary transition-colors text-white/90 hover:text-white">{link}</a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col md:flex-row items-center justify-between gap-8 pt-12 border-t border-white/10 font-bold tracking-widest text-xs uppercase text-white/60">
                        <p suppressHydrationWarning>© {new Date().getFullYear()} AL FALAH SCHOOLS • SMART SYSTEM</p>
                        <div className="flex items-center gap-8">
                            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
                            <a href="#" className="hover:text-white transition-colors">OS Status</a>
                        </div>
                    </div>
                </footer>
            </div>

            <style jsx global>{`
        .shadow-pulse {
          box-shadow: 0 0 0 0 hsl(var(--destructive) / 0.4);
          animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 hsl(var(--destructive) / 0.4); }
          70% { box-shadow: 0 0 0 10px hsl(var(--destructive) / 0); }
          100% { box-shadow: 0 0 0 0 hsl(var(--destructive) / 0); }
        }

        .animate-in {
          animation-fill-mode: forwards;
        }
      `}</style>
        </main>
    );
}
