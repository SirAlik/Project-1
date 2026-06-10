"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/_context/AuthContext";
import {
    GraduationCap,
    Shield,
    UserCircle,
    KeyRound,
    Lock,
    ArrowLeft,
    Loader2,
    AlertTriangle,
} from "lucide-react";

export function LoginCard() {
    const router = useRouter();
    const { supabase } = useAuth();

    const [gate, setGate] = useState<"staff" | "parent">("staff");
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    // منطق المصادقة — لم يُغيَّر: signInWithPassword ثم مسح persona القديمة ثم الانتقال للبوابة
    const handleLogin = async (e: { preventDefault(): void }) => {
        e.preventDefault();

        if (!email || !password) {
            setError("يرجى إدخال البريد الإلكتروني وكلمة المرور");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const { data: { session }, error: authError } =
                await supabase.auth.signInWithPassword({ email, password });

            if (authError) throw authError;
            if (!session) throw new Error("لم يُنشأ جلسة بعد المصادقة");

            // مسح حالة الـ persona القديمة قبل الانتقال للبوابة
            document.cookie =
                "active_persona=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
            try {
                localStorage.removeItem("active_persona");
                localStorage.removeItem("active_role");
            } catch {
                // بيئة بلا localStorage (SSR أو private mode) — تُتجاهل
            }

            // البوابة هي من تقرأ الأدوار وتعرض RoleCards
            router.replace("/portal");
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "خطأ غير معروف";

            if (message === "Invalid login credentials") {
                setError("بيانات الدخول غير صحيحة");
            } else if (message.includes("Email not confirmed")) {
                setError("البريد الإلكتروني لم يُفعَّل بعد");
            } else {
                setError(message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mx-auto w-full max-w-sm">
            {/* علامة سِدرة */}
            <div className="mb-8 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                    <GraduationCap className="h-6 w-6" />
                </span>
                <div className="leading-none">
                    <p className="text-lg font-black tracking-tight text-foreground">سِدرة</p>
                    <p className="mt-1.5 text-[11px] font-medium text-muted-foreground">
                        نظام تشغيل مدرسي قائم على البيانات
                    </p>
                </div>
            </div>

            {/* العنوان + سطر داعم (charcoal مقروء) */}
            <h1 className="text-2xl font-black tracking-tight text-foreground">تسجيل الدخول</h1>
            <p className="mt-2 text-sm leading-relaxed text-foreground/70">
                ادخل إلى مساحة عملك وتابع مؤشّرات مدرستك وقراراتها.
            </p>

            {/* تبويب البوابة — تجميلي فقط، لا يؤثر على منطق المصادقة */}
            <div className="mt-7 flex gap-1 rounded-2xl border border-border bg-surface-soft p-1">
                <button
                    type="button"
                    onClick={() => { setGate("staff"); setError(""); }}
                    aria-pressed={gate === "staff"}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-colors ${
                        gate === "staff"
                            ? "bg-card text-primary shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                    <Shield className="h-4 w-4" /> الموظفون
                </button>

                <button
                    type="button"
                    onClick={() => { setGate("parent"); setError(""); }}
                    aria-pressed={gate === "parent"}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-colors ${
                        gate === "parent"
                            ? "bg-card text-primary shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                    <UserCircle className="h-4 w-4" /> أولياء الأمور والطلاب
                </button>
            </div>

            <form onSubmit={handleLogin} className="mt-6 space-y-5">
                <div>
                    <label
                        htmlFor="login-identifier"
                        className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-foreground"
                    >
                        <KeyRound className="h-3.5 w-3.5 text-primary" />
                        البريد الإلكتروني
                    </label>
                    <input
                        id="login-identifier"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@school.sa"
                        autoComplete="email"
                        className="w-full rounded-xl border border-input bg-surface-soft px-4 py-3 text-sm font-medium text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                </div>

                <div>
                    <label
                        htmlFor="login-password"
                        className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-foreground"
                    >
                        <Lock className="h-3.5 w-3.5 text-primary" /> كلمة المرور
                    </label>
                    <input
                        id="login-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        className="w-full rounded-xl border border-input bg-surface-soft px-4 py-3 text-sm font-medium text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                </div>

                {error && (
                    <p role="alert" className="flex items-center gap-1.5 text-xs font-bold text-destructive">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {loading ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> جاري تسجيل الدخول...</>
                    ) : (
                        <>دخول إلى النظام <ArrowLeft className="h-4 w-4" /></>
                    )}
                </button>

                <div className="pt-1 text-center">
                    <button
                        type="button"
                        className="text-xs font-bold text-muted-foreground transition-colors hover:text-primary"
                    >
                        نسيت كلمة المرور؟
                    </button>
                </div>
            </form>
        </div>
    );
}
