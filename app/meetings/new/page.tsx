import { redirect }         from 'next/navigation';
import Link                  from 'next/link';
import { ChevronRight, CalendarDays } from 'lucide-react';
import { getActivePersona }  from '@/lib/auth/context-service';
import { NewMeetingForm }    from './NewMeetingForm';

const ALLOWED_ROLES = [
  'school_principal',
  'school_admin',
  'school_secretary',
  'quality_coordinator',
  'system_owner',
] as const;

export default async function NewMeetingPage() {
  const persona = await getActivePersona();
  if (!persona) redirect('/login');
  if (!(ALLOWED_ROLES as readonly string[]).includes(persona.role) && !persona.isSystemOwner) {
    redirect('/meetings');
  }

  return (
    <main className="min-h-screen font-sans pb-24" dir="rtl">
      <div className="relative z-10 mx-auto max-w-3xl px-6 pt-14">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs opacity-40 mb-10">
          <Link href="/meetings" className="hover:opacity-80 transition-opacity">الاجتماعات</Link>
          <ChevronRight className="w-3 h-3" />
          <span>اجتماع جديد</span>
        </nav>

        <header className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-sky-500/10 rounded-lg flex items-center justify-center">
              <CalendarDays className="w-4 h-4 text-sky-500" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">
              ISO 9001:2015 — Clause 9.3
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            إنشاء <span className="text-sky-400">اجتماع جديد</span>
          </h1>
          <p className="text-sm opacity-50 mt-2">
            نماذج QF19-1 / QF19-2 — دعوة ومحضر الاجتماع
          </p>
        </header>

        <NewMeetingForm />
      </div>
    </main>
  );
}
