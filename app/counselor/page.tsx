"use client";

import React, { useState } from "react";
import { useCounselor } from "./_hooks/useCounselor";
import { TabBtn } from "./_components/CounselorTabs";
import { CaseList } from "./_components/CaseList";
import { SessionList } from "./_components/SessionList";
import { QualityForms } from "./_components/QualityForms";
import { KPICard } from "@/components/ui/KPICard";
import { TabKey } from "@/lib/types/counselor";
import { DisciplineKnightsModal } from "@/components/admin/DisciplineKnightsModal";
import {
  Trophy, ShieldCheck, PieChart, BookOpen,
  ClipboardCheck, LayoutDashboard, RefreshCw
} from "lucide-react";
import { AIInsightCard } from "@/components/ai/AIInsightCard";

export default function CounselorPage() {
  const { state, helpers, actions } = useCounselor();
  const [tab, setTab] = useState<TabKey | "approvals" | "analytics">("المعاملات");
  const [isKnightsOpen, setIsKnightsOpen] = useState(false);

  const { msg, loading, user, currentUserName } = state;

  return (
    <main className="min-h-screen text-[var(--text)] font-sans" dir="rtl">
      <div className="relative z-10 mx-auto max-w-7xl px-6 py-8">
        <header className="mb-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-[var(--primary)]">
                واجهة الموجه الطلابي
              </h1>
              <p className="mt-1 text-sm opacity-60">
                أهلاً، {currentUserName ?? "الموجه"} • لوحة تحكم إرشادية ذكية
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsKnightsOpen(true)}
                className="flex items-center gap-2 bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 text-[var(--accent)] border border-[var(--accent)]/20 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg"
              >
                <Trophy className="w-4 h-4" /> فرسان الانضباط
              </button>

              <button
                onClick={actions.reloadAll}
                className="btn-glass p-2.5 rounded-xl glass-card flex items-center justify-center hover:text-[var(--primary)] transition-all"
                title="تحديث"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={() => (window.location.href = "/classroom")}
                className="btn-primary"
              >
                رجوع للكلاسروم
              </button>
            </div>
          </div>

          {msg && (
            <div className="mt-6 p-4 rounded-xl glass-panel border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm animate-in fade-in slide-in-from-top-2">
              {msg}
            </div>
          )}
        </header>

        {state.stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <KPICard title="الحالات النشطة" value={state.stats.activeCases} color="rose" trend="up" />
            <KPICard title="جلسات هذا الشهر" value={state.stats.sessionsThisMonth} color="blue" />
            <KPICard title="الاعتمادات المعلقة" value={state.stats.pendingReports} color="amber" />
            <KPICard title="إجمالي المعاملات" value={state.stats.totalCases} color="primary" />
          </div>
        )}

        {/* AI Insight */}
        <div className="mb-8">
          <AIInsightCard contextType="behavior_pattern" title="الرؤية الذكية — التوجيه الطلابي" />
        </div>

        <section className="mb-8 p-1.5 rounded-2xl glass-panel w-fit">
          <div className="flex flex-wrap gap-1">
            <TabBtn active={tab === "المعاملات"} onClick={() => setTab("المعاملات")} icon={<LayoutDashboard className="w-4 h-4" />}>المعاملات</TabBtn>
            <TabBtn active={tab === "الجلسات"} onClick={() => setTab("الجلسات")} icon={<BookOpen className="w-4 h-4" />}>الجلسات</TabBtn>
            <TabBtn active={tab === "quality"} onClick={() => setTab("quality")} icon={<ClipboardCheck className="w-4 h-4" />}>نماذج الجودة</TabBtn>
            <TabBtn active={tab === "approvals"} onClick={() => setTab("approvals")} icon={<ShieldCheck className="w-4 h-4" />}>
              الاعتمادات
              {state.stats.pendingReports > 0 && (
                <span className="mr-2 bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full animate-pulse">
                  {state.stats.pendingReports}
                </span>
              )}
            </TabBtn>
            <TabBtn active={tab === "analytics"} onClick={() => setTab("analytics")} icon={<PieChart className="w-4 h-4" />}>التحليلات</TabBtn>
          </div>
        </section>

        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          {tab === "المعاملات" && (
            <CaseList
              cases={state.cases}
              studentsList={state.studentsList}
              classesList={state.classesList}
              studentNameById={helpers.studentNameById}
              classNameById={helpers.classNameById}
              createCaseManual={actions.createCaseManual}
            />
          )}

          {tab === "الجلسات" && (
            <SessionList
              sessions={state.sessions}
              studentsList={state.studentsList}
              classesList={state.classesList}
              studentNameById={helpers.studentNameById}
              classNameById={helpers.classNameById}
              addSession={actions.addSession}
            />
          )}

          {tab === "quality" && (
            <QualityForms
              studentsList={state.studentsList}
              classesList={state.classesList}
              cases={state.cases}
              getAbsenceCount={helpers.getAbsenceCount}
              user={user ?? undefined}
              userName={currentUserName}
            />
          )}
        </div>
      </div>

      <DisciplineKnightsModal
        isOpen={isKnightsOpen}
        onClose={() => setIsKnightsOpen(false)}
        userRole="student_counselor"
      />
    </main>
  );
}

