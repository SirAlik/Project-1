import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSafeAction } from '../../lib/safe-action';
import { z } from 'zod';
import * as contextService from '../../lib/auth/context-service';
import * as pbac from '../../lib/auth/pbac';

// Mocks
vi.mock('../../lib/auth/context-service');
vi.mock('../../lib/db/supabase-admin', () => ({
    supabaseAdmin: {
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        gt: vi.fn(() => ({
                            maybeSingle: vi.fn().mockResolvedValue({ data: null })
                        }))
                    }))
                }))
            })),
            insert: vi.fn().mockResolvedValue({ error: null }),
            upsert: vi.fn().mockResolvedValue({ error: null })
        }))
    }
}));

describe('SafeAction Security Core', () => {

    const mockUser = {
        userId: 'user-123',
        role: 'school_admin',
        schoolId: 'school-A',
        isSystemOwner: false
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(contextService, 'getActivePersona').mockResolvedValue(mockUser as unknown as Awaited<ReturnType<typeof contextService.getActivePersona>>);
    });

    // 1. TENANT ISOLATION
    it('should BLOCK cross-tenant school_id injection', async () => {
        const action = createSafeAction({
            schema: z.object({ schoolId: z.string() }),
            allowedRoles: 'all',
            requiresSchoolContext: true,
            handler: async () => 'success'
        });

        const result = await action({ schoolId: 'school-B' });

        expect(result.serverError).toContain('محاولة اختراق السياق المدرسي');
    });

    it('should ALLOW valid school_id usage', async () => {
        const action = createSafeAction({
            schema: z.object({ schoolId: z.string() }),
            allowedRoles: 'all',
            requiresSchoolContext: true,
            handler: async () => 'success'
        });

        const result = await action({ schoolId: 'school-A' });

        expect(result.data).toBe('success');
    });

    // 2. PBAC PERMISSIONS
    it('should DENY if user lacks required permission', async () => {
        vi.spyOn(pbac, 'hasPermission').mockReturnValue(false);

        const action = createSafeAction({
            schema: z.object({}),
            requiredPermission: 'ledger.manage_wallets',
            handler: async () => 'success'
        });

        const result = await action({});

        expect(result.serverError).toContain('ليس لديك الصلاحيات الكافية');
    });

    it('should ALLOW if user has required permission', async () => {
        vi.spyOn(pbac, 'hasPermission').mockReturnValue(true);

        const action = createSafeAction({
            schema: z.object({}),
            requiredPermission: 'ledger.manage_wallets',
            handler: async () => 'success'
        });

        const result = await action({});

        expect(result.data).toBe('success');
    });

});
