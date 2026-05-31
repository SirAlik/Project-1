import type { Metadata }    from 'next';
import { redirect }         from 'next/navigation';
import { Bell }             from 'lucide-react';
import { getActivePersona } from '@/lib/auth/context-service';
import { getMyNotifications } from '@/lib/services/notification-service';
import { NotificationsClient }  from './NotificationsClient';

export const metadata: Metadata = { title: 'الإشعارات — Sidra OS' };

export default async function NotificationsPage() {
  const persona = await getActivePersona();
  if (!persona || !persona.schoolId) redirect('/portal');

  const result = await getMyNotifications(50);
  const notifications = result.ok ? result.data : [];

  return (
    <div className="min-h-screen bg-background p-6 md:p-8" dir="rtl">
      <div className="mx-auto max-w-2xl space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-black text-foreground">الإشعارات</h1>
            <p className="text-xs text-muted-foreground">
              جميع التحديثات والإجراءات المطلوبة
            </p>
          </div>
        </div>

        <NotificationsClient initialNotifications={notifications} />
      </div>
    </div>
  );
}
