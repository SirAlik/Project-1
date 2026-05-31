import React, { useState } from "react";
import {
    Users,
    UserPlus,
    Layers,
    MapPin,
    Star,
    MoreVertical,
    CheckCircle2,
    Plus
} from "lucide-react";
import { ActivityClub, ClubAssignment, ClubEvaluation } from "@/lib/types/activity";
import type { AddClubInput, AssignTeacherInput, EvalInput } from "@/app/activity/_hooks/useActivities";

interface ClubManagerProps {
    clubs: ActivityClub[];
    assignments: ClubAssignment[];
    evaluations: ClubEvaluation[];
    teachers: { id: string; name: string }[];
    onAddClub: (club: AddClubInput) => void;
    onAssignTeacher: (assignment: AssignTeacherInput) => void;
    onEvaluate: (evaluation: EvalInput) => void;
}

export function ClubManager({
    clubs,
    assignments,
    evaluations,
    teachers,
    onAddClub,
    onAssignTeacher,
    onEvaluate,
}: ClubManagerProps) {
    const [showAddClub, setShowAddClub] = useState(false);

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
            {/* Header & Main Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-black text-white flex items-center gap-2">
                        <Layers className="w-6 h-6 text-[hsl(var(--gold))]" /> إدارة الأندية والبرامج
                    </h2>
                    <p className="text-xs text-zinc-500 font-bold mt-1">تنظيم المهام، توزيع المشرفين، ومتابعة الأداء</p>
                </div>
                <button
                    onClick={() => setShowAddClub(true)}
                    className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-3 rounded-2xl text-xs font-bold transition-all border border-zinc-700/50 flex items-center gap-2"
                >
                    <Plus className="w-4 h-4 text-[hsl(var(--gold))]" /> إضافة نادي جديد
                </button>
            </div>

            {/* Grid of Clubs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clubs.map(club => (
                    <ClubCard
                        key={club.id}
                        club={club}
                        assignment={assignments.find(a => a.club_id === club.id)}
                        evaluations={evaluations.filter(e => assignments.some(a => a.id === e.assignment_id && a.club_id === club.id))}
                        teachers={teachers}
                        onAssign={onAssignTeacher}
                        onEvaluate={onEvaluate}
                    />
                ))}
            </div>

            {showAddClub && (
                <AddClubModal
                    onClose={() => setShowAddClub(false)}
                    onSubmit={(data) => {
                        onAddClub(data);
                        setShowAddClub(false);
                    }}
                />
            )}
        </div>
    );
}

function ClubCard({
    club,
    assignment,
    evaluations,
    teachers,
    onAssign,
    onEvaluate
}: {
    club: ActivityClub,
    assignment?: ClubAssignment,
    evaluations: ClubEvaluation[],
    teachers: { id: string; name: string }[],
    onAssign: (data: AssignTeacherInput) => void,
    onEvaluate: (data: EvalInput) => void
}) {
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showEvalModal, setShowEvalModal] = useState(false);

    // Calculate average performance if evaluations exist
    const avgPerf = evaluations.length > 0
        ? evaluations.reduce((acc, curr) => acc + curr.performance_score, 0) / evaluations.length
        : 0;

    return (
        <div className="group bg-zinc-900/40 border border-zinc-800 hover:border-[hsla(var(--gold),.30)] rounded-[2.5rem] overflow-hidden transition-all duration-500">
            {/* Card Header Background */}
            <div className="h-24 bg-gradient-to-br from-zinc-800 to-zinc-900 relative p-6 flex justify-between items-start">
                <div className="p-3 bg-zinc-950/50 backdrop-blur-md rounded-2xl border border-white/5">
                    <Layers className="w-5 h-5 text-[hsl(var(--gold))]" />
                </div>
                <div className="flex gap-2">
                    <div className="text-[8px] font-black tracking-widest uppercase bg-zinc-950/60 backdrop-blur-md text-zinc-400 px-3 py-1.5 rounded-full border border-white/5">
                        {club.category}
                    </div>
                    <button aria-label="خيارات إضافية" className="p-1.5 bg-zinc-950/60 backdrop-blur-md rounded-full border border-white/5 text-zinc-500 hover:text-white transition-colors">
                        <MoreVertical className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-6 -mt-8 relative z-10">
                <div className="bg-zinc-950 p-6 rounded-[2rem] border border-zinc-800/50 shadow-2xl space-y-4">
                    <div>
                        <h3 className="text-lg font-black text-white">{club.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <MapPin className="w-3 h-3 text-zinc-600" />
                            <span className="text-[10px] text-zinc-500 font-bold">{club.location || "لم يحدد الموقع"}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pb-2 border-b border-zinc-900">
                        <div className="space-y-1">
                            <p className="text-[9px] font-black text-zinc-600 uppercase">مشرف النادي</p>
                            <p className="text-xs font-bold text-zinc-300 truncate">
                                {assignment?.teacher_name || "لم يتم التعيين"}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[9px] font-black text-zinc-600 uppercase">السعة الاستيعابية</p>
                            <div className="flex items-center gap-1.5">
                                <Users className="w-3 h-3 text-emerald-500/50" />
                                <p className="text-xs font-bold text-zinc-300">{club.capacity || "--"} طالب</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map(i => (
                                <Star
                                    key={i}
                                    className={`w-3 h-3 ${i <= Math.round(avgPerf) ? "text-[hsl(var(--gold))] fill-[hsl(var(--gold))]" : "text-zinc-800"}`}
                                />
                            ))}
                            <span className="text-[10px] text-zinc-600 font-black mr-1">{avgPerf.toFixed(1)}</span>
                        </div>

                        <div className="flex items-center gap-1 cursor-pointer hover:bg-zinc-900 p-1.5 rounded-xl transition-all" onClick={() => setShowEvalModal(true)}>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-[10px] font-black text-emerald-400">تقييم الأداء</span>
                        </div>
                    </div>
                </div>

                {/* Floating Action Button for Assignment */}
                {!assignment && (
                    <button
                        onClick={() => setShowAssignModal(true)}
                        className="w-full mt-4 flex items-center justify-center gap-2 py-3 bg-[hsla(var(--gold),.10)] hover:bg-[hsla(var(--gold),.20)] text-[hsl(var(--gold))] rounded-2xl border border-[hsla(var(--gold),.20)] text-xs font-bold transition-all"
                    >
                        <UserPlus className="w-4 h-4" />
                        تعيين مشرف لهذا النادي
                    </button>
                )}
            </div>

            {showAssignModal && (
                <AssignModal
                    club={club}
                    teachers={teachers}
                    onClose={() => setShowAssignModal(false)}
                    onSubmit={(data) => {
                        onAssign(data);
                        setShowAssignModal(false);
                    }}
                />
            )}

            {showEvalModal && assignment && (
                <EvalModal
                    assignment={assignment}
                    onClose={() => setShowEvalModal(false)}
                    onSubmit={(data) => {
                        onEvaluate(data);
                        setShowEvalModal(false);
                    }}
                />
            )}
        </div>
    );
}

// Helpers
function AddClubModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (data: AddClubInput) => void }) {
    const [formData, setFormData] = useState<AddClubInput>({
        name: "",
        category: "sports",
        description: "",
        location: "",
        capacity: 20
    });

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-in zoom-in-95 transition-all">
            <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-zinc-800 bg-zinc-900/50">
                    <h3 className="text-xl font-black text-white flex items-center gap-3">
                        <Plus className="w-6 h-6 text-[hsl(var(--gold))]" /> تأسيس نادي طلابي جديد
                    </h3>
                </div>
                <div className="p-8 space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-black text-zinc-500 mr-2 uppercase tracking-widest">مسمى النادي</label>
                        <input
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-sm focus:border-[hsl(var(--gold))] outline-none transition-all placeholder:text-zinc-700"
                            placeholder="مثال: نادي الابتكار والذكاء الاصطناعي"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-zinc-500 mr-2 uppercase tracking-widest">المجال</label>
                            <select
                                aria-label="اختر المجال"
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-sm focus:border-[hsl(var(--gold))] outline-none appearance-none"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value as ActivityClub['category'] })}
                            >
                                <option value="sports">رياضي</option>
                                <option value="cultural">ثقافي</option>
                                <option value="scientific">علمي</option>
                                <option value="social">اجتماعي</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-zinc-500 mr-2 uppercase tracking-widest">السعة القصوى</label>
                            <input
                                aria-label="السعة القصوى"
                                type="number"
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-sm focus:border-[hsl(var(--gold))] outline-none transition-all"
                                value={formData.capacity}
                                onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-black text-zinc-500 mr-2 uppercase tracking-widest">الموقع (القاعة/المقر)</label>
                        <input
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-sm focus:border-[hsl(var(--gold))] outline-none transition-all"
                            placeholder="مثال: مختبر الحاسب 1"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        />
                    </div>
                </div>
                <div className="p-8 bg-zinc-900/50 flex gap-4">
                    <button
                        onClick={() => onSubmit(formData)}
                        className="flex-1 bg-[hsl(var(--gold-strong))] hover:bg-[hsl(var(--gold))] text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-[hsla(var(--gold),.20)]"
                    >
                        تأكيد الإنشاء
                    </button>
                    <button
                        onClick={onClose}
                        className="px-8 py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-2xl text-xs font-black transition-all"
                    >
                        إلغاء
                    </button>
                </div>
            </div>
        </div>
    );
}

function AssignModal({ club, teachers, onClose, onSubmit }: { club: ActivityClub; teachers: { id: string; name: string }[]; onClose: () => void; onSubmit: (data: AssignTeacherInput) => void }) {
    const [teacherId, setTeacherId] = useState("");
    const [role, setRole] = useState<"supervisor" | "assistant">("supervisor");

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-zinc-950/90 backdrop-blur-md animate-in slide-in-from-top-8 transition-all">
            <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl">
                <div className="p-8 bg-gradient-to-br from-zinc-800 to-zinc-900 border-b border-zinc-800">
                    <h3 className="text-lg font-black text-white">{club.name}</h3>
                    <p className="text-xs text-[hsl(var(--gold))] font-bold mt-1 uppercase tracking-wider italic">تكليف مشرف النادي</p>
                </div>
                <div className="p-8 space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-black text-zinc-500 mr-2 uppercase">اختيار المعلم</label>
                        <select
                            aria-label="اختر المعلم"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-sm focus:border-[hsl(var(--gold))] outline-none"
                            value={teacherId}
                            onChange={(e) => setTeacherId(e.target.value)}
                        >
                            <option value="">اختر من القائمة...</option>
                            {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-black text-zinc-500 mr-2 uppercase">الدور الوظيفي</label>
                        <div className="flex gap-2 p-1 bg-zinc-950 rounded-2xl border border-zinc-800">
                            <button
                                onClick={() => setRole("supervisor")}
                                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${role === 'supervisor' ? "bg-[hsl(var(--gold))] text-white" : "text-zinc-600 hover:text-zinc-400"}`}
                            >
                                مشرف أساسي
                            </button>
                            <button
                                onClick={() => setRole("assistant")}
                                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${role === 'assistant' ? "bg-emerald-500 text-white" : "text-zinc-600 hover:text-zinc-400"}`}
                            >
                                مساعد/منسق
                            </button>
                        </div>
                    </div>
                </div>
                <div className="p-8 bg-zinc-900/50 flex gap-3">
                    <button
                        disabled={!teacherId}
                        onClick={() => onSubmit({ club_id: club.id, teacher_id: teacherId, role })}
                        className="flex-1 bg-white hover:bg-zinc-200 text-black py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-30"
                    >
                        حفظ التكليف
                    </button>
                    <button
                        onClick={onClose}
                        className="px-8 py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-2xl text-xs font-black transition-all"
                    >
                        إلغاء
                    </button>
                </div>
            </div>
        </div>
    );
}

function EvalModal({ assignment, onClose, onSubmit }: { assignment: ClubAssignment; onClose: () => void; onSubmit: (data: EvalInput) => void }) {
    const [performance, setPerformance] = useState(5);
    const [engagement, setEngagement] = useState(5);
    const [notes, setNotes] = useState("");

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-zinc-950/90 backdrop-blur-md animate-in fade-in transition-all">
            <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-zinc-800 bg-zinc-900/50 text-right">
                    <h3 className="text-lg font-black text-white">تقييم الأداء والمتابعة</h3>
                    <p className="text-[10px] text-zinc-500 font-bold mt-1">للمشرف: {assignment.teacher_name}</p>
                </div>
                <div className="p-8 space-y-8">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-zinc-500 uppercase">جودة تنفيذ الأنشطة</span>
                            <span className="text-xs font-black text-[hsl(var(--gold))]">{performance}/5</span>
                        </div>
                        <input aria-label="تقييم جودة التنفيذ" type="range" min="1" max="5" step="1" className="w-full accent-[hsl(var(--gold))]" value={performance} onChange={(e) => setPerformance(parseInt(e.target.value))} />
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-zinc-500 uppercase">تفاعل الطلاب وحضورهم</span>
                            <span className="text-xs font-black text-emerald-400">{engagement}/5</span>
                        </div>
                        <input aria-label="تقييم تفاعل الطلاب" type="range" min="1" max="5" step="1" className="w-full accent-emerald-500" value={engagement} onChange={(e) => setEngagement(parseInt(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase">ملاحظات التحسين</label>
                        <textarea
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-xs focus:border-[hsl(var(--gold))] outline-none min-h-[100px] text-right"
                            placeholder="اكتب مرئياتك هنا..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                </div>
                <div className="p-8 bg-zinc-900/50 flex gap-3">
                    <button
                        onClick={() => onSubmit({ assignment_id: assignment.id, performance_score: performance, engagement_score: engagement, notes })}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-2xl text-xs font-black transition-all"
                    >
                        حفظ التقييم
                    </button>
                    <button
                        onClick={onClose}
                        className="px-8 py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-2xl text-xs font-black transition-all"
                    >
                        إغاء
                    </button>
                </div>
            </div>
        </div>
    );
}
