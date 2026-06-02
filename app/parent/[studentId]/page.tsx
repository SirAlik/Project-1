"use client";

import type { ReactNode } from "react";
import { useParams } from "next/navigation";
import { BookOpen, FileWarning, MessageSquare, UserRound } from "lucide-react";

import { Card } from "@/components/ui/Card";

export default function ParentDashboardPage() {
    const params = useParams<{ studentId?: string }>();
    const studentId = params?.studentId ?? "غير محدد";

    return (
        <main className="min-h-screen bg-stone-50 text-foreground px-6 py-10" dir="rtl">
            <div className="mx-auto flex max-w-5xl flex-col gap-8">
                <header className="rounded-[2rem] border border-stone-200 bg-white/85 p-8 shadow-sm">
                    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <UserRound className="h-7 w-7" />
                    </div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        بوابة ولي الأمر
                    </p>
                    <h1 className="text-3xl font-black tracking-tight text-foreground">
                        لا توجد بيانات طالب جاهزة للعرض
                    </h1>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
                        تم إيقاف لوحة البيانات السابقة لأنها كانت تعتمد على بيانات ثابتة. سيظهر هذا المسار بيانات الطالب بعد ربطه بخدمات الحضور، التحصيل، السلوك، والصحة من قاعدة البيانات الفعلية.
                    </p>
                    <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-xs font-bold text-stone-600">
                        معرف الطالب المطلوب: {studentId}
                    </div>
                </header>

                <div className="grid gap-4 md:grid-cols-3">
                    <EmptyCapability
                        icon={<BookOpen className="h-5 w-5" />}
                        title="التحصيل والحضور"
                        body="لا يتم عرض أي مؤشر حتى يتوفر مصدر بيانات حقيقي ومقيد بولي الأمر."
                    />
                    <EmptyCapability
                        icon={<MessageSquare className="h-5 w-5" />}
                        title="التواصل المدرسي"
                        body="طلبات التواصل ستبقى معطلة هنا حتى تعتمد Server Actions موثقة."
                    />
                    <EmptyCapability
                        icon={<FileWarning className="h-5 w-5" />}
                        title="التقارير"
                        body="لا يتم توليد تقارير PDF من بيانات غير متصلة أو تقديرية."
                    />
                </div>
            </div>
        </main>
    );
}

function EmptyCapability({
    icon,
    title,
    body,
}: {
    icon: ReactNode;
    title: string;
    body: string;
}) {
    return (
        <Card className="border-stone-200 bg-white/85 p-6 shadow-sm">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {icon}
            </div>
            <h2 className="text-base font-black text-foreground">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
        </Card>
    );
}
