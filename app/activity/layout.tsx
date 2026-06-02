import { redirect } from 'next/navigation';
import { getActivePersona } from '@/lib/auth/context-service';

export default async function ActivityLayout({ children }: { children: React.ReactNode }) {
    const persona = await getActivePersona();
    if (!persona) redirect('/login');
    if (persona.role !== 'activity_leader') redirect('/portal');
    if (!persona.schoolId) redirect('/portal');
    return <>{children}</>;
}
