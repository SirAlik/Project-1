import React from "react";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { NotificationsMenu } from "./NotificationsMenu";
import { UserMenu } from "./UserMenu";

/**
 * PlatformShell — إطار منطقة المنصّة (مالك النظام) فقط.
 * يستبدل GlobalHeader داخل /platform بترويسة «سِدرة» نظيفة + قائمة المستخدم والإشعارات.
 * الجذر app/layout.tsx لم يَعُد يفرض حشواً علوياً عاماً؛ كل ترويسة ثابتة (fixed) تحجز مساحتها بنفسها عبر مباعد
 * داخلي، وترويسة هذه الواجهة sticky داخل التدفّق — فلا حاجة لأي هامش سالب أو إلغاء حشو.
 */
export function PlatformShell({ children }: { children: React.ReactNode }) {
    return (
        <div dir="rtl" className="min-h-screen bg-background">
            <header className="sticky top-0 z-40 border-b border-border bg-background">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-6">
                    <div className="flex items-center gap-3">
                        <Link href="/platform/dashboard" className="flex items-center gap-2.5">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                                <GraduationCap className="h-5 w-5" />
                            </span>
                            <span className="leading-none">
                                <span className="block text-sm font-black tracking-tight text-foreground">سِدرة</span>
                                <span className="mt-1 block text-[10px] font-bold text-muted-foreground">منصّة التشغيل</span>
                            </span>
                        </Link>
                        <span className="hidden items-center gap-1.5 rounded-full border border-border bg-surface-soft px-2.5 py-1 text-[11px] font-bold text-foreground sm:inline-flex">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                            مالك النظام
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <NotificationsMenu />
                        <UserMenu />
                    </div>
                </div>
            </header>

            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
        </div>
    );
}
