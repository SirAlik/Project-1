import React from "react";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import {
  ArrowUpRight,
  Activity,
  ShieldCheck,
  Sparkles,
  Users,
  Heart,
  Library,
  LineChart,
  Gauge,
  Lock,
  CheckCircle2,
  Layers,
  Zap,
  MessagesSquare,
} from "lucide-react";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const isAuthenticated = !!session;
  const primaryCtaHref = isAuthenticated ? "/portal" : "/login";
  const primaryCtaText = isAuthenticated ? "الدخول إلى النظام" : "تسجيل الدخول";
  const year = new Date().getFullYear();

  // ✅ FIX: لا نمرّر icon كـ Component (Lock / Sparkles ..) ثم نطبع <x.icon />
  // لأن هذا ممكن يسبب Hydration mismatch في بعض البيئات.
  // بدلاً من ذلك نمرّر icon كعنصر JSX جاهز ونطبعه مباشرة {x.icon}
  const miniBadges = [
    { icon: <Lock className="h-4 w-4 text-slate-500" />, t: "RLS" },
    { icon: <ShieldCheck className="h-4 w-4 text-slate-500" />, t: "تدقيق" },
    { icon: <MessagesSquare className="h-4 w-4 text-slate-500" />, t: "تواصل" },
  ];

  const whyCards = [
    {
      icon: <LineChart className="h-5 w-5 text-[hsl(var(--gold-strong))]" />,
      title: "لوحات قرار لحظية",
      desc: "مؤشرات واضحة، اتجاهات، وتنبيهات مبكرة بدون تعقيد.",
    },
    {
      icon: <ShieldCheck className="h-5 w-5 text-[hsl(var(--gold-strong))]" />,
      title: "أمان على مستوى المؤسسات",
      desc: "صلاحيات دقيقة، سجلات، وسياسات وصول على مستوى الصف.",
    },
    {
      icon: <Library className="h-5 w-5 text-[hsl(var(--gold-strong))]" />,
      title: "تكامل مصادر المدرسة",
      desc: "الزيارات، الأداء، الحضور، الجودة… كلها في بوتقة واحدة.",
    },
    {
      icon: <Sparkles className="h-5 w-5 text-[hsl(var(--gold-strong))]" />,
      title: "تبسيط اللغة",
      desc: "ترجمة الأرقام إلى معنى: ماذا يحدث؟ ولماذا؟ وماذا نفعل؟",
    },
  ];

  const featureCards = [
    {
      icon: <Users className="h-5 w-5 text-emerald-700" />,
      title: "بوابة أدوار واضحة",
      desc: "نفس النظام يخدم القيادة، المعلم، ولي الأمر… بدون تشويش.",
    },
    {
      icon: <Lock className="h-5 w-5 text-emerald-700" />,
      title: "صلاحيات دقيقة",
      desc: "كل مستخدم يرى ما يخصه فقط، وفق RLS وسياسات وصول صارمة.",
    },
    {
      icon: <Activity className="h-5 w-5 text-emerald-700" />,
      title: "مؤشرات قابلة للتنفيذ",
      desc: "ليست أرقام للتزيين… بل توصيات وخطوات واضحة.",
    },
    {
      icon: <Gauge className="h-5 w-5 text-emerald-700" />,
      title: "سرعة الوصول للمعلومة",
      desc: "مسارات قصيرة: أقل نقرات، أكثر وضوح، أسرع قرار.",
    },
    {
      icon: <Sparkles className="h-5 w-5 text-emerald-700" />,
      title: "واجهة نظيفة",
      desc: "مساحات بيضاء محسوبة، طبقات محسوبة، وتركيز على المحتوى.",
    },
    {
      icon: <ShieldCheck className="h-5 w-5 text-emerald-700" />,
      title: "جاهزية للتدقيق",
      desc: "هيكل يحترم الحوكمة والجودة والتوثيق دون تعقيد المستخدم.",
    },
  ];

  return (
    <main dir="rtl" className="min-h-screen bg-white text-slate-900 font-saudi overflow-x-hidden">
      {/* Background (Galaxy: هادئة، بدون particles مزعجة، وبدون شفافية قبيحة) */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        {/* Base bright field */}
        <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_15%_25%,rgba(255,255,255,0.95),rgba(255,255,255,0.72),rgba(255,255,255,0.40),rgba(255,255,255,0))]" />
        {/* Deep space tint (خفيف جدًا) */}
        <div className="absolute inset-0 bg-[radial-gradient(900px_520px_at_80%_35%,rgba(10,14,25,0.14),rgba(10,14,25,0.06),rgba(255,255,255,0))]" />
        {/* Milky way band */}
        <div className="absolute -left-24 top-10 h-[520px] w-[1100px] rotate-[-10deg] rounded-[999px] bg-[radial-gradient(closest-side,hsla(var(--gold),.22),hsla(var(--gold),.10),rgba(255,255,255,0))] blur-2xl opacity-70" />
        {/* Stars (قليلة وهادئة) */}
        <div className="absolute inset-0 opacity-45 [background-image:radial-gradient(rgba(255,255,255,0.85)_1px,transparent_1px)] [background-size:160px_160px]" />
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,0.75)_1px,transparent_1px)] [background-size:260px_260px]" />
        {/* Soft dust / noise */}
        <div className="absolute inset-0 opacity-[0.08] mix-blend-multiply [background-image:url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22160%22 height=%22160%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22160%22 height=%22160%22 filter=%22url(%23n)%22 opacity=%220.35%22/%3E%3C/svg%3E')]" />
        {/* Bottom fade */}
        <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-white to-transparent" />
      </div>

      {/* Header (ثابت أعلى الصفحة + غير شفاف) */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-[hsl(var(--gold-strong))] flex items-center justify-center shadow-sm">
                <Layers className="h-5 w-5 text-white" />
              </div>
              <div className="leading-none">
                <div className="text-sm font-black text-slate-900">
                  مدارس <span className="text-[hsl(var(--gold-strong))] italic">الفلاح</span>
                </div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Smart School OS • 2.0
                </div>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-7 text-sm font-bold text-slate-700">
              <a href="#why" className="hover:text-[hsl(var(--gold-strong))] transition-colors">
                لماذا؟
              </a>
              <a href="#features" className="hover:text-[hsl(var(--gold-strong))] transition-colors">
                المميزات
              </a>
              <a href="#roles" className="hover:text-[hsl(var(--gold-strong))] transition-colors">
                الأدوار
              </a>
              <a href="#faq" className="hover:text-[hsl(var(--gold-strong))] transition-colors">
                الأسئلة
              </a>
            </nav>

            <div className="flex items-center gap-3">
              <Link
                href={primaryCtaHref}
                className="inline-flex items-center gap-2 rounded-2xl bg-[hsl(var(--gold-strong))] px-5 py-2.5 text-sm font-black text-foreground shadow-sm hover:bg-[hsl(var(--gold))] transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                {primaryCtaText}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 pt-24 pb-16">
        <div className="grid lg:grid-cols-12 gap-10 items-center">
          {/* Copy */}
          <div className="lg:col-span-6 space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 backdrop-blur px-4 py-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold uppercase tracking-widest text-slate-600">
                Next Generation Education
              </span>
            </div>

            <h1 className="text-4xl md:text-6xl font-black leading-[1.08] tracking-tight">
              <span className="text-slate-900">ذكاء </span>
              <span className="text-[hsl(var(--gold-strong))]">القرار</span>
              <br />
              <span className="text-slate-600">بنظام يعشق البيانات</span>
            </h1>

            <p className="text-lg md:text-xl font-medium text-slate-600 leading-relaxed max-w-xl">
              منصة تشغيل مدرسية ذكية تجمع البيانات، تفسّرها، وتحوّلها إلى لوحات قرار واضحة… للقيادة، للمعلمين، ولأولياء الأمور.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Link
                href={primaryCtaHref}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[hsl(var(--gold-strong))] px-7 py-4 text-white font-black text-lg shadow-sm hover:bg-[hsl(var(--gold))] transition-colors"
              >
                {primaryCtaText}
                <ArrowUpRight className="h-5 w-5" />
              </Link>

              <a
                href="#why"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white/60 backdrop-blur px-7 py-4 font-black text-lg text-slate-900 hover:bg-white/80 transition-colors"
              >
                تعرف على آلية العمل
              </a>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
              {[
                { k: "+1200", t: "طالب" },
                { k: "24/7", t: "توافريّة" },
                { k: "RLS", t: "حماية" },
                { k: "+50", t: "مؤشر" },
              ].map((x) => (
                <div
                  key={x.t}
                  className="rounded-2xl border border-slate-200 bg-white/70 backdrop-blur px-4 py-3 shadow-sm"
                >
                  <div className="text-xl font-black text-slate-900">{x.k}</div>
                  <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mt-1">
                    {x.t}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Visual (بطاقات صلبة + بدون زجاج) */}
          <div className="lg:col-span-6">
            <div className="relative">
              <div className="absolute -inset-6 rounded-[3rem] bg-gradient-to-br from-[hsla(var(--gold),.20)] to-stone-200/40 blur-3xl opacity-70" />

              <div className="relative rounded-[2.75rem] border border-slate-200 bg-white shadow-2xl p-6 md:p-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-[hsl(var(--gold-strong),0.05)] border border-[hsla(var(--gold),.20)] flex items-center justify-center">
                      <LineChart className="h-5 w-5 text-[hsl(var(--gold-strong))]" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-slate-900">لوحة القرار</div>
                      <div className="text-[11px] font-bold text-slate-500 mt-1">ملخص الأداء — هذا الأسبوع</div>
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-600">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    جاهز للعمل
                  </div>
                </div>

                <div className="mt-6 grid md:grid-cols-2 gap-4">
                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-black text-slate-900">الانضباط</div>
                      <Gauge className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="mt-4">
                      <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full w-[82%] bg-emerald-400" />
                      </div>
                      <div className="mt-2 flex justify-between text-[11px] font-bold text-slate-500">
                        <span>82%</span>
                        <span>ممتاز</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-black text-slate-900">التحصيل</div>
                      <Activity className="h-4 w-4 text-[hsl(var(--gold-strong))]" />
                    </div>
                    <div className="mt-4">
                      <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full w-[67%] bg-[hsl(var(--gold))]" />
                      </div>
                      <div className="mt-2 flex justify-between text-[11px] font-bold text-slate-500">
                        <span>67%</span>
                        <span>قابل للتحسين</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-black text-slate-900">إنذارات مبكرة</div>
                      <Zap className="h-4 w-4 text-emerald-600" />
                    </div>

                    <div className="mt-4 space-y-3">
                      {[
                        { a: "3 طلاب", b: "انخفاض ملحوظ في الأداء", c: "اقترح خطة علاجية" },
                        { a: "1 صف", b: "غياب مرتفع هذا الأسبوع", c: "ارسال تنبيه للمرشد" },
                        { a: "2 مواد", b: "تفاوت كبير بين الشعب", c: "تحليل أسباب التباين" },
                      ].map((r, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-black text-slate-900">
                              {r.a} — <span className="text-slate-600 font-bold">{r.b}</span>
                            </div>
                            <div className="text-[11px] font-bold text-slate-500 mt-1">{r.c}</div>
                          </div>
                          <div className="h-9 w-9 rounded-2xl bg-[hsl(var(--gold-strong),0.05)] border border-[hsla(var(--gold),.20)] flex items-center justify-center">
                            <ArrowUpRight className="h-4 w-4 text-[hsl(var(--gold-strong))]" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-3">
                  {miniBadges.map((x) => (
                    <div
                      key={x.t}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-center gap-2"
                    >
                      {x.icon}
                      <span className="text-[11px] font-black text-slate-600">{x.t}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 text-center text-[11px] font-bold text-slate-500">(عرض تجريبي للواجهة)</div>
            </div>
          </div>
        </div>
      </section>

      {/* Why */}
      <section id="why" className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 space-y-4">
            <div className="text-xs font-black uppercase tracking-[0.3em] text-[hsl(var(--gold-strong))]">
              Why it matters
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight">
              تقارير كثيرة… <span className="text-[hsl(var(--gold-strong))]">لكن قرار واحد</span> هو اللي يفرق
            </h2>
            <p className="text-lg font-medium text-slate-600 leading-relaxed">
              بدل ما تضيع وقتك بين ملفات، نماذج، وواتساب… النظام يلمّ كل شيء في مكان واحد ويعطيك الصورة اللي تحتاجها الآن.
            </p>
          </div>

          <div className="lg:col-span-7 grid md:grid-cols-2 gap-4">
            {whyCards.map((x) => (
              <div
                key={x.title}
                className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm hover:border-[hsla(var(--gold),.50)] transition-colors"
              >
                <div className="h-12 w-12 rounded-2xl bg-[hsl(var(--gold-strong),0.05)] border border-[hsla(var(--gold),.20)] flex items-center justify-center">
                  {x.icon}
                </div>
                <div className="mt-5 text-lg font-black text-slate-900">{x.title}</div>
                <div className="mt-2 text-sm font-medium text-slate-600 leading-relaxed">{x.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 border-y border-slate-200 bg-white/60 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-end justify-between gap-6 flex-wrap">
            <div className="space-y-3">
              <div className="text-xs font-black uppercase tracking-[0.3em] text-emerald-600">Features</div>
              <h2 className="text-3xl md:text-4xl font-black text-slate-900">
                تصميم UX حديث… <span className="text-emerald-700">موجه للسرعة</span>
              </h2>
            </div>
            <Link
              href={primaryCtaHref}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 font-black text-sm text-slate-900 hover:border-[hsla(var(--gold),.50)] transition-colors shadow-sm"
            >
              جرّب الآن
              <ArrowUpRight className="h-4 w-4 text-[hsl(var(--gold-strong))]" />
            </Link>
          </div>

          <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {featureCards.map((x) => (
              <div key={x.title} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                    {x.icon}
                  </div>
                  <div className="text-lg font-black text-slate-900">{x.title}</div>
                </div>
                <div className="mt-3 text-sm font-medium text-slate-600 leading-relaxed">{x.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section id="roles" className="mx-auto max-w-7xl px-6 py-16">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="text-xs font-black uppercase tracking-[0.3em] text-[hsl(var(--gold-strong))]">
            Ecosystem
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900">
            نظام واحد… <span className="text-[hsl(var(--gold-strong))]">لجميع الأدوار</span>
          </h2>
        </div>

        <div className="mt-10 grid md:grid-cols-3 gap-4">
          <div className="rounded-[2.25rem] border border-slate-200 bg-white p-7 shadow-sm">
            <Users className="h-10 w-10 text-[hsl(var(--gold-strong))]" />
            <div className="mt-5 text-2xl font-black text-slate-900">القيادة المدرسية</div>
            <p className="mt-3 text-sm font-medium text-slate-600 leading-relaxed">
              نظرة شاملة، مؤشرات لحظية، وقرارات مدعومة بالبيانات.
            </p>
            <ul className="mt-5 space-y-2 text-sm font-bold text-slate-600">
              {["مؤشرات الأداء", "مصفوفة المخاطر", "تقارير الإدارة"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[hsl(var(--gold-strong))]" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[2.25rem] border border-[hsl(var(--gold),.50)] bg-[hsl(var(--gold-strong))] text-white p-7 shadow-2xl shadow-[hsla(var(--gold),.20)] md:-translate-y-2">
            <Users className="h-10 w-10 text-white" />
            <div className="mt-5 text-2xl font-black">المعلمين</div>
            <p className="mt-3 text-sm font-medium text-foreground/85 leading-relaxed">
              تقليل العبء الإداري، متابعة دقيقة، وتركيز على التعليم.
            </p>
            <ul className="mt-5 space-y-2 text-sm font-bold text-stone-700">
              {["رصد سريع", "خطط علاجية", "تنبيهات مبكرة"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[2.25rem] border border-slate-200 bg-white p-7 shadow-sm">
            <Heart className="h-10 w-10 text-emerald-700" />
            <div className="mt-5 text-2xl font-black text-slate-900">أولياء الأمور</div>
            <p className="mt-3 text-sm font-medium text-slate-600 leading-relaxed">
              متابعة لحظية وتواصل واضح يرفع جودة الشراكة.
            </p>
            <ul className="mt-5 space-y-2 text-sm font-bold text-slate-600">
              {["متابعة الحضور", "تقارير التحصيل", "قناة تواصل"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16 border-t border-slate-200 bg-white/60 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-3xl space-y-3">
            <div className="text-xs font-black uppercase tracking-[0.3em] text-emerald-600">FAQ</div>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900">أسئلة سريعة</h2>
          </div>

          <div className="mt-10 grid md:grid-cols-2 gap-4">
            {[
              {
                q: "هل الواجهة تعتمد على صور وهمية؟",
                a: "لا. هذا نموذج بصري فقط داخل الصفحة الرئيسية. يمكن استبداله بلقطة حقيقية فورًا.",
              },
              {
                q: "هل الأمان جزء أساسي؟",
                a: "نعم. التصميم مبني حول صلاحيات دقيقة وRLS حتى ما يختلط وصول الأدوار.",
              },
              {
                q: "هل يتغير زر الدخول حسب المستخدم؟",
                a: "نعم. إذا أنت مسجل دخول يوديك للبوابة، وإذا لا يوديك لتسجيل الدخول.",
              },
              {
                q: "هل يمكن تبسيط الصفحة أكثر؟",
                a: "نعم. هذه نسخة حديثة ومتوازنة، ويمكن تقليل الأقسام حسب رغبتك.",
              },
            ].map((x) => (
              <details key={x.q} className="group rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-4">
                  <div className="text-sm md:text-base font-black text-slate-900">{x.q}</div>
                  <div className="h-9 w-9 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center group-open:border-[hsla(var(--gold),.50)] transition-colors">
                    <ArrowUpRight className="h-4 w-4 text-slate-500 group-open:text-[hsl(var(--gold-strong))] transition-colors" />
                  </div>
                </summary>
                <div className="mt-4 text-sm font-medium text-slate-600 leading-relaxed">{x.a}</div>
              </details>
            ))}
          </div>

          <div className="mt-12 rounded-[2.5rem] border border-slate-200 bg-white p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
            <div className="space-y-2">
              <div className="text-lg font-black text-slate-900">جاهز تنقل الصفحة لمستوى “منصة” فعلاً؟</div>
              <div className="text-sm font-medium text-slate-600">ادخل للنظام أو جرّب التدفق من بوابة الأدوار.</div>
            </div>
            <Link
              href={primaryCtaHref}
              className="inline-flex items-center gap-2 rounded-2xl bg-[hsl(var(--gold-strong))] px-6 py-3 text-sm font-black text-foreground shadow-sm hover:bg-[hsl(var(--gold))] transition-colors"
            >
              {primaryCtaText}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10">
        <div className="mx-auto max-w-7xl px-6">
          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-500 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-widest">
              © {year} AL FALAH SCHOOLS • SMART SCHOOL OS
            </div>
            <div className="flex gap-5 text-sm font-bold">
              <Link href="#" className="hover:text-[hsl(var(--gold-strong))] transition-colors">
                الخصوصية
              </Link>
              <Link href="#" className="hover:text-[hsl(var(--gold-strong))] transition-colors">
                الشروط
              </Link>
              <Link href="#" className="hover:text-[hsl(var(--gold-strong))] transition-colors">
                الدعم الفني
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}