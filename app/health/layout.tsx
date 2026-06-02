import { redirect } from 'next/navigation';
import { getActivePersona } from '@/lib/auth/context-service';

export default async function HealthLayout({ children }: { children: React.ReactNode }) {
    const persona = await getActivePersona();
    if (!persona) redirect('/login');
    if (persona.role !== 'health_coordinator') redirect('/portal');
    if (!persona.schoolId) redirect('/portal');
    return <>{children}</>;
}
