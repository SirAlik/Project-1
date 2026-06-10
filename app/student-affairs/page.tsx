"use client";

import React, { useState, startTransition } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  ClipboardCheck,
  ShieldAlert,
  BookOpen,
  Users,
  Settings,
  Bell,
  ChevronRight,
  X,
  Signature,
  CheckCircle,
  AlertTriangle,
  MoreVertical
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

type Tab = "dashboard" | "attendance" | "referrals" | "assets" | "profiles" | "contracts";
type Role = "vp" | "counselor";

export default function StudentAffairsPage() {
  const { state, actions } = useStudentAffairs();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [role, setRole] = useState<Role>("vp");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isKnightsOpen, setIsKnightsOpen] = useState(false);

  const selectedStudent = state.students.find(s => s.id === selectedStudentId);

  // If role is VP and they were on a counselor tab, switch to dashboard
  React.useEffect(() => {
    if (role === "vp" && tab === "referrals") {
      startTransition(() => setTab("dashboard"));
    }
  }, [role, tab]);

  const canonicalRole =
    role === "counselor"
      ? "student_counselor"
      : "student_affairs_vp";

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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-4">
              <div className="glass-panel rounded-2xl p-4">
                <h3 className="text-xs font-bold opacity-60 uppercase tracking-widest mb-4 px-2">دليل الطلاب</h3>
                <div className="space-y-1">
                  {state.students.map(s => (
                    <div
                      key={s.id}
                      onClick={() => setSelectedStudentId(s.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer ${selectedStudentId === s.id ? "bg-[var(--primary)] text-white shadow-lg" : "hover:bg-[var(--glass-bg)] opacity-60"}`}
                    >
                      <div className="flex items-center gap-3">
                        <button className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors" aria-label="خيارات إضافية">
                          <MoreVertical size={20} />
                        </button>
                        <div className="text-right">
                          <p className="text-xs font-bold">{s.name}</p>
                          <p className="text-[8px] opacity-60 uppercase">{s.student_id}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-3 h-3" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="lg:col-span-2">
              {selectedStudent ? (
                <StudentProfileCard
                  student={selectedStudent}
                  onUpdate={actions.updateProfile}
                />
              ) : (
                <div className="h-full flex items-center justify-center glass-panel border-dashed rounded-3xl py-20 opacity-40">
                  <p className="font-bold uppercase tracking-widest">اختر طالباً لعرض التفاصيل</p>
                </div>
              )}
            </div>
          </div >
        );
      case "contracts":
        return selectedStudentId ? (
          <ContractSigner
            student={selectedStudent!}
            contracts={state.contracts}
            onSign={actions.signContract}
          />
        ) : (
          <div className="h-full flex items-center justify-center glass-panel border-dashed rounded-3xl py-20 opacity-40">
            <p className="font-bold uppercase tracking-widest">اختر طالباً أولاً لإدارة التوقيعات</p>
          </div>
        );
      default:
        return (
          <div className="space-y-8">
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
    <main className="min-h-screen pb-32 text-[var(--text)]">
      <DisciplineKnightsModal
        isOpen={isKnightsOpen}
        onClose={() => setIsKnightsOpen(false)}
        userRole={canonicalRole}
      />

      {/* Futuristic Header */}
      <header className="sticky top-0 z-40 glass-panel border-b px-8 py-5">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div className="flex items-center gap-5">
            <div className="relative group">
              <div className="absolute inset-0 bg-[var(--primary)] blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
              <div className="relative w-12 h-12 bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] rounded-2xl flex items-center justify-center shadow-lg">
                <LayoutDashboard className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--primary)]">
                شؤون الطلاب
              </h1>
              <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest mt-0.5">SMART SCHOOL OS • VISION 2030</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsKnightsOpen(true)}
              className="flex items-center gap-3 glass-card px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:border-[var(--primary)] transition-all group"
            >
              <LayoutDashboard className="w-4 h-4 text-[var(--primary)] group-hover:rotate-12 transition-transform" />
              فرسان الانضباط
            </button>

            <div className="flex glass-panel p-1 rounded-2xl">
              <button
                onClick={() => setRole("vp")}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase transition-all ${role === "vp" ? "bg-[var(--primary)] text-white shadow-lg" : "opacity-60 hover:opacity-100"}`}
              >
                وكيل الشؤون
              </button>
              <button
                onClick={() => setRole("counselor")}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase transition-all ${role === "counselor" ? "bg-[var(--primary)] text-white shadow-lg" : "opacity-60 hover:opacity-100"}`}
              >
                الموجه الطلابي
              </button>
            </div>

            <div className="w-11 h-11 rounded-2xl glass-card flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity cursor-pointer">
              <Bell className="w-5 h-5" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-8">
        {state.msg && (
          <div className={`mb-8 p-4 rounded-2xl glass-panel border flex items-center gap-3 animate-in fade-in slide-in-from-top-4 ${state.msg.type === "error" ? "border-destructive/20 text-destructive" : "border-primary/20 text-primary"}`}>
            {state.msg.type === "error" ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
            <p className="text-xs font-bold">{state.msg.text}</p>
            <button onClick={() => actions.setMsg(null)} className="ml-auto opacity-50 hover:opacity-100" aria-label="إغلاق التنبيه">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="glass-panel rounded-[2.5rem] p-10 min-h-[600px] relative overflow-hidden">
          <div className="relative z-10">
            {renderTab()}
          </div>
        </div>
      </div>

      {/* Floating Navigator */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <nav className="glass-panel px-4 py-3 rounded-full shadow-2xl flex items-center gap-2 border border-[var(--glass-border)]">
          <NavBtn active={tab === "dashboard"} onClick={() => setTab("dashboard")} icon={LayoutDashboard} label="الرئيسية" />
          <div className="w-px h-8 opacity-10 bg-current mx-1" />
          <Link href="/student-affairs/attendance" className="group relative flex flex-col items-center justify-center w-14 h-14 rounded-full transition-all duration-300 opacity-40 hover:opacity-100">
            <ClipboardCheck className="w-5 h-5 transition-transform group-hover:scale-110" />
            <div className="absolute bottom-full mb-5 px-3 py-2 rounded-xl glass-panel opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 pointer-events-none transition-all shadow-2xl border border-[var(--glass-border)]">
              <p className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">الحضور</p>
            </div>
          </Link>

          {role === "counselor" && (
            <NavBtn active={tab === "referrals"} onClick={() => setTab("referrals")} icon={ShieldAlert} label="الإحالات" />
          )}

          <NavBtn active={tab === "assets"} onClick={() => setTab("assets")} icon={BookOpen} label="العهد" />
          <NavBtn active={tab === "profiles"} onClick={() => setTab("profiles")} icon={Users} label="السجلات" />
          <NavBtn active={tab === "contracts"} onClick={() => setTab("contracts")} icon={Signature} label="التوقيعات" />
          <div className="w-px h-8 opacity-10 bg-current mx-1" />
          <NavBtn active={false} onClick={() => { }} icon={Settings} label="الإعدادات" />
        </nav>
      </div>
    </main>
  );
}

function NavBtn({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col items-center justify-center w-14 h-14 rounded-full transition-all duration-300 ${active ? "bg-[var(--primary)] text-white shadow-xl" : "opacity-40 hover:opacity-100"}`}
    >
      <Icon className={`w-5 h-5 transition-transform ${active ? "scale-110" : "group-hover:scale-110"}`} />

      <div className="absolute bottom-full mb-5 px-3 py-2 rounded-xl glass-panel opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 pointer-events-none transition-all shadow-2xl border border-[var(--glass-border)]">
        <p className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">{label}</p>
      </div>

      {active && (
        <div className="absolute -bottom-1.5 w-1.5 h-1.5 bg-background rounded-full shadow-[0_0_8px_hsl(var(--primary))]" />
      )}
    </button>
  );
}