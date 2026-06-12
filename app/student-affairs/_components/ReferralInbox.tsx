import React, { useState } from "react";
import {
    AlertTriangle,
    Send,
    CheckCircle,
    User,
    Search,
    Clock,
    ShieldAlert
} from "lucide-react";
import { BehavioralReferral } from "@/lib/types/student-affairs";

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
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-700">
            {/* Header */}
            <div className="flex justify-between items-center bg-card/40 p-6 rounded-[2.5rem] border border-border backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-destructive/10 text-destructive rounded-3xl border border-destructive/20">
                        <ShieldAlert className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-foreground">صندوق الإحالات السلوكية</h2>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Behavioral Referrals (QF71-C-5-3)</p>
                    </div>
                </div>

                <div className="relative hidden md:block w-64">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search referrals..."
                        className="w-full bg-background border border-border rounded-2xl py-2 pl-12 pr-4 text-xs text-foreground focus:outline-none"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Referral Cards */}
            <div className="space-y-4">
                {filtered.length === 0 ? (
                    <div className="text-center py-20 bg-card/20 rounded-[3rem] border border-border/50 border-dashed">
                        <AlertTriangle className="w-12 h-12 text-muted mx-auto mb-4" />
                        <p className="text-muted-foreground font-bold">لا يوجد إحالات حالية</p>
                    </div>
                ) : (
                    filtered.map(referral => (
                        <div
                            key={referral.id}
                            className="group bg-card/30 border border-border rounded-[2.5rem] p-6 hover:bg-card/60 transition-all duration-500"
                        >
                            <div className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center">
                                <div className="flex items-center gap-4 min-w-[300px]">
                                    <div className="w-14 h-14 bg-background rounded-[1.5rem] flex items-center justify-center border border-border group-hover:border-destructive/30 transition-colors">
                                        <User className="w-6 h-6 text-muted-foreground group-hover:text-destructive" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-foreground">{referral.student?.name}</h4>
                                        <p className="text-[10px] text-muted-foreground font-medium mb-2">{referral.student?.student_id}</p>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${referral.referral_type === 'lateness' ? 'bg-warning/10 text-warning' :
                                                referral.referral_type === 'absence' ? 'bg-destructive/10 text-destructive' :
                                                    'bg-primary/10 text-primary'
                                                }`}>
                                                {referral.referral_type}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground font-bold italic">
                                                {referral.trigger_count} occurrences in {referral.trigger_period}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 px-4 border-l border-border/50">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                                        <p className="text-xs text-foreground/80 leading-relaxed font-medium">{referral.vp_reason}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 w-full lg:w-auto">
                                    {role === 'vp' && referral.status === 'draft' && (
                                        <button
                                            onClick={() => {
                                                const notes = prompt("Add notes for the counselor:");
                                                if (notes !== null) onSend(referral.id, notes);
                                            }}
                                            className="w-full lg:w-auto px-6 py-4 bg-destructive text-destructive-foreground rounded-2xl text-xs font-black flex items-center justify-center gap-2 hover:bg-destructive/90 transition-all shadow-lg shadow-destructive/20"
                                        >
                                            <Send className="w-4 h-4" />
                                            إرسال إلى الموجه الطلابي
                                        </button>
                                    )}

                                    {role === 'counselor' && referral.status === 'pending_counselor' && (
                                        <button
                                            onClick={() => {
                                                setRecordingFor({ id: referral.id, name: referral.student?.name || "Student" });
                                            }}
                                            className="w-full lg:w-auto px-6 py-4 bg-success text-success-foreground rounded-2xl text-xs font-black flex items-center justify-center gap-2 hover:bg-success/90 transition-all shadow-lg shadow-success/20"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                            Record Intervention
                                        </button>
                                    )}

                                    <div className="flex flex-col gap-2 w-full lg:w-auto">
                                        <div className={`px-4 py-2 rounded-2xl border text-[9px] font-black uppercase tracking-widest text-center ${referral.status === 'resolved' ? 'border-success/30 text-success' :
                                            referral.status === 'pending_counselor' ? 'border-warning/30 text-warning' :
                                                referral.status === 'escalated' ? 'border-destructive/50 text-destructive bg-destructive/5' :
                                                    'border-border text-muted-foreground'
                                            }`}>
                                            {referral.status}
                                        </div>

                                        {role === 'vp' && referral.status === 'pending_counselor' && (
                                            <button
                                                onClick={() => {
                                                    const reason = prompt("Why are you escalating this case?");
                                                    if (reason) onEscalate?.(referral.id, reason);
                                                }}
                                                className="px-4 py-2 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl text-[8px] font-black uppercase hover:bg-destructive hover:text-destructive-foreground transition-all"
                                            >
                                                التصعيد إلى مدير المدرسة
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Timeline Mini-indicator */}
                            <div className="mt-6 pt-6 border-t border-border/30 flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-3 h-3 text-muted-foreground" />
                                        <span className="text-[10px] text-muted-foreground font-bold">{new Date(referral.created_at).toLocaleDateString()}</span>
                                    </div>
                                    {referral.vp_sent_at && (
                                        <div className="flex items-center gap-2">
                                            <Send className="w-3 h-3 text-muted-foreground" />
                                            <span className="text-[10px] text-muted-foreground font-medium">Sent to Counselor {new Date(referral.vp_sent_at).toLocaleTimeString()}</span>
                                        </div>
                                    )}
                                </div>

                                {referral.status === 'resolved' && (
                                    <div className="flex items-center gap-2 text-success/50">
                                        <CheckCircle className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase tracking-tight">System Validated</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

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

import { ActionRecorder } from "./ActionRecorder";

