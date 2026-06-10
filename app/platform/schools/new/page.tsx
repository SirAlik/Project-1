"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { School, Globe, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";

const STEPS = [
    { id: 1, title: "بيانات المدرسة", icon: <School size={20} /> },
    { id: 2, title: "النطاق والهوية", icon: <Globe size={20} /> },
    { id: 3, title: "تأكيد وإنشاء", icon: <CheckCircle2 size={20} /> },
];

import { toast } from "sonner"; // Assuming sonner is installed/used

export default function NewSchoolPage() {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: "",
        type: "private",
        stages: [],
        slug: "",
        domain: ""
    });

    const nextStep = () => setStep(s => Math.min(s + 1, 3));
    const prevStep = () => setStep(s => Math.max(s - 1, 1));

    const handleCreateSchool = () => {
        toast.error("إنشاء المدارس غير متصل بقاعدة البيانات بعد");
    };

    return (
        <div className="min-h-screen bg-background text-foreground p-6 lg:p-12" dir="rtl">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-10">
                    <Link href="/platform/dashboard" className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors mb-4 block">
                        ← العودة إلى لوحة التحكم
                    </Link>
                    <h1 className="text-3xl font-black tracking-tight mb-2 text-foreground">إضافة مدرسة جديدة</h1>
                    <p className="text-muted-foreground text-sm opacity-80">معالج إنشاء كيان تعليمي جديد في النظام</p>
                </div>

                <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-bold leading-7 text-amber-800">
                    هذا المسار غير متصل حالياً بعملية إنشاء حقيقية في قاعدة البيانات. تم تعطيل التنفيذ حتى يتم بناء Server Action آمن ومقيد بالصلاحيات.
                </div>

                {/* Stepper */}
                <div className="flex items-center justify-between mb-12 relative max-w-2xl mx-auto">
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-border -z-10 -translate-y-1/2" />
                    {STEPS.map((s) => (
                        <div key={s.id} className="flex flex-col items-center gap-2 bg-background px-4 z-10">
                            <motion.div
                                animate={{
                                    backgroundColor: s.id <= step ? 'var(--primary)' : 'hsl(var(--muted))',
                                    scale: s.id === step ? 1.1 : 1,
                                    color: s.id <= step ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))'
                                }}
                                className="w-10 h-10 rounded-full flex items-center justify-center border border-border"
                            >
                                {s.icon}
                            </motion.div>
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${s.id <= step ? 'text-primary' : 'text-muted-foreground'}`}>
                                {s.title}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Form Area */}
                <Card className="p-8 min-h-[400px]">
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div
                                key={1}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <h3 className="text-xl font-bold mb-6 text-card-foreground">البيانات الأساسية</h3>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold opacity-60 text-muted-foreground">اسم المدرسة الرسمي</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full bg-muted/50 border border-border rounded-xl p-4 text-sm focus:border-primary outline-none"
                                            placeholder="مثال: مدارس الرواد العالمية"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold opacity-60 text-muted-foreground">نوع الكيان</label>
                                            <select
                                                value={formData.type}
                                                onChange={e => setFormData({ ...formData, type: e.target.value })}
                                                className="bg-muted/50 border-none rounded-xl px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-primary appearance-none w-full"
                                                aria-label="نوع الكيان"
                                            >
                                                <option value="private">بنين</option>
                                                <option value="international">بنات</option>
                                                <option value="public">مشترك (طفولة مبكرة)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div
                                key={2}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <h3 className="text-xl font-bold mb-6 text-card-foreground">إعداد النطاق والهوية الرقمية</h3>
                                <div className="p-6 rounded-2xl bg-muted/50 border border-border mb-6">
                                    <Globe className="w-8 h-8 text-primary mb-4" />
                                    <p className="text-sm opacity-60 mb-1 text-muted-foreground">سيتم إنشاء رابط فرعي مخصص للمدرسة للدخول المباشر.</p>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold opacity-60 text-muted-foreground">معرف الرابط (Slug)</label>
                                        <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground text-sm font-mono">{`https://school.os/`}</span>
                                            <input
                                                type="text"
                                                value={formData.slug}
                                                onChange={e => setFormData({ ...formData, slug: e.target.value })}
                                                className="flex-1 bg-muted/50 border border-border rounded-xl p-4 text-sm font-mono focus:border-primary outline-none"
                                                placeholder="alrowad-int"
                                                aria-label="معرف الرابط (Slug)"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div
                                key={3}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex flex-col items-center justify-center text-center py-10"
                            >
                                <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 mb-6">
                                    <CheckCircle2 size={40} />
                                </div>
                                <h3 className="text-2xl font-black mb-2 text-foreground">جاهز للإنشاء</h3>
                                <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-8">
                                    هذه مراجعة للمدخلات فقط. لن يتم إنشاء مدرسة حتى يتم ربط هذا المسار بتنفيذ فعلي آمن.
                                </p>
                                <div className="bg-muted/30 p-6 rounded-2xl w-full max-w-md text-right space-y-3 mb-8 border border-border">
                                    <div className="flex justify-between">
                                        <span className="opacity-60 text-xs text-muted-foreground">الاسم:</span>
                                        <span className="font-bold text-sm text-foreground">{formData.name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="opacity-60 text-xs text-muted-foreground">الرابط:</span>
                                        <span className="font-bold text-sm font-mono text-primary">/{formData.slug}</span>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Navigation */}
                    <div className="flex justify-between items-center mt-12 pt-6 border-t border-border">
                        <button
                            onClick={prevStep}
                            disabled={step === 1}
                            className="text-xs font-bold text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 px-4 py-2 transition-colors"
                        >
                            <ArrowRight size={14} className="rotate-0 rtl:rotate-180" />
                            السابق
                        </button>

                        {step < 3 ? (
                            <button
                                onClick={nextStep}
                                className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold text-xs hover:opacity-90 transition-opacity flex items-center gap-2"
                            >
                                التالي
                                <ArrowLeft size={14} className="rotate-0 rtl:rotate-180" />
                            </button>
                        ) : (
                            <button
                                onClick={handleCreateSchool}
                                disabled
                                className="bg-stone-200 text-stone-500 px-8 py-3 rounded-xl font-bold text-xs transition-colors flex items-center gap-2 disabled:cursor-not-allowed"
                            >
                                إنشاء غير مفعل
                                <CheckCircle2 size={14} />
                            </button>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}
