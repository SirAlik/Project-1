'use server';
import { createSupabaseServerClient } from '@/lib/db/supabase-server';

type CircuitBreakerResult = {
    ok: boolean;
    is_active?: boolean;
    error?: string;
};

export async function toggleCircuitBreakerAction(): Promise<CircuitBreakerResult> {
    const supabase = await createSupabaseServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { ok: false, error: 'غير مصرح' };

    const role = (user.app_metadata as { role?: string })?.role ?? null;
    if (role !== 'system_owner') {
        return { ok: false, error: 'غير مصرح: system_owner مطلوب' };
    }

    const { data, error: fetchErr } = await supabase
        .from('system_config')
        .select('value_json')
        .eq('key', 'circuit_breaker')
        .single();

    if (fetchErr) return { ok: false, error: fetchErr.message };

    const current = data.value_json as { is_active: boolean; reason: string };
    const updated = {
        is_active: !current.is_active,
        reason: !current.is_active ? 'Manual Administrative Lock' : 'none',
    };

    const { error: upErr } = await supabase
        .from('system_config')
        .update({ value_json: updated })
        .eq('key', 'circuit_breaker');

    if (upErr) return { ok: false, error: upErr.message };
    return { ok: true, is_active: updated.is_active };
}
