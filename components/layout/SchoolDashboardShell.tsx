'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GraduationCap, Menu, X } from 'lucide-react';
import { NotificationsMenu } from './NotificationsMenu';
import { UserMenu } from './UserMenu';
import { getRoleInfo, type UserRole } from '@/lib/auth/roles';
import { getSchoolNav, type SchoolNavItem } from '@/lib/navigation/school-nav';

/**
 * SchoolDashboardShell — إطار لوحات أدوار المدرسة (tenant) المنفصل عن PlatformShell.
 *
 * يوفّر:
 *  - شريط جانبي على اليمين (RTL) في سطح المكتب، وقائمة منزلقة (drawer) في الجوال.
 *  - شريط علوي (topbar) داخل التدفّق (sticky) يحمل اسم المدرسة + الدور (عربي) + الإشعارات + قائمة المستخدم.
 *  - منطقة محتوى بمساحة موحّدة وحدّ أقصى متوازن للعرض.
 *
 * بلا أي اختراق تخطيط: لا هوامش سالبة، ولا حشو علوي عام في الجذر — كل ترويسة ثابتة تملك مباعدها داخل التدفّق.
 * الشريط الجانبي role-aware عبر getSchoolNav (مسارات حقيقية فقط).
 */

interface SchoolDashboardShellProps {
    schoolId: string;
    schoolName: string;
    role: UserRole;
    children: React.ReactNode;
}

export function SchoolDashboardShell({ schoolId, schoolName, role, children }: SchoolDashboardShellProps) {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);

    const nav = getSchoolNav(role, schoolId);
    const roleLabel = getRoleInfo(role).labelAr;

    const sidebarBody = (
        <div className="flex h-full flex-col">
            {/* العلامة: سِدرة + الوسم الرسمي */}
            <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                    <GraduationCap className="h-5 w-5" />
                </span>
                <span className="leading-none">
                    <span className="block text-sm font-black tracking-tight text-foreground">سِدرة</span>
                    <span className="mt-1 block text-[10px] font-bold text-muted-foreground">
                        نظام تشغيل مدرسي قائم على البيانات
                    </span>
                </span>
            </div>

            {/* التنقّل */}
            <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
                {nav.map((group) => (
                    <div key={group.title}>
                        <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            {group.title}
                        </p>
                        <ul className="space-y-1">
                            {group.items.map((item) => (
                                <NavLink
                                    key={item.label}
                                    item={item}
                                    active={!!item.href && pathname === item.href}
                                    onNavigate={() => setMobileOpen(false)}
                                />
                            ))}
                        </ul>
                    </div>
                ))}
            </nav>
        </div>
    );

    return (
        <div dir="rtl" className="min-h-screen bg-background">
            <div className="flex min-h-screen">
                {/* الشريط الجانبي — سطح المكتب (يمين في RTL) */}
                <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-l border-border bg-card lg:flex">
                    {sidebarBody}
                </aside>

                {/* العمود الرئيسي */}
                <div className="flex min-w-0 flex-1 flex-col">
                    {/* الشريط العلوي */}
                    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6">
                        <div className="flex min-w-0 items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setMobileOpen(true)}
                                aria-label="فتح القائمة"
                                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-foreground transition-colors hover:bg-muted lg:hidden"
                            >
                                <Menu className="h-5 w-5" />
                            </button>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-black text-foreground">{schoolName}</p>
                                <p className="text-[11px] font-bold text-muted-foreground">{roleLabel}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <NotificationsMenu />
                            <UserMenu />
                        </div>
                    </header>

                    <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
                        <div className="mx-auto max-w-6xl">{children}</div>
                    </main>
                </div>
            </div>

            {/* القائمة المنزلقة — الجوال */}
            {mobileOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <button
                        type="button"
                        aria-label="إغلاق القائمة"
                        onClick={() => setMobileOpen(false)}
                        className="absolute inset-0 bg-foreground/30"
                    />
                    <aside className="absolute right-0 top-0 h-full w-72 border-l border-border bg-card shadow-xl">
                        <button
                            type="button"
                            onClick={() => setMobileOpen(false)}
                            aria-label="إغلاق"
                            className="absolute left-3 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                            <X className="h-5 w-5" />
                        </button>
                        {sidebarBody}
                    </aside>
                </div>
            )}
        </div>
    );
}

function NavLink({
    item,
    active,
    onNavigate,
}: {
    item: SchoolNavItem;
    active: boolean;
    onNavigate: () => void;
}) {
    const Icon = item.icon;

    // عنصر مخطّط بلا مسار حقيقي → معطّل مع شارة «قريباً» (لا رابط وهمي).
    if (!item.href || item.comingSoon) {
        return (
            <li>
                <span className="flex cursor-not-allowed items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm font-bold text-muted-foreground/60">
                    <span className="flex items-center gap-3">
                        <Icon className="h-4 w-4" />
                        {item.label}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-black text-muted-foreground">
                        قريباً
                    </span>
                </span>
            </li>
        );
    }

    return (
        <li>
            <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold transition-colors ${
                    active
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground hover:bg-muted'
                }`}
            >
                <Icon className="h-4 w-4" />
                {item.label}
            </Link>
        </li>
    );
}
