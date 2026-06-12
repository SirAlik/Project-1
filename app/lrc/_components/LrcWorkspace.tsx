'use client';

import React, { useState } from 'react';
import {
    GraduationCap,
    Menu,
    X,
    LayoutDashboard,
    BookOpen,
    BookMarked,
    Calendar,
    Users,
    BarChart3,
    FileCheck2,
    Sparkles,
    Globe,
    Settings,
    ShieldCheck,
    type LucideIcon,
} from 'lucide-react';
import { NotificationsMenu } from '@/components/layout/NotificationsMenu';
import { UserMenu } from '@/components/layout/UserMenu';
import { getRoleInfo, type UserRole } from '@/lib/auth/roles';
import { useLRC } from '../_hooks/useLRC';
import { LrcOverview } from './LrcOverview';
import { BookList } from './BookList';
import { LendingDesk } from './LendingDesk';
import { BookingManager } from './BookingManager';
import { ClassVisitManager } from './ClassVisitManager';
import { LrcDashboard } from './LrcDashboard';
import { LrcQualityForms } from './LrcQualityForms';
import { generateLRCCertificate } from './CertificateGenerator';

type LrcView = 'overview' | 'books' | 'lending' | 'bookings' | 'visits' | 'reports' | 'quality';

interface NavItem {
    key: LrcView;
    label: string;
    icon: LucideIcon;
}
interface NavGroup {
    title: string;
    items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
    { title: 'نظرة عامة', items: [{ key: 'overview', label: 'الرئيسية', icon: LayoutDashboard }] },
    {
        title: 'العمليات',
        items: [
            { key: 'books', label: 'الفهرس', icon: BookOpen },
            { key: 'lending', label: 'الإعارة', icon: BookMarked },
            { key: 'bookings', label: 'الحجوزات', icon: Calendar },
            { key: 'visits', label: 'الزيارات', icon: Users },
        ],
    },
    {
        title: 'الجودة والتقارير',
        items: [
            { key: 'reports', label: 'التقارير', icon: BarChart3 },
            { key: 'quality', label: 'نماذج الجودة والتصدير', icon: FileCheck2 },
        ],
    },
];

// عناصر مخطّطة بلا واجهة بعد — تُعرض «قريباً» معطّلة (بلا روابط/خدمات وهمية)
const SOON_ITEMS: { label: string; icon: LucideIcon }[] = [
    { label: 'الفهرسة الذكية', icon: Sparkles },
    { label: 'الفهرس العام', icon: Globe },
    { label: 'الإعدادات', icon: Settings },
];

export function LrcWorkspace({ schoolName, role }: { schoolName: string; role: UserRole }) {
    const { state, actions } = useLRC();
    const [view, setView] = useState<LrcView>('overview');
    const [mobileOpen, setMobileOpen] = useState(false);

    const roleLabel = getRoleInfo(role).labelAr;
    const pendingBookings = state.bookings.filter((b) => b.status === 'pending').length;
    const topStudentName = state.stats?.topStudents?.[0]?.name;

    const go = (v: LrcView) => {
        setView(v);
        setMobileOpen(false);
    };

    const sidebarBody = (
        <div className="flex h-full flex-col">
            {/* العلامة: سِدرة */}
            <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                    <GraduationCap className="h-5 w-5" />
                </span>
                <span className="leading-none">
                    <span className="block text-sm font-black tracking-tight text-foreground">سِدرة</span>
                    <span className="mt-1 block text-[10px] font-bold text-muted-foreground">مركز مصادر التعلم</span>
                </span>
            </div>

            <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
                {NAV_GROUPS.map((group) => (
                    <div key={group.title}>
                        <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">{group.title}</p>
                        <ul className="space-y-1">
                            {group.items.map((item) => {
                                const Icon = item.icon;
                                const active = view === item.key;
                                return (
                                    <li key={item.key}>
                                        <button
                                            type="button"
                                            onClick={() => go(item.key)}
                                            aria-current={active ? 'page' : undefined}
                                            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-right text-sm font-bold transition-colors ${
                                                active ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'
                                            }`}
                                        >
                                            <Icon className="h-4 w-4 shrink-0" />
                                            {item.label}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}

                {/* قريباً */}
                <div>
                    <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">قريباً</p>
                    <ul className="space-y-1">
                        {SOON_ITEMS.map((item) => {
                            const Icon = item.icon;
                            return (
                                <li key={item.label}>
                                    <span className="flex cursor-not-allowed items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm font-bold text-muted-foreground/60">
                                        <span className="flex items-center gap-3">
                                            <Icon className="h-4 w-4 shrink-0" />
                                            {item.label}
                                        </span>
                                        <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-black text-muted-foreground">قريباً</span>
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
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
                    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-background px-4 sm:px-6">
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
                                <p className="truncate text-sm font-black text-foreground">{schoolName || 'مركز مصادر التعلم'}</p>
                                <p className="text-[11px] font-bold text-muted-foreground">{roleLabel}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <NotificationsMenu />
                            <UserMenu />
                        </div>
                    </header>

                    <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
                        <div className="mx-auto max-w-6xl space-y-6">
                            {/* عنوان السياق */}
                            <div>
                                <h1 className="text-2xl font-black tracking-tight text-foreground">بوابة أمين المصادر</h1>
                                <p className="mt-1 text-sm font-medium text-muted-foreground">إدارة مركز مصادر التعلم: الفهرس · الإعارة · الزيارات · الحجوزات · نماذج الجودة</p>
                            </div>

                            {/* رسالة العملية */}
                            {state.msg && (
                                <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-bold text-foreground">
                                    <span className="flex items-center gap-2">
                                        <ShieldCheck className="h-4 w-4 text-primary" />
                                        {state.msg}
                                    </span>
                                    <button onClick={() => actions.setMsg('')} className="text-xs text-muted-foreground hover:text-foreground">
                                        إغلاق
                                    </button>
                                </div>
                            )}

                            {/* المحتوى */}
                            {view === 'overview' && (
                                <LrcOverview stats={state.stats} pendingBookings={pendingBookings} onNavigate={(v) => go(v)} />
                            )}
                            {view === 'books' && <BookList books={state.books} onAdd={actions.addBook} />}
                            {view === 'lending' && (
                                <LendingDesk
                                    books={state.books}
                                    loans={state.loans}
                                    students={state.students}
                                    teachers={state.teachers}
                                    onBorrow={actions.borrowBook}
                                    onReturn={actions.returnBook}
                                />
                            )}
                            {view === 'bookings' && (
                                <BookingManager bookings={state.bookings} onUpdateStatus={actions.updateBookingStatus} />
                            )}
                            {view === 'visits' && (
                                <ClassVisitManager
                                    visits={state.visits}
                                    classes={state.classes}
                                    teachers={state.teachers}
                                    onStartVisit={actions.startClassVisit}
                                />
                            )}
                            {view === 'reports' && (
                                <LrcDashboard stats={state.stats} onGenerateCertificate={generateLRCCertificate} />
                            )}
                            {view === 'quality' && <LrcQualityForms topStudentName={topStudentName} />}
                        </div>
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
