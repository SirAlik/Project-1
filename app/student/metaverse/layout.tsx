import { redirect } from 'next/navigation';
import { getActivePersona } from '@/lib/auth/context-service';

export default async function MetaverseLayout({ children }: { children: React.ReactNode }) {
    const persona = await getActivePersona();
    if (!persona) redirect('/login');
    if (persona.role !== 'student') redirect('/portal');
    return (
        <main className="min-h-screen bg-stone-50 px-6 py-10 text-foreground" dir="rtl">
            <div className="mx-auto max-w-2xl">{children}</div>
        </main>
    );
}
