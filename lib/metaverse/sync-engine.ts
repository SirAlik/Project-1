'use client';

import { useCallback, useEffect, useRef, useState, startTransition } from 'react';
import { OfflineQueue, QueuedAction } from './offline-queue';
import { SentinelLedger } from './ledger';
import { createToast } from '@/components/ui/DynamicIslandToast';
import { supabase } from '../db/supabase';

export function useSyncEngine() {
    const [isSyncing, setIsSyncing] = useState(false);
    const [isOnline, setIsOnline] = useState(true); // Always start as 'true' to match SSR assumption
    const isSyncingRef = useRef(false);

    const processAction = async (action: QueuedAction) => {
        switch (action.type) {
            case 'purchase': {
                const res = await SentinelLedger.recordTransaction(action.payload);
                if (res.success) {
                    createToast('تمت مزامنة الشراء بنجاح', 'success');
                    return true;
                }
                return false;
            }
            case 'ar_scan': {
                const { error } = await supabase.rpc('rpc_scan_ar_glyph', {
                    p_glyph_hash: action.payload.hash,
                    p_student_id: action.payload.student_id,
                });
                if (!error) {
                    createToast('تم تسجيل الكشف المتأخر', 'reward');
                    return true;
                }
                return false;
            }
            default:
                return true;
        }
    };

    const attemptSync = useCallback(async () => {
        if (!navigator.onLine || isSyncingRef.current) return;

        const pending = await OfflineQueue.getPending();
        if (pending.length === 0) return;

        isSyncingRef.current = true;
        setIsSyncing(true);
        console.log(`[SyncEngine] Starting sync for ${pending.length} actions...`);

        for (const action of pending) {
            try {
                const success = await processAction(action);
                if (success) {
                    await OfflineQueue.remove(action.id);
                }
            } catch (err) {
                console.error(`[SyncEngine] Failed to sync action ${action.id}:`, err);
            }
        }

        isSyncingRef.current = false;
        setIsSyncing(false);
        console.log('[SyncEngine] Sync complete');
    }, []);

    useEffect(() => {
        if (isOnline) {
            startTransition(async () => { await attemptSync(); });
        }
    }, [isOnline, attemptSync]);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        const handleSyncQueue = () => { startTransition(async () => { await attemptSync(); }); };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        window.addEventListener('sync-queue-updated', handleSyncQueue);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('sync-queue-updated', handleSyncQueue);
        };
    }, [attemptSync]);

    return { isSyncing, isOnline };
}
