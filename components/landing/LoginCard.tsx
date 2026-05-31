"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/_context/AuthContext";
import { UserCircle, Shield, Lock, KeyRound, ArrowRight, Loader2 } from "lucide-react";

export function LoginCard() {
    const router = useRouter();
    const { supabase } = useAuth();

    const [gate, setGate] = useState<"staff" | "parent">("staff");
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

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
        <div className="relative group">
            <div className="absolute -inset-4 bg-primary/20 blur-3xl opacity-30 group-hover:opacity-100 transition-opacity duration-1000" />

            <div className="bg-glass p-8 md:p-10 rounded-[2.5rem] border border-glass shadow-panel relative z-10 w-full max-w-md mx-auto">
                <div className="text-center mb-10">
                    <h2 className="text-2xl font-black tracking-tight mb-2 text-foreground">
                        تسجيل الدخول
                    </h2>
                    <p className="text-[10px] font-bold opacity-55 uppercase tracking-[0.2em] text-muted-foreground">
                        Smart School Management OS
                    </p>
                </div>

                {/* تبويب البوابة — تجميلي فقط، لا يؤثر على منطق المصادقة */}
                <div className="flex p-1.5 bg-background/50 rounded-2xl mb-8 border border-border">
                    <button
                        type="button"
                        onClick={() => { setGate("staff"); setError(""); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all ${
                            gate === "staff"
                                ? "bg-panel shadow-md text-primary"
                                : "opacity-40 hover:opacity-100 text-muted-foreground"
                        }`}
                    >
                        <Shield className="w-4 h-4" /> الموظفين
                    </button>

                    <button
                        type="button"
                        onClick={() => { setGate("parent"); setError(""); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all ${
                            gate === "parent"
                                ? "bg-panel shadow-md text-primary"
                                : "opacity-40 hover:opacity-100 text-muted-foreground"
                        }`}
                    >
                        <UserCircle className="w-4 h-4" /> أولياء الأمور
                    </button>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase opacity-40 tracking-widest pr-4 flex items-center gap-2 text-muted-foreground">
                            <KeyRound className="w-3 h-3" />{" "}
                            {gate === "staff" ? "البريد الإلكتروني" : "رقم الهوية / الجوال"}
                        </label>
                        <input
                            type={gate === "staff" ? "email" : "text"}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={gate === "staff" ? "admin@school.os" : "SA..."}
                            autoComplete={gate === "staff" ? "email" : "username"}
                            className="w-full bg-background border border-input rounded-2xl px-6 py-4 text-sm outline-none font-bold tracking-tight text-foreground placeholder:text-muted-foreground/50 transition-all focus:border-primary focus:ring-2 focus:ring-primary/25 focus:ring-offset-0 shadow-inner shadow-black/5"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase opacity-40 tracking-widest pr-4 flex items-center gap-2 text-muted-foreground">
                            <Lock className="w-3 h-3" /> كلمة المرور
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            autoComplete="current-password"
                            className="w-full bg-background border border-input rounded-2xl px-6 py-4 text-sm outline-none font-bold tracking-tight text-foreground placeholder:text-muted-foreground/50 transition-all focus:border-primary focus:ring-2 focus:ring-primary/25 focus:ring-offset-0 shadow-inner shadow-black/5"
                        />
                    </div>

                    {error && (
                        <p className="text-[10px] font-black text-destructive pr-4 leading-relaxed">
                            ⚠️ {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary text-primary-foreground py-4 rounded-2xl text-xs font-black transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3 hover:opacity-90 hover:shadow-2xl hover:shadow-primary/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> جاري تسجيل الدخول...</>
                        ) : (
                            <>دخول للنظام <ArrowRight className="w-4 h-4 rotate-180" /></>
                        )}
                    </button>

                    <div className="pt-4 flex justify-between items-center px-2">
                        <button
                            type="button"
                            className="text-[10px] font-black opacity-30 hover:opacity-100 transition-opacity text-muted-foreground"
                        >
                            نسيت كلمة المرور؟
                        </button>
                        <p className="text-[10px] font-black opacity-30 text-muted-foreground">
                            {gate === "staff" ? "Staff Gate" : "Parent Gate"}
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}
