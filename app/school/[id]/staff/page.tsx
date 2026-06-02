import React from "react";
import Link from "next/link";
import {
    Users,
    UserPlus,
    GraduationCap,
    Shield,
    School,
    ClipboardCheck,
    HeartPulse,
    FlaskConical,
    CalendarDays,
} from "lucide-react";
import { getSchoolStaff, type StaffMember } from "@/app/_actions/staff";

// نفس IDs اللي تستخدمها في staff/new (عشان نعرض أسماء عربية بدل ids)
const ROLE_LABELS: Record<string, { label: string; icon?: React.ElementType }> = {
    system_owner: { label: "مالك النظام", icon: Shield },
    school_admin: { label: "منسق المدرسة", icon: ClipboardCheck },
    school_principal: { label: "مدير المدرسة", icon: School },
    school_affairs_vp: { label: "وكيل الشؤون المدرسية", icon: Shield },
    student_affairs_vp: { label: "وكيل شؤون الطلاب", icon: Users },
    academic_vp: { label: "وكيل الشؤون التعليمية", icon: ClipboardCheck },
    student_counselor: { label: "الموجه الطلابي", icon: ClipboardCheck },
    teacher: { label: "معلم", icon: GraduationCap },
    school_secretary: { label: "سكرتير", icon: ClipboardCheck },
    health_coordinator: { label: "الموجه الصحي", icon: HeartPulse },
    lab_technician: { label: "محضر المختبر", icon: FlaskConical },
    school_librarian: { label: "أمين مصادر التعلم", icon: ClipboardCheck },
    activity_leader: { label: "رائد النشاط", icon: CalendarDays },
};

function roleToLabel(roleId: string) {
    return ROLE_LABELS[roleId]?.label ?? roleId;
}

export default async function StaffPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const schoolId = params.id;

    const result = await getSchoolStaff({ schoolId });

    // ✅ لو عندك نمط createSafeAction: غالباً يجيك serverError / data
    const staff: StaffMember[] = result?.data ?? [];
    const serverError: string | undefined = result?.serverError;

    return (
        <div className="min-h-screen text-foreground p-6 lg:p-12" dir="rtl">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <header className="mb-10 flex items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-600">
                                <Users size={24} />
                            </div>
                            <h1 className="text-3xl font-black text-foreground">إدارة الموظفين</h1>
                        </div>
                        <p className="text-muted-foreground opacity-80">
                            إدارة المعلمين والإداريين والصلاحيات داخل المدرسة
                        </p>
                    </div>

                    <Link
                        href={`/school/${schoolId}/staff/new`}
                        className="px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2 shadow-sm"
                    >
                        <UserPlus size={18} />
                        <span>إضافة موظف</span>
                    </Link>
                </header>

                {/* Error */}
                {serverError && (
                    <div className="mb-8 p-4 rounded-2xl border border-red-500/20 bg-red-500/10 text-red-400">
                        <p className="font-bold">❌ تعذّر جلب بيانات الموظفين</p>
                        <p className="text-sm opacity-80 mt-1">{serverError}</p>
                    </div>
                )}

                {/* Empty */}
                {!serverError && staff.length === 0 && (
                    <div className="bg-card p-16 text-center border border-border rounded-[2rem] shadow-sm">
                        <Users className="w-16 h-16 mx-auto mb-6 opacity-30 text-muted-foreground" />
                        <h3 className="text-xl font-bold mb-2 text-foreground">لا يوجد موظفون مسجلون حالياً</h3>
                        <p className="text-sm opacity-70 max-w-md mx-auto mb-8 text-muted-foreground">
                            ابدأ بإضافة الموظفين لبناء فريق العمل وتحديد صلاحياتهم.
                        </p>
                        <Link
                            href={`/school/${schoolId}/staff/new`}
                            className="inline-flex px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 transition-opacity items-center gap-2 shadow-sm"
                        >
                            <UserPlus size={18} />
                            <span>إضافة موظف جديد</span>
                        </Link>
                    </div>
                )}

                {/* Grid */}
                {!serverError && staff.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {staff.map((member) => {
                            const initials =
                                (member.full_name?.trim()?.[0] || member.email?.trim()?.[0] || "?").toUpperCase();

                            return (
                                <div
                                    key={member.id}
                                    className="bg-card p-6 rounded-2xl border border-border hover:border-primary/50 transition-all shadow-sm"
                                >
                                    <div className="flex items-start justify-between gap-3 mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center text-lg font-black text-foreground">
                                                {initials}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-card-foreground leading-tight">
                                                    {member.full_name || "بدون اسم"}
                                                </h3>
                                                <p className="text-xs text-muted-foreground opacity-80 break-all">
                                                    {member.email || "—"}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Roles badges */}
                                        <div className="flex flex-col gap-1 items-end">
                                            {(member.roles || []).slice(0, 4).map((roleId: string) => (
                                                <span
                                                    key={roleId}
                                                    title={roleId}
                                                    className="text-[10px] px-2 py-0.5 rounded-full bg-muted/50 border border-border text-muted-foreground"
                                                >
                                                    {roleToLabel(roleId)}
                                                </span>
                                            ))}

                                            {(member.roles || []).length > 4 && (
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted/50 border border-border text-muted-foreground">
                                                    +{(member.roles || []).length - 4}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-border flex items-center justify-between text-xs opacity-90">
                                        <span className="text-emerald-500 font-medium">نشط</span>
                                        <span className="text-muted-foreground">
                                            #{String(member.id || "").slice(0, 6)}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Sticky Add Button (اختياري بس عملي جدًا) */}
                <div className="fixed bottom-6 left-6 right-6 md:hidden">
                    <Link
                        href={`/school/${schoolId}/staff/new`}
                        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-primary text-primary-foreground font-black shadow-lg"
                    >
                        <UserPlus size={18} />
                        إضافة موظف
                    </Link>
                </div>
            </div>
        </div>
    );
}