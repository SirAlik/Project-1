import type { Metadata }     from 'next';
import Link                  from 'next/link';
import { redirect }          from 'next/navigation';
import { ClipboardCheck }    from 'lucide-react';
import { getActivePersona }  from '@/lib/auth/context-service';
import { getStaffForEvaluation } from '@/lib/services/staff-evaluation-service';
import { EvalForm }          from './EvalForm';

export const metadata: Metadata = { title: 'تقييم جديد — Sidra OS' };

const ALLOWED = ['school_principal', 'school_admin'];

export default async function NewEvalPage() {
  const persona = await getActivePersona();
  if (!persona || !persona.schoolId) redirect('/portal');
  if (!ALLOWED.includes(persona.role) && !persona.isSystemOwner) redirect('/portal');

  const staffResult = await getStaffForEvaluation();
  const staffList   = staffResult.ok ? staffResult.data : [];

  return (
    <div className="min-h-screen bg-background p-6 md:p-8" dir="rtl">
      <div className="mx-auto max-w-2xl space-y-6">

        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link href="/staff-evaluation" className="hover:text-foreground transition-colors">
              تقييمات الأداء
            </Link>
            <span>/</span>
            <span>تقييم جديد</span>
          </div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-blue-500" />
            إنشاء تقييم أداء
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            ISO 9001:2015 بند 9.1.3 — النتائج تُرسَل للموظف للإقرار فور الحفظ
          </p>
        </div>

        <EvalForm staffList={staffList} />
      </div>
    </div>
  );
}
