import { redirect } from 'next/navigation';
import { getActivePersona } from '@/lib/auth/context-service';

export default async function StudentAffairsLayout({ children }: { children: React.ReactNode }) {
    const persona = await getActivePersona();
    if (!persona) redirect('/login');
    if (persona.role !== 'student_affairs_vp') redirect('/portal');
    if (!persona.schoolId) redirect('/portal');
    return <>{children}</>;
}
