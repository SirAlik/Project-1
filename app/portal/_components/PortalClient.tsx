"use client";

import React, { useState } from "react";
import { Persona } from "@/app/_context/AuthContext";
import { getRoleInfo, GLOBAL_ROLES } from "@/lib/auth/roles";
import { motion } from "framer-motion";
import { Loader2, ArrowRight, AlertCircle, FlaskConical } from "lucide-react";
import { useRouter } from "next/navigation";

const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';



interface PortalClientProps {
    personas: Persona[];
    userName?: string;
}

export function PortalClient({ personas, userName }: PortalClientProps) {
    const [switchingTo, setSwitchingTo] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleSwitch = async (persona: Persona) => {
        const uniqueId = `${persona.role}-${persona.schoolId || "global"}`;
        setSwitchingTo(uniqueId);
        setError(null);

        console.log("[Portal] Selecting persona:", { role: persona.role, schoolId: persona.schoolId ? "***" : "null" });

        try {
            // Normalize schoolId: prevent sending "null", "undefined", or "" as strings
            // Belt + suspenders: check typeof AND use spread to OMIT key when invalid
            const normalizedSchoolId: string | undefined =
                typeof persona.schoolId === 'string' &&
                    persona.schoolId &&
                    persona.schoolId !== 'null' &&
                    persona.schoolId !== 'undefined' &&
                    persona.schoolId.trim() !== ''
                    ? persona.schoolId
                    : undefined;

            // Global roles (system_owner) do not need schoolId
            const isGlobal = persona.role === 'system_owner';

            const res = await fetch("/api/persona/select", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    role: persona.role,
                    // Only send schoolId if it's NOT a global role AND it's valid
                    // This fixes the issue where global roles were sending implicit undefined/nulls
                    ...(!isGlobal && normalizedSchoolId ? { schoolId: normalizedSchoolId } : {}),
                }),
                credentials: "same-origin",
                cache: "no-store",
            });



            if (res.ok) {
                const { redirectPath } = await res.json();
                console.log("[Portal] Redirecting to:", redirectPath);
                router.refresh();
                router.replace(redirectPath);
            } else {
                const err = await res.json().catch(() => ({}));
                console.error("[Portal] Failed:", res.status, err);

                if (err.error === 'SCHOOL_CONTEXT_REQUIRED') {
                    setError("هذا الدور يتطلب تحديد المدرسة");
                } else if (err.error === 'MISSING_DASHBOARD_MAPPING') {
                    setError("هذا الدور صحيح لكن لا توجد صفحة مرتبطة به في النظام (Dashboard Mapping). راجع إعدادات الأدوار.");
                } else {
                    setError(err.message || "فشل تفعيل الدور");
                }
                setSwitchingTo(null);
            }
        } catch (error) {
            console.error("[Portal] Network error:", error);
            setError("حدث خطأ في الاتصال");
            setSwitchingTo(null);
        }
    };

    const container = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    // Global roles that do NOT require a school context
    // Imported from registry
    // const GLOBAL_ROLES = new Set(['system_owner']);

    return (
        <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-background font-saudi" dir="rtl">
            <div className="w-full max-w-4xl space-y-8">

                {IS_DEMO && (
                    <div className="flex items-center justify-center gap-3 px-5 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                        <FlaskConical className="w-5 h-5 text-amber-500 shrink-0" />
                        <div className="text-center">
                            <span className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">وضع تجريبي</span>
                            <span className="text-xs text-amber-700/70 dark:text-amber-300/70 font-medium"> — جميع البيانات وهمية ومعزولة عن الإنتاج</span>
                        </div>
                    </div>
                )}

                <div className="text-center space-y-4">
                    <h1 className="text-3xl font-black text-foreground">
                        مرحباً بك، <span className="text-primary">{userName || "المستخدم"}</span>
                    </h1>
                    <p className="text-muted-foreground text-lg">
                        الرجاء اختيار الدور للمتابعة
                    </p>
                    {error && (
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive rounded-lg text-sm">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}
                </div>

                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                    {personas.map((persona) => {
                        const { label, icon: Icon } = getRoleInfo(persona.role);
                        const uniqueId = `${persona.role}-${persona.schoolId || "global"}`;
                        const isSwitching = switchingTo === uniqueId;

                        // Scope check:
                        // - Global roles (system_owner) do NOT need schoolId
                        // - All other roles require schoolId
                        const isGlobal = GLOBAL_ROLES.has(persona.role);
                        const needsSchool = !isGlobal && !persona.schoolId;
                        const isDisabled = needsSchool || !!switchingTo;

                        return (
                            <motion.button
                                key={uniqueId}
                                variants={item}
                                disabled={isDisabled}
                                onClick={() => !needsSchool && handleSwitch(persona)}
                                className={`
                                    relative group
                                    flex flex-col items-start text-right p-6 rounded-3xl
                                    border transition-all duration-300 shadow-sm
                                    ${needsSchool
                                        ? 'border-border/50 bg-muted/30 cursor-not-allowed opacity-60'
                                        : 'border-border/60 bg-card hover:border-primary/50 hover:shadow-lg hover:-translate-y-1'}
                                    ${isSwitching ? 'scale-[0.98] ring-2 ring-primary ring-offset-2' : ''}
                                `}
                            >
                                <div className={`
                                    w-12 h-12 rounded-2xl flex items-center justify-center mb-4
                                    ${needsSchool
                                        ? 'bg-muted text-muted-foreground'
                                        : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground'}
                                    transition-colors
                                `}>
                                    {isSwitching ? (
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                    ) : needsSchool ? (
                                        <AlertCircle className="w-6 h-6" />
                                    ) : (
                                        <Icon className="w-6 h-6" />
                                    )}
                                </div>

                                <h3 className={`text-xl font-bold mb-2 transition-colors
                                    ${needsSchool ? 'text-muted-foreground' : 'text-foreground group-hover:text-primary'}
                                `}>
                                    {label}
                                </h3>

                                {persona.schoolName && (
                                    <p className="text-sm font-medium text-muted-foreground/80 mb-1">
                                        {persona.schoolName}
                                    </p>
                                )}

                                {needsSchool && (
                                    <p className="text-xs text-warning font-medium bg-warning/10 px-2 py-1 rounded-full">
                                        لم يتم تعيين مدرسة
                                    </p>
                                )}

                                {persona.jobTitle && !needsSchool && (
                                    <p className="text-xs text-primary/80 font-bold bg-primary/10 px-2 py-1 rounded-full">
                                        {persona.jobTitle}
                                    </p>
                                )}

                                {!needsSchool && (
                                    <div className="absolute top-6 left-6 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1 duration-300 text-primary rtl:rotate-180">
                                        <ArrowRight className="w-5 h-5" />
                                    </div>
                                )}
                            </motion.button>
                        );
                    })}
                </motion.div>

                <div className="text-center pt-8">
                    <p className="bold text-xs text-muted-foreground opacity-70 uppercase tracking-widest">
                        منصة مدارس الفلاح الذكية • Smart School OS
                    </p>
                </div>
            </div>
        </main>
    );
}

