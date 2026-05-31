import type { Metadata } from 'next';
import { redirect }      from 'next/navigation';
import { Zap }           from 'lucide-react';
import { getActivePersona }       from '@/lib/auth/context-service';
import { getSchoolsAction }        from './_actions';
import { AutomationRulesClient }   from './AutomationRulesClient';

export const metadata: Metadata = { title: 'قواعد الأتمتة — Sidra OS' };

export default async function AutomationPage() {
  const persona = await getActivePersona();
  if (!persona) redirect('/portal');
  if (persona.role !== 'system_owner' && persona.role !== 'school_admin')
    redirect('/403');

  const schoolsResult = await getSchoolsAction();
  const schools = schoolsResult.ok ? schoolsResult.data : [];

  if (!schools.length) {
    return (
      <div className="min-h-screen p-10 flex items-center justify-center" dir="rtl">
        <p className="text-text-secondary">لا توجد مدارس مسجلة</p>
      </div>
    );
  }

  // default: أول مدرسة أو مدرسة المدير
  const initialSchoolId =
    persona.role === 'school_admin' && persona.schoolId
      ? persona.schoolId
      : schools[0].id;

  return (
    <div className="min-h-screen bg-bg-canvas p-6 md:p-10" dir="rtl">
      <div className="mx-auto max-w-3xl space-y-8">

        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Zap className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground">قواعد الأتمتة</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              أتمتة الإجراءات بناءً على أحداث النظام — إشعارات، إحالات، تصنيفات
            </p>
          </div>
        </div>

        <AutomationRulesClient
          schools={schools}
          initialSchoolId={initialSchoolId}
        />
      </div>
    </div>
  );
}
