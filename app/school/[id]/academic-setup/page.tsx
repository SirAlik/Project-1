import { Settings2 } from 'lucide-react';
import { getAcademicSetupData } from '@/app/_actions/academic-setup';
import { AcademicSetupClient } from './AcademicSetupClient';
import type { SchoolStage, Term } from '@/lib/types/academic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AcademicSetupPage({ params }: PageProps) {
  const { id: schoolId } = await params;
  const { stages, activeYear, terms } = await getAcademicSetupData(schoolId);

  return (
    <main className="min-h-screen text-foreground p-8 lg:p-12" dir="rtl">
      <div className="max-w-5xl mx-auto">
        <header className="mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mb-5">
            <Settings2 className="text-primary w-7 h-7" />
          </div>
          <h1 className="text-3xl font-black tracking-tight mb-2">الهيكل الأكاديمي</h1>
          <p className="text-sm text-muted-foreground">
            إعداد المراحل الدراسية · الحصص وأوقاتها · الفصول الدراسية
          </p>
          {!activeYear && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500 text-sm font-bold">
              ⚠ لا توجد سنة دراسية نشطة — لن تتمكن من إضافة فصول دراسية
            </div>
          )}
        </header>

        <AcademicSetupClient
          schoolId={schoolId}
          initialStages={stages as unknown as SchoolStage[]}
          activeYear={activeYear}
          initialTerms={terms as unknown as Term[]}
        />
      </div>
    </main>
  );
}
