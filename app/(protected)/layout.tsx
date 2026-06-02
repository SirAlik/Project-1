import React from 'react';
import { redirect } from 'next/navigation';
import { getActivePersona } from '@/lib/auth/context-service';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
    const persona = await getActivePersona();
    if (!persona) redirect('/login');
    return <>{children}</>;
}
