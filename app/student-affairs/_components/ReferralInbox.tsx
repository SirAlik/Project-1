import React, { useState } from "react";
import {
    AlertTriangle,
    Send,
    CheckCircle,
    User,
    Search,
    Clock,
} from "lucide-react";
import { BehavioralReferral } from "@/lib/types/student-affairs";
import { DashboardSection, EmptyState } from "@/components/dashboard";
import { ActionRecorder } from "./ActionRecorder";

interface Props {
    referrals: BehavioralReferral[];
    onSend: (id: string, notes: string) => void;
    onResolve?: (id: string, action: string, notes?: string) => void;
    onEscalate?: (id: string, reason: string) => void;
    role: 'vp' | 'counselor';
}

export function ReferralInbox({ referrals, onSend, onResolve, onEscalate, role }: Props) {
    const [search, setSearch] = useState("");
    const [recordingFor, setRecordingFor] = useState<{ id: string, name: string } | null>(null);

    const filtered = referrals.filter(r =>
        r.student?.name.toLowerCase().includes(search.toLowerCase()) ||
        r.vp_reason.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <DashboardSection
                title={
                    <span className="flex items-center gap-2">
                        صندوق الإحالات السلوكية
                        <span className="text-[10px] font-bold text-muted-foreground">QF71-C-5-3</span>
                    </span>
                }
                icon={AlertTriangle}
                action={
                    <div className="relative hidden w-64 md:block">
                        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="بحث في الإحالات..."
                            className="w-full rounded-2xl border border-border bg-surface-soft py-2 pr-10 pl-4 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                }
            >
                {filtered.length === 0 ? (
                    <EmptyState icon={AlertTriangle} title="لا يوجد إحالات حالية" hint="ستظهر الإحالات السلوكية هنا فور إنشائها." />
                ) : (
                    <div className="space-y-4">
                        {filtered.map(referral => (
                            <div
                                key={referral.id}
                                className="group rounded-2xl border border-border bg-surface-soft p-5 transition-colors hover:border-primary/30"
                            >
                                <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
                                    <div className="flex min-w-[300px] items-center gap-4">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground transition-colors group-hover:border-destructive/30 group-hover:text-destructive">
                                            <User className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-foreground">{referral.student?.name}</h4>
                                            <p className="mb-2 text-[10px] font-medium text-muted-foreground">{referral.student?.student_id}</p>
                                            <div className="flex items-center gap-2">
                                                <span className={`rounded-full px-2 py-0.5 text-[8px] font-black uppercase ${referral.referral_type === 'lateness' ? 'bg-warning/10 text-warning' :
                                                    referral.referral_type === 'absence' ? 'bg-destructive/10 text-destructive' :
                                                        'bg-primary/10 text-primary'
                                                    }`}>
                                                    {referral.referral_type}
                                                </span>
                                                <span className="text-[10px] font-bold text-muted-foreground">
                                                    {referral.trigger_count} حالات خلال {referral.trigger_period}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-1 border-r border-border px-4">
                                        <div className="flex items-start gap-3">
                                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                                            <p className="text-xs font-medium leading-relaxed text-foreground">{referral.vp_reason}</p>
                                        </div>
                                    </div>

                                    <div className="flex w-full items-center gap-3 lg:w-auto">
                                        {role === 'vp' && referral.status === 'draft' && (
                                            <button
                                                onClick={() => {
                                                    const notes = prompt("أضف ملاحظات للموجه الطلابي:");
                                                    if (notes !== null) onSend(referral.id, notes);
                                                }}
                                                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-destructive px-6 py-3 text-xs font-black text-destructive-foreground shadow-sm transition-colors hover:bg-destructive/90 lg:w-auto"
                                            >
                                                <Send className="h-4 w-4" />
                                                إرسال إلى الموجه الطلابي
                                            </button>
                                        )}

                                        {role === 'counselor' && referral.status === 'pending_counselor' && (
                                            <button
                                                onClick={() => {
                                                    setRecordingFor({ id: referral.id, name: referral.student?.name || "الطالب" });
                                                }}
                                                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-success px-6 py-3 text-xs font-black text-success-foreground shadow-sm transition-colors hover:bg-success/90 lg:w-auto"
                                            >
                                                <CheckCircle className="h-4 w-4" />
                                                تسجيل إجراء
                                            </button>
                                        )}

                                        <div className="flex w-full flex-col gap-2 lg:w-auto">
                                            <div className={`rounded-2xl border px-4 py-2 text-center text-[9px] font-black uppercase tracking-widest ${referral.status === 'resolved' ? 'border-success/30 text-success' :
                                                referral.status === 'pending_counselor' ? 'border-warning/30 text-warning' :
                                                    referral.status === 'escalated' ? 'border-destructive/50 bg-destructive/5 text-destructive' :
                                                        'border-border text-muted-foreground'
                                                }`}>
                                                {referral.status}
                                            </div>

                                            {role === 'vp' && referral.status === 'pending_counselor' && (
                                                <button
                                                    onClick={() => {
                                                        const reason = prompt("ما سبب التصعيد إلى مدير المدرسة؟");
                                                        if (reason) onEscalate?.(referral.id, reason);
                                                    }}
                                                    className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-2 text-[8px] font-black uppercase text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground"
                                                >
                                                    التصعيد إلى مدير المدرسة
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Timeline Mini-indicator */}
                                <div className="mt-6 flex items-center justify-between border-t border-border pt-6">
                                    <div className="flex items-center gap-6">
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-3 w-3 text-muted-foreground" />
                                            <span className="text-[10px] font-bold text-muted-foreground">{new Date(referral.created_at).toLocaleDateString()}</span>
                                        </div>
                                        {referral.vp_sent_at && (
                                            <div className="flex items-center gap-2">
                                                <Send className="h-3 w-3 text-muted-foreground" />
                                                <span className="text-[10px] font-medium text-muted-foreground">أُرسلت للموجه {new Date(referral.vp_sent_at).toLocaleTimeString()}</span>
                                            </div>
                                        )}
                                    </div>

                                    {referral.status === 'resolved' && (
                                        <div className="flex items-center gap-2 text-success">
                                            <CheckCircle className="h-4 w-4" />
                                            <span className="text-[10px] font-black uppercase tracking-tight">مُعتمد آلياً</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </DashboardSection>

            {/* Action Recorder Modal */}
            <ActionRecorder
                isOpen={!!recordingFor}
                referralId={recordingFor?.id || ""}
                studentName={recordingFor?.name || ""}
                onClose={() => setRecordingFor(null)}
                onRecord={(id, action, notes) => {
                    onResolve?.(id, action, notes);
                    setRecordingFor(null);
                }}
            />
        </div>
    );
}
