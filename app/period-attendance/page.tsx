import type { Metadata }     from 'next';
import Link                  from 'next/link';
import { redirect }          from 'next/navigation';
import { BookOpenCheck }     from 'lucide-react';
import { getActivePersona }  from '@/lib/auth/context-service';
import { getClassesForTeacher } from '@/lib/services/period-attendance-service';
import { PeriodSheet }       from './PeriodSheet';

export const metadata: Metadata = { title: 'حضور الحصص — Sidra OS' };

const ALLOWED = [
  'teacher', 'student_affairs_vp', 'school_affairs_vp',
  'school_principal', 'school_admin',
];

function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export default async function PeriodAttendancePage() {
  const persona = await getActivePersona();
  if (!persona || !persona.schoolId) redirect('/portal');
  if (!ALLOWED.includes(persona.role) && !persona.isSystemOwner) redirect('/portal');

  const classesResult = await getClassesForTeacher();
  const classes = classesResult.ok ? classesResult.data : [];
  const today = getTodayISO();

  return (
    <div className="min-h-screen bg-background p-6 md:p-8" dir="rtl">
      <div className="mx-auto max-w-3xl space-y-6">

        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link href="/portal" className="hover:text-foreground transition-colors">
              البوابة
            </Link>
            <span>/</span>
            <span>حضور الحصص</span>
          </div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
            <BookOpenCheck className="w-6 h-6 text-blue-500" />
            حضور الحصص اليومي
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            تسجيل حضور الطلاب على مستوى كل حصة دراسية مرتبطاً بالمادة والمعلم
          </p>
        </div>

        {classes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4 text-center">
            <div className="w-16 h-16 rounded-full bg-muted/60 flex items-center justify-center">
              <BookOpenCheck className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <div>
              <p className="font-bold text-foreground">لا توجد فصول دراسية</p>
              <p className="text-sm text-muted-foreground mt-1">
                {persona.role === 'teacher'
                  ? 'لم يتم تكليفك بأي فصل في الجدول الدراسي بعد'
                  : 'يجب إضافة الفصول الدراسية وتسجيل الطلاب أولاً'}
              </p>
            </div>
          </div>
        ) : (
          <PeriodSheet classes={classes} today={today} />
        )}

      </div>
    </div>
  );
}
