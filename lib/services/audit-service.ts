'use server';

import { supabaseAdmin } from '../db/supabase-admin';

export async function logPersonaSwitch(
    userId: string,
    role: string,
    schoolId?: string
): Promise<void> {
    await supabaseAdmin.from('action_audit_log').insert({
        action_name: 'persona_switch',
        user_id:     userId,
        role,
        school_id:   schoolId ?? null,
        status:      'success',
    });
}
