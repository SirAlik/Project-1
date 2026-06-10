/**
 * Platform Schools API
 * ====================
 * Returns list of all schools for the system_owner import school-selection step.
 * Platform/system-owner scope only (cross-tenant read) — NOT a school-level endpoint.
 */
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase-admin';
import { getActivePersona } from '@/lib/auth/context-service';

export async function GET() {
    try {
        // Verify user is system_owner
        const persona = await getActivePersona();
        if (!persona || persona.role !== 'system_owner') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Fetch all schools
        const { data: schools, error } = await supabaseAdmin
            .from('schools')
            .select('id, name_ar, name_en')
            .order('name_ar');

        if (error) {
            console.error('[API] Failed to fetch schools:', error);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        return NextResponse.json({ schools: schools || [] });
    } catch (err) {
        console.error('[API] Schools endpoint error:', err);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
