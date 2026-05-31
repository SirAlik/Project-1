'use client';

import { supabase } from '@/lib/db/supabase';
import { CONFIG } from '@/lib/config';

export interface TransactionDelta {
    student_id: string;
    delta_coins: number;
    delta_xp: number;
    type: 'quest_reward' | 'purchase' | 'ar_drop' | 'penalty' | 'manual_adjustment';
    source_type?: 'ar_glyph' | 'quest' | 'marketplace' | 'admin';
    source_event_id?: string;
}

/**
 * Sentinel Ledger Service (V2 - Hardened)
 * Handles secure coin/XP transactions via Database RPC.
 */
export const SentinelLedger = {
    /**
     * Records a transaction using the secure database RPC.
     * Hardened against race conditions, double-spending, and delta-injection.
     */
    async recordTransaction(delta: TransactionDelta) {
        if (!CONFIG.LEDGER_V2_ENABLED) {
            console.warn('Sentinel Ledger V2 disabled. Transaction aborted.');
            return { success: false };
        }

        const { data, error } = await supabase.rpc('rpc_process_transaction', {
            p_student_id: delta.student_id,
            p_delta_coins: delta.delta_coins,
            p_delta_xp: delta.delta_xp,
            p_type: delta.type,
            p_source_type: delta.source_type || 'manual',
            p_source_event_id: delta.source_event_id || null
        });

        if (error) {
            console.error('Hardened Ledger Error:', error.message);
            throw new Error(`SECURITY ALERT: ${error.message}`);
        }

        return {
            success: true,
            hash: data.tx_hash,
            newTotal: {
                coins: data.new_coins,
                xp: data.new_xp
            }
        };
    }
};
