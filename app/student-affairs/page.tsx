"use client";

import React, { useState, startTransition } from "react";
import {
  LayoutDashboard,
  ShieldAlert,
  BookOpen,
  Users,
  X,
  Signature,
  CheckCircle,
  AlertTriangle,
  Trophy,
  ChevronLeft,
  MoreVertical,
} from "lucide-react";
import { useStudentAffairs } from "./_hooks/useStudentAffairs";
import { AttendanceBoard } from "./_components/AttendanceBoard";
import { AssetTracker } from "./_components/AssetTracker";
import { StudentProfileCard } from "./_components/StudentProfileCard";
import { ContractSigner } from "./_components/ContractSigner";
import { CounselorWorkbench } from "./_components/CounselorWorkbench";
import { DisciplineKnightsModal } from "@/components/operations/DisciplineKnightsModal";
import { StudentAffairsDashboard } from "./_components/StudentAffairsDashboard";
import { AIInsightCard } from "@/components/ai/AIInsightCard";
import { PageHeader, DashboardSection, EmptyState, SegmentedTabs, type SegmentedTab } from "@/components/dashboard";

type Tab = "dashboard" | "attendance" | "referrals" | "assets" | "profiles" | "contracts";
type Role = "vp" | "counselor";

export default function StudentAffairsPage() {
  const { state, actions } = useStudentAffairs();
  const [tab, setTab] = useState<Tab>("dashboard");
  // هذه صفحة وكيل شؤون الطلاب (student_affairs_vp). أُزيل مبدّل المنظور (وكيل/مرشد) من الصفحة —
  // المنظور يساوي دور الـ persona الفعلي فقط؛ لا تبديل أدوار داخل الصفحة (الموجه الطلابي له صفحته /counselor).
  // يبقى role ثابتاً على "vp" بلا مُبدِّل؛ فروع المرشد محفوظة كمسار خامل دون حذف منطق.
  const [role] = useState<Role>("vp");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isKnightsOpen, setIsKnightsOpen] = useState(false);

  const selectedStudent = state.students.find(s => s.id === selectedStudentId);

  // إن كان الدور وكيلاً وكان على تبويب المرشد (الإحالات) → عُد للوحة
  React.useEffect(() => {
    if (role === "vp" && tab === "referrals") {
      startTransition(() => setTab("dashboard"));
    }
  }, [role, tab]);

  const canonicalRole = role === "counselor" ? "student_counselor" : "student_affairs_vp";

  // التبويبات داخل الصفحة (الإحالات للمرشد فقط) — الحضور اليومي مساره مستقل عبر الشريط الجانبي للصدفة
  const tabs: SegmentedTab<Tab>[] = [
    { id: "dashboard", label: "الرئيسية", icon: LayoutDashboard },
    ...(role === "counselor" ? ([{ id: "referrals", label: "الإحالات", icon: ShieldAlert }] as SegmentedTab<Tab>[]) : []),
    { id: "assets", label: "العهد", icon: BookOpen },
    { id: "profiles", label: "السجلات", icon: Users },
    { id: "contracts", label: "التوقيعات", icon: Signature },
  ];

  const renderTab = () => {
    switch (tab) {
      case "attendance":
        return (
          <AttendanceBoard
            students={state.students}
            attendance={state.attendance}
            onMark={actions.markAttendance}
            onRecordExit={actions.recordExit}
          />
        );
      case "referrals":
        return (
          <CounselorWorkbench
            referrals={state.referrals}
            onResolve={actions.resolveReferral}
          />
        );
      case "assets":
        return (
          <AssetTracker
            students={state.students}
            assets={state.assets}
            onIssue={actions.issueAsset}
            onReturn={actions.returnAsset}
          />
        );
      case "profiles":
        return (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <DashboardSection title="دليل الطلاب" icon={Users}>
                <div className="space-y-1">
                  {state.students.map(s => {
                    const active = selectedStudentId === s.id;
                    return (
                      <div
                        key={s.id}
                        onClick={() => setSelectedStudentId(s.id)}
                        className={`flex w-full cursor-pointer items-center justify-between rounded-xl border p-3 transition-colors ${active ? "border-primary/30 bg-primary/10 text-primary" : "border-transparent text-foreground hover:bg-muted"}`}
                      >
                        <div className="flex items-center gap-3">
                          <button className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="خيارات إضافية">
                            <MoreVertical size={18} />
                          </button>
                          <div className="text-right">
                            <p className="text-xs font-bold">{s.name}</p>
                            <p className="text-[10px] text-muted-foreground">{s.student_id}</p>
                          </div>
                        </div>
                        <ChevronLeft className="h-3.5 w-3.5 shrink-0" />
                      </div>
                    );
                  })}
                </div>
              </DashboardSection>
            </div>
            <div className="lg:col-span-2">
              {selectedStudent ? (
                <StudentProfileCard
                  student={selectedStudent}
                  onUpdate={actions.updateProfile}
                />
              ) : (
                <EmptyState icon={Users} title="اختر طالباً لعرض التفاصيل" hint="حدّد طالباً من دليل الطلاب لعرض ملفه وإدارته." />
              )}
            </div>
          </div>
        );
      case "contracts":
        return selectedStudentId ? (
          <ContractSigner
            student={selectedStudent!}
            contracts={state.contracts}
            onSign={actions.signContract}
          />
        ) : (
          <EmptyState icon={Signature} title="اختر طالباً أولاً لإدارة التوقيعات" hint="حدّد طالباً من تبويب «السجلات» ثم عُد لإدارة توقيعاته." />
        );
      default:
        return (
          <div className="space-y-6">
            <AIInsightCard
              contextType="attendance_analysis"
              title="الرؤية الذكية — شؤون الطلاب"
            />
            <StudentAffairsDashboard
              students={state.students}
              attendance={state.attendance}
              referrals={state.referrals}
              stats={state.stats}
              role={role}
            />
          </div>
        );
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <DisciplineKnightsModal
        isOpen={isKnightsOpen}
        onClose={() => setIsKnightsOpen(false)}
        userRole={canonicalRole}
      />

      <PageHeader
        icon={Users}
        title="شؤون الطلاب"
        subtitle="الحضور والسلوك والإحالات والعهد الطلابية في مكان واحد."
        actions={
          <button
            onClick={() => setIsKnightsOpen(true)}
            className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2.5 text-xs font-bold text-foreground transition-colors hover:bg-muted"
          >
            <Trophy className="h-4 w-4 text-primary" /> فرسان الانضباط
          </button>
        }
      />

      <SegmentedTabs tabs={tabs} active={tab} onChange={setTab} />

      {state.msg && (
        <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-bold ${state.msg.type === "error" ? "border-destructive/20 bg-destructive/10 text-destructive" : "border-primary/20 bg-primary/5 text-primary"}`}>
          {state.msg.type === "error" ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
          <p>{state.msg.text}</p>
          <button onClick={() => actions.setMsg(null)} className="mr-auto text-muted-foreground transition-colors hover:text-foreground" aria-label="إغلاق التنبيه">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {renderTab()}
    </div>
  );
}
