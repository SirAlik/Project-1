import { redirect }      from 'next/navigation';
import { getActivePersona } from '@/lib/auth/context-service';
import { getMyJobs }        from '@/lib/services/bulk-upload-service';
import { UploadClient }     from './UploadClient';

export const metadata = { title: 'الرفع المجمّع' };

const ALLOWED_ROLES = ['school_principal', 'school_admin', 'school_secretary'];

export default async function BulkUploadPage() {
  const persona = await getActivePersona();
  if (!persona || !persona.schoolId) redirect('/portal');
  if (!ALLOWED_ROLES.includes(persona.role) && !persona.isSystemOwner) redirect('/portal');

  const result = await getMyJobs();
  const initialJobs = result.ok ? result.data : [];

  return (
    <div className="min-h-screen bg-background p-6 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div>
          <p className="text-sm text-muted-foreground mb-1">
            لوحة الإدارة / الرفع المجمّع
          </p>
          <h1 className="text-2xl font-bold text-foreground">
            الرفع المجمّع للبيانات
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            ارفع ملفات CSV لاستيراد بيانات الطلاب وتسجيلهم بشكل مجمّع
          </p>
        </div>

        <UploadClient initialJobs={initialJobs} />
      </div>
    </div>
  );
}
