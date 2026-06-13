import { redirect }          from 'next/navigation';
import Link                   from 'next/link';
import { ChevronRight }       from 'lucide-react';
import { getActivePersona }   from '@/lib/auth/context-service';
import { getReasonCodes }     from '@/lib/services/wizard-service';
import { CorrectiveActionWizard } from './CorrectiveActionWizard';
import { isQualityModuleEnabled } from '@/lib/quality/tenant-templates';
import { QualityDisabledNotice } from '@/components/quality/QualityDisabledNotice';

export default async function CorrectiveActionNewPage() {
  const persona = await getActivePersona();
  if (!persona) redirect('/login');
  if (persona.role !== 'quality_coordinator' && !persona.isSystemOwner) {
    redirect('/qa');
  }

  // بوّابة الإتاحة لكل مستأجر (fail-closed): مدرسة غير مُسجَّلة في سجلّ القوالب → حالة فارغة صادقة
  if (!isQualityModuleEnabled(persona.schoolId, 'qa')) {
    return <QualityDisabledNotice moduleLabel="ضمان الجودة" />;
  }

  const rcResult = await getReasonCodes('corrective_action');
  const reasonCodes = rcResult.ok ? rcResult.data : [];

  return (
    <main className="min-h-screen font-sans pb-24" dir="rtl">
      <div className="relative z-10 mx-auto max-w-3xl px-6 pt-14">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs opacity-40 mb-10">
          <Link href="/qa" className="hover:opacity-80 transition-opacity">ضمان الجودة</Link>
          <ChevronRight className="w-3 h-3" />
          <span>إجراء تصحيحي جديد</span>
        </nav>

        <header className="mb-10">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">
            ISO 9001:2015 — Clause 10.2
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            معالج الإجراء <span className="text-sky-400">التصحيحي</span>
          </h1>
          <p className="text-sm opacity-50 mt-2">
            نموذج QF03-1 — يُطلق مسار مساءلة كامل مع إقرار الموظف المعني
          </p>
        </header>

        <CorrectiveActionWizard initialReasonCodes={reasonCodes} />
      </div>
    </main>
  );
}
