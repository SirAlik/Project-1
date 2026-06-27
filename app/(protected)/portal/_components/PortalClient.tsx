"use client";

import { useState } from "react";
import { Persona, useAuth } from "@/app/_context/AuthContext";
import { GLOBAL_ROLES } from "@/lib/auth/roles";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft, AlertCircle, School, GraduationCap, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { getRoleDisplay } from "./roleDisplay";

interface PortalClientProps {
    personas: Persona[];
    userName?: string;
}

export function PortalClient({ personas, userName }: PortalClientProps) {
    const [switchingTo, setSwitchingTo] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [signingOut, setSigningOut] = useState(false);
    const router = useRouter();
    const { signOut } = useAuth();

    // تسجيل الخروج — نفس نمط UserMenu: signOut من AuthContext ثم تحويل كامل لصفحة الدخول
    const handleSignOut = async () => {
        setSigningOut(true);
        try {
            await signOut();
        } finally {
            window.location.href = "/login";
        }
    };

    // منطق اختيار الدور (persona selection) — لم يُغيَّر إطلاقاً
    const handleSwitch = async (persona: Persona) => {
        const uniqueId = `${persona.role}-${persona.schoolId || "global"}`;
        setSwitchingTo(uniqueId);
        setError(null);

        console.log("[Portal] Selecting persona:", { role: persona.role, schoolId: persona.schoolId ? "***" : "null" });

        try {
            // Normalize schoolId: prevent sending "null", "undefined", or "" as strings
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
                    // التفاصيل التقنية مُسجَّلة في console.error أعلاه — رسالة آمنة للمستخدم
                    setError("تعذّر تفعيل الدور، يرجى المحاولة لاحقاً");
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
        show: { opacity: 1, transition: { staggerChildren: 0.06 } },
    };
    const item = {
        hidden: { opacity: 0, y: 16 },
        show: { opacity: 1, y: 0 },
    };

    return (
        <div
            dir="rtl"
            className="relative flex min-h-screen items-center justify-center bg-background px-6 py-10"
        >
            {/* تسجيل الخروج (لمن دخل بحساب خاطئ) */}
            <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                aria-label="تسجيل الخروج"
                className="absolute left-5 top-5 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-destructive disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
                {signingOut ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
                تسجيل الخروج
            </button>

            <div className="w-full max-w-5xl">
                {/* علامة سِدرة */}
                <div className="mb-8 flex flex-col items-center text-center">
                    <span className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                            <GraduationCap className="h-5 w-5" />
                        </span>
                        <span className="text-lg font-black tracking-tight text-foreground">سِدرة</span>
                    </span>
                    <p className="mt-2 text-xs font-medium text-muted-foreground">
                        نظام تشغيل مدرسي قائم على البيانات
                    </p>
                </div>

                {/* الترحيب + التوجيه */}
                <div className="text-center">
                    <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                        مرحباً بك، <span className="text-primary">{userName || "المستخدم"}</span>
                    </h1>
                    <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-foreground/70 sm:text-base">
                        اختر الدور الذي تريد المتابعة به داخل المدرسة.
                    </p>
                    {error && (
                        <div className="mt-5 inline-flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm font-bold text-destructive">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            {error}
                        </div>
                    )}
                </div>

                {/* شبكة الأدوار */}
                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                >
                    {personas.map((persona) => {
                        const { labelAr, description, icon: Icon } = getRoleDisplay(persona.role);
                        const uniqueId = `${persona.role}-${persona.schoolId || "global"}`;
                        const isSwitching = switchingTo === uniqueId;

                        // Global roles (system_owner) do NOT need schoolId; others require it
                        const isGlobal = GLOBAL_ROLES.has(persona.role);
                        const needsSchool = !isGlobal && !persona.schoolId;
                        const isDisabled = needsSchool || !!switchingTo;

                        return (
                            <motion.button
                                key={uniqueId}
                                variants={item}
                                disabled={isDisabled}
                                onClick={() => !needsSchool && handleSwitch(persona)}
                                aria-label={`الدخول كـ ${labelAr}${persona.schoolName ? ` — ${persona.schoolName}` : ""}`}
                                className={`group relative flex flex-col items-start rounded-2xl border p-5 text-right shadow-sm transition-all duration-200
                                    ${needsSchool
                                        ? "cursor-not-allowed border-border bg-muted/40 opacity-70"
                                        : "border-border bg-card hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"}
                                    ${isSwitching ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}
                                    ${!isDisabled
                                        ? "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                        : ""}`}
                            >
                                {/* أيقونة الدور */}
                                <span
                                    className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-colors
                                        ${needsSchool
                                            ? "bg-muted text-muted-foreground"
                                            : "bg-accent text-primary group-hover:bg-primary group-hover:text-primary-foreground"}`}
                                >
                                    {isSwitching ? (
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                    ) : needsSchool ? (
                                        <AlertCircle className="h-6 w-6" />
                                    ) : (
                                        <Icon className="h-6 w-6" />
                                    )}
                                </span>

                                {/* الاسم العربي */}
                                <h2 className={`mt-4 text-lg font-black ${needsSchool ? "text-muted-foreground" : "text-foreground"}`}>
                                    {labelAr}
                                </h2>

                                {/* وصف موجز للدور */}
                                <p className="mt-1 text-xs leading-relaxed text-foreground/70">{description}</p>

                                {/* المدرسة / الجهة */}
                                {persona.schoolName ? (
                                    <span className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
                                        <School className="h-3.5 w-3.5" />
                                        {persona.schoolName}
                                    </span>
                                ) : persona.role === "system_owner" ? (
                                    <span className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
                                        <School className="h-3.5 w-3.5" />
                                        النظام المركزي
                                    </span>
                                ) : null}

                                {/* تنبيه نقص المدرسة */}
                                {needsSchool && (
                                    <span className="mt-3 rounded-full bg-warning/10 px-2.5 py-1 text-[10px] font-bold text-warning">
                                        لم يتم تعيين مدرسة
                                    </span>
                                )}

                                {/* المسمّى الوظيفي إن وُجد */}
                                {persona.jobTitle && !needsSchool && (
                                    <span className="mt-3 rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold text-primary">
                                        {persona.jobTitle}
                                    </span>
                                )}

                                {/* سهم الدخول (يظهر عند المرور) */}
                                {!needsSchool && (
                                    <span className="absolute left-5 top-5 text-primary opacity-0 transition-all duration-200 group-hover:-translate-x-0.5 group-hover:opacity-100">
                                        <ArrowLeft className="h-5 w-5" />
                                    </span>
                                )}
                            </motion.button>
                        );
                    })}
                </motion.div>

                {/* تذييل مساعد */}
                <p className="mt-10 text-center text-xs text-muted-foreground">
                    تظهر لك فقط الأدوار المرتبطة بحسابك وصلاحياتك.
                </p>
            </div>
        </div>
    );
}
