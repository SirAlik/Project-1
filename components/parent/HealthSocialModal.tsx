"use client";

import React, { useState } from "react";
import { X, HeartPulse, Users, Save, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/db/supabase";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    studentId: string;
}

export function HealthSocialModal({ isOpen, onClose, studentId }: Props) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    // Health Data
    const [health, setHealth] = useState({
        vision: false,
        adhd: false,
        restroom: false,
        diabetes: false,
        allergies: "",
        other: ""
    });

    // Social Data
    const [social, setSocial] = useState({
        familyStatus: "stable", // stable, divorced, deceased_parent
        guardian: "both", // both, father, mother, other
        incomeLevel: "medium", // low, medium, high
        notes: ""
    });

    if (!isOpen) return null;

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const details = JSON.stringify({
                type: "health_social_intake",
                health,
                social
            });

            const { error } = await supabase.from("student_profiles").update({
                health_data: health,
                social_data: social,
                last_parent_update: new Date().toISOString()
            }).eq("id", studentId);

            if (error) {
                // Fallback to parent_reports if student_profiles update fails (e.g. columns missing)
                await supabase.from("parent_reports").insert([{
                    student_id: studentId,
                    title: "تحديث الحالة الصحية والاجتماعية",
                    details: details,
                    status: "new"
                }]);
            }

            if (error) throw error;
            setDone(true);
            setTimeout(() => {
                onClose();
                setDone(false);
                setStep(1);
            }, 2000);
        } catch (e: unknown) {
            alert("خطأ في الإرسال: " + (e instanceof Error ? e.message : String(e)));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-card border border-border w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-6 border-b border-border flex justify-between items-center bg-muted/30">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/20">
                            {step === 1 ? <HeartPulse className="w-5 h-5 text-destructive" /> : <Users className="w-5 h-5 text-primary" />}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-foreground">تحويل الحالة المحدثة</h2>
                            <p className="text-xs text-muted-foreground">الخطوة {step} من 2</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors" aria-label="إغلاق">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                <div className="p-8">
                    {done ? (
                        <div className="py-12 text-center space-y-4 animate-in zoom-in-90">
                            <div className="w-20 h-20 bg-success/20 rounded-full flex items-center justify-center mx-auto border border-success/20">
                                <CheckCircle2 className="w-10 h-10 text-success" />
                            </div>
                            <h3 className="text-2xl font-bold text-success">تم الإرسال بنجاح</h3>
                            <p className="text-muted-foreground">سيقوم الموجه الطلابي بمراجعة المعلومات وتحديث سجل الطالب.</p>
                        </div>
                    ) : (
                        <>
                            {step === 1 ? (
                                <div className="space-y-6 animate-in slide-in-from-left-4">
                                    <div className="pb-2 border-b border-border">
                                        <h3 className="text-lg font-bold flex items-center gap-2">
                                            <HeartPulse className="w-4 h-4 text-destructive" /> الحالة الصحية
                                        </h3>
                                        <p className="text-xs text-muted-foreground mt-1">يرجى تسجيل أي ملاحظات طبية تتطلب انتباه المدرسة.</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <Checkbox label="ضعف نظر" checked={health.vision} onChange={v => setHealth({ ...health, vision: v })} />
                                        <Checkbox label="فرط حركة/تشتت (ADHD)" checked={health.adhd} onChange={v => setHealth({ ...health, adhd: v })} />
                                        <Checkbox label="احتياج دخول حمام متكرر" checked={health.restroom} onChange={v => setHealth({ ...health, restroom: v })} />
                                        <Checkbox label="سكري" checked={health.diabetes} onChange={v => setHealth({ ...health, diabetes: v })} />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-muted-foreground">حساسية معينة (إن وجد)</label>
                                        <input
                                            type="text"
                                            value={health.allergies}
                                            onChange={e => setHealth({ ...health, allergies: e.target.value })}
                                            className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground"
                                            placeholder="أدخل نوع الحساسية..."
                                            aria-label="نوع الحساسية"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6 animate-in slide-in-from-right-4">
                                    <div className="pb-2 border-b border-border">
                                        <h3 className="text-lg font-bold flex items-center gap-2">
                                            <Users className="w-4 h-4 text-primary" /> الحالة الاجتماعية والمعيشية
                                        </h3>
                                        <p className="text-xs text-muted-foreground mt-1">هذه المعلومات تظل سرية تماماً لدى الموجه الطلابي فقط.</p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-muted-foreground">الوضع الأسري</label>
                                            <select
                                                value={social.familyStatus}
                                                onChange={e => setSocial({ ...social, familyStatus: e.target.value })}
                                                className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                                                aria-label="الوضع الأسري"
                                            >
                                                <option value="stable">مستقر (والدين)</option>
                                                <option value="divorced">منفصلين</option>
                                                <option value="deceased_parent">وفاة أحد الوالدين</option>
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-muted-foreground">القائم بالرعاية (الولي)</label>
                                            <select
                                                value={social.guardian}
                                                onChange={e => setSocial({ ...social, guardian: e.target.value })}
                                                className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                                                aria-label="القائم بالرعاية"
                                            >
                                                <option value="both">كلاهما</option>
                                                <option value="father">الأب</option>
                                                <option value="mother">الأم</option>
                                                <option value="other">شخص آخر</option>
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-muted-foreground">ملاحظات إضافية</label>
                                            <textarea
                                                value={social.notes}
                                                onChange={e => setSocial({ ...social, notes: e.target.value })}
                                                className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm h-24 focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground"
                                                placeholder="أي تفاصيل تود مشاركتها مع الموجه..."
                                                aria-label="ملاحظات إضافية"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="mt-10 flex gap-3">
                                {step === 1 ? (
                                    <button
                                        onClick={() => setStep(2)}
                                        className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 active:scale-95 transition-all text-sm"
                                        aria-label="التالي: الحالة الاجتماعية"
                                    >
                                        التالي: الحالة الاجتماعية
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => setStep(1)}
                                            className="w-20 bg-muted hover:bg-muted/80 border border-border text-muted-foreground font-bold rounded-2xl transition-all text-sm"
                                            aria-label="رجوع"
                                        >
                                            رجوع
                                        </button>
                                        <button
                                            onClick={handleSubmit}
                                            disabled={loading}
                                            className="flex-1 bg-success hover:bg-success/90 text-success-foreground font-bold py-4 rounded-2xl shadow-lg shadow-success/20 active:scale-95 transition-all flex items-center justify-center gap-2 text-sm"
                                        >
                                            {loading ? "جاري الإرسال..." : (
                                                <>
                                                    <Save className="w-4 h-4" /> اعتماد وإرسال
                                                </>
                                            )}
                                        </button>
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

function Checkbox({ label, checked, onChange }: { label: string, checked: boolean, onChange: (v: boolean) => void }) {
    return (
        <button
            onClick={() => onChange(!checked)}
            className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-right ${checked ? 'border-destructive/50 bg-destructive/5 text-destructive shadow-lg shadow-destructive/5' : 'border-border bg-muted/30 text-muted-foreground hover:border-muted-foreground/30'}`}
        >
            <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${checked ? 'bg-destructive border-destructive' : 'border-muted-foreground/30'}`}>
                {checked && <div className="w-2 h-2 rounded-sm bg-white" />}
            </div>
            <span className="text-xs font-bold leading-none">{label}</span>
        </button>
    )
}
