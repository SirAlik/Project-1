'use client';

import type { TransactionDelta } from './ledger';

export interface ArScanPayload {
    hash: string;
    student_id: string;
}

export interface QuestUpdatePayload {
    quest_id: string;
    progress: number;
    student_id: string;
}

export type QueuedAction =
    | { id: string; type: 'purchase';      payload: TransactionDelta;    timestamp: number }
    | { id: string; type: 'ar_scan';       payload: ArScanPayload;       timestamp: number }
    | { id: string; type: 'quest_update';  payload: QuestUpdatePayload;  timestamp: number };

const DB_NAME   = 'SchoolOS_Metaverse_Queue';
const STORE_NAME = 'action_queue';

export class OfflineQueue {
    private static db: IDBDatabase | null = null;

    private static initDB(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            if (this.db) return resolve(this.db);

            const openReq = indexedDB.open(DB_NAME, 1);

            openReq.onupgradeneeded = () => {
                const db = openReq.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
            };

            openReq.onsuccess = () => {
                this.db = openReq.result;
                resolve(this.db);
            };

            openReq.onerror = () => {
                reject(openReq.error);
            };
        });
    }

    static async enqueue(action: Omit<QueuedAction, 'timestamp'>) {
        const db = await this.initDB();
        const fullAction: QueuedAction = { ...action, timestamp: Date.now() } as QueuedAction;

        return new Promise<void>((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const req = store.put(fullAction);

            req.onsuccess = () => {
                window.dispatchEvent(new Event('sync-queue-updated'));
                resolve();
            };
            req.onerror = () => reject(req.error);
        });
    }

    static async getPending(): Promise<QueuedAction[]> {
        const db = await this.initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const req = store.getAll();

            req.onsuccess = () => resolve(req.result as QueuedAction[]);
            req.onerror = () => reject(req.error);
        });
    }

    static async remove(id: string): Promise<void> {
        const db = await this.initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const req = store.delete(id);

            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }

    static async clear(): Promise<void> {
        const db = await this.initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const req = store.clear();

            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }
}
