import { redirect } from 'next/navigation';
import { getActivePersona } from '@/lib/auth/context-service';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const persona = await getActivePersona();
    if (!persona) redirect('/login');
    if (persona.role !== 'system_owner') redirect('/portal');
    return <>{children}</>;
}
