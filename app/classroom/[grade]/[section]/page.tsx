"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import {
    ChevronRight, Users, AlertCircle, Clock,
    BookOpen, GraduationCap, HeartPulse, Eye, CheckCircle, Play, Save,
    RotateCcw, Grid3X3, LayoutGrid
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { LRCBookingModal } from "@/components/admin/LRCBookingModal";
import { useLRC } from "@/app/lrc/_hooks/useLRC";
import { useClassroom } from "../../_hooks/useClassroom";
import type { EventType } from "@/lib/types/classroom";
import { EventButtons } from "../../_components/EventButtons";
import { StarSelector } from "../../_components/StarSelector";
import { StudentLog } from "../../_components/StudentLog";
import { ReferralModal } from "../../_components/ReferralModal";
import { ExcuseModal } from "../../_components/ExcuseModal";
import { ToolsWidget } from "../../_components/ToolsWidget";
import { RandomPicker } from "../../_components/RandomPicker";
import { GroupTool } from "../../_components/GroupTool";
import { GradebookDrawer } from "../../_components/GradebookDrawer";
import { SeatingChart } from "../../_components/SeatingChart";
import { ParentNoteModal } from "../../_components/ParentNoteModal";
import { BadgesModal } from "../../_components/BadgesModal";

export default function ClassDetailsPage() {
    const params = useParams();
    const grade = params?.grade;
    const section = params?.section;

    const { state: lrcState, actions: lrcActions } = useLRC();
    const { state, actions } = useClassroom();

    const [currentLesson, setCurrentLesson] = useState("");
    const [viewMode, setViewMode] = useState<"list" | "map">("list");
    const [isLrcModalOpen, setIsLrcModalOpen] = useState(false);

    // Animation triggers
    const [animatingIds, setAnimatingIds] = useState<Record<string, 'reward' | 'penalty' | null>>({});

    const handleAddEvent = (type: string) => {
        const note = currentLesson ? `[مرتبط بدرس: ${currentLesson}]` : "";

        // Trigger animations before/during action
        const nextAnims = { ...animatingIds };
        const isReward = ["شارك اليوم", "تفكير إبداعي", "مبادرة/قيادة", "التزام وانضباط", "تميز ملحوظ"].includes(type);

        state.selectedStudentIds.forEach(id => {
            nextAnims[id] = isReward ? 'reward' : 'penalty';
        });
        setAnimatingIds(nextAnims);

        actions.addEvent(type as EventType, note, isReward ? 1 : -1, isReward ? 'reward' : 'penalty');

        // Clear animations after 1s
        setTimeout(() => {
            setAnimatingIds(prev => {
                const updated = { ...prev };
                state.selectedStudentIds.forEach(id => {
                    delete updated[id];
                });
                return updated;
            });
        }, 1000);
    };

    return (
        <main className="min-h-screen text-[var(--text)] p-8 font-sans bg-[var(--bg)] relative overflow-hidden" dir="rtl">
            {/* Background Grain */}
            <div className="fixed inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

            <div className="max-w-7xl mx-auto relative z-10">
                <header className="mb-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 glass-panel p-6 rounded-3xl border border-stone-200">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] rounded-2xl flex items-center justify-center shadow-lg shadow-[var(--primary)]/20">
                            <GraduationCap className="text-white w-7 h-7 icon-morph" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Link href="/classroom" className="text-[10px] font-black opacity-40 hover:opacity-100 transition-opacity uppercase tracking-widest text-stone-500">
                                    الفصول
                                </Link>
                                <ChevronRight className="w-3 h-3 opacity-20" />
                                <span className="text-[10px] font-black text-[var(--accent)] uppercase tracking-widest">فصل {grade}/{section}</span>
                            </div>
                            <h1 className="text-2xl font-black tracking-tight text-white uppercase">
                                لوحة التحكم الذكية
                            </h1>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200 mr-4">
                            <button
                                onClick={() => setViewMode("list")}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${viewMode === 'list' ? 'bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20' : 'text-stone-500 hover:text-foreground'}`}
                            >
                                <Users className="w-3 h-3 inline ml-1" /> قائمة
                            </button>
                            <button
                                onClick={() => setViewMode("map")}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${viewMode === 'map' ? 'bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20' : 'text-stone-500 hover:text-foreground'}`}
                            >
                                <Grid3X3 className="w-3 h-3 inline ml-1" /> خريطة
                            </button>
                        </div>

                        <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl border border-stone-200">
                            <BookOpen className="w-4 h-4 text-[var(--primary)]" />
                            <select
                                className="bg-transparent text-[10px] font-black outline-none uppercase tracking-widest text-stone-500 disabled:cursor-not-allowed"
                                value={currentLesson}
                                onChange={(e) => setCurrentLesson(e.target.value)}
                                disabled
                                aria-label="الدرس الحالي"
                            >
                                <option value="">لم يتم ربط الدروس بعد</option>
                            </select>
                        </div>

                        {!state.classStarted ? (
                            <button
                                onClick={actions.startClass}
                                className="bg-[var(--primary)] hover:brightness-110 active:scale-95 text-white px-6 py-2.5 rounded-xl text-xs font-black transition-all shadow-lg shadow-[var(--primary)]/20 flex items-center gap-2"
                            >
                                <Play className="w-4 h-4 fill-current" /> بدء الحصة
                            </button>
                        ) : (
                            <button
                                onClick={actions.saveAttendance}
                                disabled={state.savingAttendance}
                                className="bg-[var(--primary)] hover:brightness-110 active:scale-95 text-white px-6 py-2.5 rounded-xl text-xs font-black transition-all shadow-lg shadow-[var(--primary)]/20 flex items-center gap-2"
                            >
                                {state.savingAttendance ? "جاري الحفظ..." : <><Save className="w-4 h-4" /> اعتماد الحضور</>}
                            </button>
                        )}

                        <Link
                            href={`/classroom/analytics?grade=${grade}&section=${section}`}
                            className="bg-[var(--primary)]/10 hover:bg-[var(--primary)] border border-[var(--primary)]/20 text-[var(--primary)] hover:text-foreground px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-lg hover:shadow-[var(--primary)]/20"
                        >
                            <LayoutGrid className="w-4 h-4" /> تحليل أداء الفصل
                        </Link>
                    </div>
                </header>

                <div className="grid lg:grid-cols-12 gap-8">
                    {/* Left Column: Events & Stars */}
                    <div className="lg:col-span-4 space-y-8">
                        <Card title="الإجراءات والنجوم" className="overflow-hidden border-stone-200 bg-white/80">
                            <div className="mb-8 p-6 rounded-2xl bg-white/80 border border-stone-200">
                                <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-3 text-stone-500">الطالب المختار حالياً</p>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] font-black text-xl border border-[var(--primary)]/20">
                                        {state.selectedStudentName?.[0] || "?"}
                                    </div>
                                    <p className="font-black text-xl text-[var(--text)]">{state.selectedStudentName || "لم يتم الاختيار"}</p>
                                </div>
                            </div>

                            <EventButtons
                                onAdd={handleAddEvent}
                                onOpenReferral={() => actions.toggleModal("referral", true)}
                                onOpenExcuse={() => actions.toggleModal("excuse", true)}
                                onOpenBadges={() => actions.toggleModal("badges", true)}
                                onOpenParentNote={() => actions.toggleModal("parentNote", true)}
                                subject={state.subject}
                            />

                            <div className="mt-6 flex flex-col gap-2">
                                <button
                                    onClick={() => actions.toggleModal("gradebook", true)}
                                    className="w-full flex items-center justify-center gap-2 bg-stone-100 border border-stone-200 text-stone-500 py-3 rounded-xl text-xs font-black hover:text-foreground transition-all"
                                >
                                    <BookOpen size={16} /> دفتر المتابعة
                                </button>
                                <button
                                    onClick={() => actions.toggleModal("groups", true)}
                                    className="w-full flex items-center justify-center gap-2 bg-stone-100 border border-stone-200 text-stone-500 py-3 rounded-xl text-xs font-black hover:text-foreground transition-all"
                                >
                                    <Users size={16} /> توزيع المجموعات
                                </button>
                            </div>

                            <div className="mt-10 pt-10 border-t border-stone-200">
                                <StarSelector
                                    students={state.students}
                                    stars={state.stars}
                                    onToggle={actions.toggleStar}
                                    onSave={actions.saveStars}
                                    saving={state.savingStars}
                                />
                            </div>
                        </Card>
                    </div>

                    {/* Middle Column: Student List & Log */}
                    <div className="lg:col-span-8 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <Card className="p-8 border-stone-200 bg-white/80 relative overflow-hidden">
                                <div className="flex justify-between items-center mb-8 relative z-10">
                                    <h3 className="text-lg font-black flex items-center gap-3 text-white">
                                        <Users className="w-5 h-5 text-[var(--primary)]" />
                                        {state.classStarted ? "رصد الحضور الذكي" : "قائمة الطلاب"}
                                    </h3>
                                    {state.selectedStudentIds.length > 0 && (
                                        <div className="text-[10px] font-black px-3 py-1 bg-[var(--primary)]/20 text-[var(--primary)] rounded-full border border-[var(--primary)]/20 animate-pulse">
                                            {state.selectedStudentIds.length} مختار
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3 relative z-10 min-h-[600px]">
                                    {viewMode === "list" ? (
                                        <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-2" dir="ltr">
                                            <div className="grid grid-cols-1 gap-3" dir="rtl">
                                                {state.students.map((s) => {
                                                    const attStatus = state.attendance[s.id] || 'present';
                                                    const isSelected = state.selectedStudentIds.includes(s.id);
                                                    const animType = animatingIds[s.id];
                                                    const dailyScore = state.dailyScores[s.id] || 0;
                                                    const isOut = !!state.activeExits?.[s.id];

                                                    return (
                                                        <motion.button
                                                            key={s.id}
                                                            onClick={() => {
                                                                if (state.classStarted) actions.toggleAttendance(s.id);
                                                                else actions.toggleSelection(s.id);
                                                            }}
                                                            animate={
                                                                animType === 'reward'
                                                                    ? { scale: [1, 1.05, 1], borderColor: ["#10b981", "#34d399", "#10b981"] }
                                                                    : animType === 'penalty'
                                                                        ? { x: [0, -5, 5, -5, 5, 0], borderColor: ["#f43f5e", "#fb7185", "#f43f5e"] }
                                                                        : {}
                                                            }
                                                            transition={{ duration: 0.4 }}
                                                            className={`group w-full flex items-center justify-between p-4 rounded-3xl border-2 transition-all duration-300 relative overflow-hidden ${isOut
                                                                ? "border-[var(--accent)]/20 bg-[var(--accent)]/50 opacity-60"
                                                                : state.classStarted
                                                                    ? attStatus === 'absent'
                                                                        ? "border-[var(--danger)] bg-[var(--danger)]/10 shadow-[0_0_20px_rgba(239,68,68,0.1)]"
                                                                        : attStatus === 'late'
                                                                            ? "border-[var(--warning)] bg-[var(--warning)]/10 shadow-[0_0_20px_rgba(245,158,11,0.1)]"
                                                                            : "border-[var(--primary)]/30 bg-[var(--primary)]/5 hover:border-[var(--primary)]"
                                                                    : isSelected
                                                                        ? "border-[var(--primary)] bg-[var(--primary)]/10 shadow-[0_0_25px_rgba(62,199,211,0.2)]"
                                                                        : "border-stone-200 bg-white/80 hover:border-stone-200"
                                                                }`}
                                                        >
                                                            <div className="flex items-center gap-4 text-right overflow-hidden relative z-10 w-full">
                                                                <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black border-2 transition-all ${isOut ? "bg-[var(--accent)] border-[var(--accent)]/50 text-white" : state.classStarted
                                                                    ? attStatus === 'absent' ? "bg-[var(--danger)] border-[var(--danger)]/50 text-white" : attStatus === 'late' ? "bg-[var(--warning)] border-[var(--warning)]/50 text-white" : "bg-[var(--primary)] border-[var(--primary)]/50 text-white"
                                                                    : isSelected ? "bg-[var(--primary)] border-[var(--primary)]/50 text-white" : "bg-stone-200 border-stone-200 text-stone-500 group-hover:bg-stone-300"
                                                                    }`}>
                                                                    {s.name[0]}
                                                                </div>
                                                                <div className="flex flex-col items-start min-w-0 flex-1">
                                                                    <div className="flex items-center gap-2 w-full">
                                                                        <span className={`text-[13px] font-black truncate ${isSelected ? "text-white" : "text-stone-600 group-hover:text-foreground"}`}>
                                                                            {s.name}
                                                                        </span>

                                                                        {isOut && (
                                                                            <span className="text-[8px] font-black px-2 py-0.5 bg-indigo-500 text-white rounded-full animate-pulse uppercase">
                                                                                خروج مؤقت
                                                                            </span>
                                                                        )}

                                                                        {dailyScore !== 0 && (
                                                                            <div className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border ${dailyScore > 0 ? 'bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20' : 'bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/20'}`}>
                                                                                {dailyScore > 0 ? `+${dailyScore}` : dailyScore}
                                                                            </div>
                                                                        )}

                                                                        {state.healthAlerts[s.id] && (
                                                                            <div className="flex gap-1.5 shrink-0">
                                                                                {state.healthAlerts[s.id].diabetes && <HeartPulse className="w-3.5 h-3.5 text-rose-500 animate-pulse" />}
                                                                                {state.healthAlerts[s.id].adhd && <AlertCircle className="w-3.5 h-3.5 text-[hsl(var(--gold))]" />}
                                                                                {state.healthAlerts[s.id].vision && <Eye className="w-3.5 h-3.5 text-blue-500" />}
                                                                                {state.healthAlerts[s.id].restroom && <Clock className="w-3.5 h-3.5 opacity-40" />}
                                                                            </div>
                                                                        )}

                                                                        {/* Live Exit Badge */}
                                                                        {(state.todayExitCount?.[s.id] || 0) > 0 && (
                                                                            <div
                                                                                title={`عدد مرات الخروج اليوم: ${state.todayExitCount[s.id]}`}
                                                                                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] font-black transition-all ${state.todayExitCount[s.id] >= 3
                                                                                    ? "bg-[var(--danger)] text-white border-[var(--danger)]/50 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                                                                                    : state.todayExitCount[s.id] === 2
                                                                                        ? "bg-[var(--warning)]/20 text-[var(--warning)] border-[var(--warning)]/30"
                                                                                        : "bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20"
                                                                                    }`}
                                                                            >
                                                                                <span>🚪</span>
                                                                                <span>{state.todayExitCount[s.id]}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    {state.classStarted && (
                                                                        <span className={`text-[9px] font-black uppercase tracking-widest ${attStatus === 'absent' ? "text-[var(--danger)]" : attStatus === 'late' ? "text-[var(--warning)]" : "text-[var(--primary)]"
                                                                            }`}>
                                                                            {attStatus === 'absent' ? "غائب" : attStatus === 'late' ? "متأخر" : "حاضر"}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {isOut && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            actions.endExit(s.id);
                                                                        }}
                                                                        className="bg-[var(--primary)] text-white px-3 py-1.5 rounded-xl text-[10px] font-black hover:brightness-110 transition-all shadow-lg shadow-[var(--primary)]/20"
                                                                    >
                                                                        تسجيل العودة
                                                                    </button>
                                                                )}
                                                            </div>

                                                            {isSelected && (
                                                                <motion.div
                                                                    layoutId="glow"
                                                                    className="absolute inset-0 bg-indigo-500/5 pointer-events-none"
                                                                    initial={{ opacity: 0 }}
                                                                    animate={{ opacity: 1 }}
                                                                />
                                                            )}
                                                        </motion.button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ) : (
                                        <SeatingChart
                                            students={state.students}
                                            seatingMap={state.seatingMap}
                                            onUpdateSeating={actions.setSeatingMap}
                                            studentRoles={state.studentRoles}
                                            badges={state.badges}
                                            dailyScores={state.dailyScores}
                                            onStudentClick={(id) => actions.toggleSelection(id)}
                                            selectedStudentIds={state.selectedStudentIds}
                                        />
                                    )}
                                </div>
                            </Card>

                            <StudentLog
                                events={state.events}
                                loading={state.loading}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Undo Toast Notification */}
            <AnimatePresence>
                {state.lastAction && (
                    <motion.div
                        initial={{ opacity: 0, y: 100, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 100, scale: 0.9 }}
                        className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4"
                    >
                        <div className="holo-panel p-4 rounded-3xl shadow-2xl flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-[var(--primary)]/20 flex items-center justify-center text-[var(--primary)]">
                                    <CheckCircle className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-foreground">تم تنفيذ الإجراء بنجاح</p>
                                    <p className="text-[10px] text-stone-500 font-bold">يمكنك التراجع خلال ٥ ثوانٍ</p>
                                </div>
                            </div>
                            <button
                                onClick={actions.undoLastAction}
                                className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-xl text-xs font-black hover:bg-[var(--surface)] transition-colors active:scale-95"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                تراجع
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <LRCBookingModal
                isOpen={isLrcModalOpen}
                onClose={() => setIsLrcModalOpen(false)}
                classes={lrcState.classes}
                onBook={(data) => {
                    if (!state.user?.id) return;
                    lrcActions.requestBooking({ ...data, teacherId: state.user.id });
                    setIsLrcModalOpen(false);
                    actions.setMessage("✅ تم إرسال طلب حجز المصادر");
                }}
            />

            <ReferralModal
                isOpen={state.modals.referral}
                studentName={state.selectedStudentName}
                onClose={() => actions.toggleModal("referral", false)}
                onSend={actions.sendReferral}
            />

            <ExcuseModal
                isOpen={state.modals.excuse}
                studentName={state.selectedStudentName}
                onClose={() => actions.toggleModal("excuse", false)}
                onSend={actions.sendExcuse}
            />

            <ParentNoteModal
                isOpen={state.modals.parentNote}
                onClose={() => actions.toggleModal("parentNote", false)}
                studentName={state.selectedStudentName}
                studentId={state.selectedStudentIds[0]}
                onSend={actions.saveParentNote}
            />

            <BadgesModal
                isOpen={state.modals.badges}
                onClose={() => actions.toggleModal("badges", false)}
                studentName={state.selectedStudentName}
                studentId={state.selectedStudentIds[0]}
                onAward={actions.awardBadge}
            />

            {/* Phase 2 Overlay Tools */}
            <ToolsWidget onOpenPicker={() => actions.toggleModal("picker", true)} />

            <RandomPicker
                isOpen={state.modals.picker}
                onClose={() => actions.toggleModal("picker", false)}
                students={state.students}
                picking={state.picking}
                pickedStudent={state.pickedStudent}
                onPick={actions.pickRandomStudent}
                pickerType={state.pickerType}
                setPickerType={actions.setPickerType}
            />

            <GroupTool
                isOpen={state.modals.groups}
                onClose={() => actions.toggleModal("groups", false)}
                students={state.students}
                onDistribute={actions.redistributeGroups}
            />

            <GradebookDrawer
                isOpen={state.modals.gradebook}
                onClose={() => actions.toggleModal("gradebook", false)}
                items={state.gradebookItems}
                students={state.students}
                dailyScores={state.dailyScores}
            />
        </main>
    );
}
