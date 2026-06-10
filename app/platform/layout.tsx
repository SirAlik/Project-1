import { redirect } from 'next/navigation';
import { getActivePersona } from '@/lib/auth/context-service';
import { PlatformShell } from '@/components/layout/PlatformShell';

// حارس منطقة المنصّة — مالك النظام فقط. يلفّ المحتوى بـ PlatformShell (ترويسة «سِدرة»).
export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
    const persona = await getActivePersona();
    if (!persona) redirect('/login');
    if (persona.role !== 'system_owner') redirect('/portal');
    return <PlatformShell>{children}</PlatformShell>;
}
