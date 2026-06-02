import { redirect } from 'next/navigation';
import { getActivePersona } from '@/lib/auth/context-service';

export default async function LrcLayout({ children }: { children: React.ReactNode }) {
    const persona = await getActivePersona();
    if (!persona) redirect('/login');
    if (persona.role !== 'school_librarian') redirect('/portal');
    if (!persona.schoolId) redirect('/portal');
    return <>{children}</>;
}
