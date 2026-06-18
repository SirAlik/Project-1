'use client';

import { useState } from 'react';
import {
    LayoutDashboard,
    BookOpen,
    BookMarked,
    Calendar,
    Users,
    BarChart3,
    FileCheck2,
    ShieldCheck,
    Book,
} from 'lucide-react';
import { RoleDashboardShell } from '@/components/layout/RoleDashboardShell';
import { PageHeader, SegmentedTabs, type SegmentedTab } from '@/components/dashboard';
import { type UserRole } from '@/lib/auth/roles';
import { useLRC } from '../_hooks/useLRC';
import { LrcOverview } from './LrcOverview';
import { BookList } from './BookList';
import { LendingDesk } from './LendingDesk';
import { BookingManager } from './BookingManager';
import { ClassVisitManager } from './ClassVisitManager';
import { LrcDashboard } from './LrcDashboard';
import { LrcQualityForms } from './LrcQualityForms';
import { generateLRCCertificate } from './CertificateGenerator';

/**
 * LrcWorkspace — جسم مركز مصادر التعلم داخل الصدفة الموحّدة (RoleDashboardShell).
 *
 * Sprint 2: أُزيلت الصدفة اليدوية (شريط جانبي + شريط علوي + NotificationsMenu/UserMenu + درج جوال)
 * التي كانت تكرّر مسؤوليات RoleDashboardShell. تبديل العروض السبعة صار عبر SegmentedTabs داخل الصفحة
 * (تشترك في حالة useLRC) — مطابقاً لنمط /activity · /science · /secretary. منطق LRC (الخطّاف
 * والإجراءات والمكوّنات والمودالات) محفوظ كما هو.
 */

type LrcView = 'overview' | 'books' | 'lending' | 'bookings' | 'visits' | 'reports' | 'quality';

const TABS: SegmentedTab<LrcView>[] = [
    { id: 'overview', label: 'الرئيسية', icon: LayoutDashboard },
    { id: 'books', label: 'الفهرس', icon: BookOpen },
    { id: 'lending', label: 'الإعارة', icon: BookMarked },
    { id: 'bookings', label: 'الحجوزات', icon: Calendar },
    { id: 'visits', label: 'الزيارات', icon: Users },
    { id: 'reports', label: 'التقارير', icon: BarChart3 },
    { id: 'quality', label: 'نماذج الجودة والتصدير', icon: FileCheck2 },
];

export function LrcWorkspace({ role }: { role: UserRole }) {
    const { state, actions } = useLRC();
    const [view, setView] = useState<LrcView>('overview');

    const pendingBookings = state.bookings.filter((b) => b.status === 'pending').length;
    const topStudentName = state.stats?.topStudents?.[0]?.name;

    return (
        <RoleDashboardShell role={role}>
            <div className="space-y-6" dir="rtl">
                <PageHeader
                    icon={Book}
                    title="بوابة أمين المصادر"
                    subtitle="إدارة مركز مصادر التعلم: الفهرس · الإعارة · الزيارات · الحجوزات · نماذج الجودة."
                />

                <SegmentedTabs tabs={TABS} active={view} onChange={setView} />

                {/* رسالة العملية */}
                {state.msg && (
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-bold text-foreground">
                        <span className="flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-primary" />
                            {state.msg}
                        </span>
                        <button
                            onClick={() => actions.setMsg('')}
                            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                        >
                            إغلاق
                        </button>
                    </div>
                )}

                {/* المحتوى */}
                {view === 'overview' && (
                    <LrcOverview stats={state.stats} pendingBookings={pendingBookings} onNavigate={(v) => setView(v)} />
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
        </RoleDashboardShell>
    );
}
