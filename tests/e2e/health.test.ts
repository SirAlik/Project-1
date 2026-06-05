/**
 * E2E — سيناريو 3: العيادة الصحية
 *
 * يختبر addVisitAction + addReferralAction في app/health/_actions.ts:
 *   ✓ رفض الطلب بدون persona
 *   ✓ school_id يأتي من persona — لا من العميل
 *   ✓ تسجيل زيارة صحية بشكل صحيح
 *   ✓ تسجيل إحالة مرتبطة بالزيارة
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as contextService from '../../lib/auth/context-service';

// ─── مزيف لـ Supabase server client ───────────────────────────────────────────
const mockSingle = vi.fn().mockResolvedValue({ data: { id: 'visit-uuid-123' }, error: null });
const mockSelect = vi.fn(() => ({ single: mockSingle }));
const mockInsert = vi.fn(() => ({ select: mockSelect, error: null }));
const mockFrom   = vi.fn(() => ({ insert: mockInsert }));

vi.mock('../../lib/db/supabase-server', () => ({
    createSupabaseServerClient: vi.fn(() => Promise.resolve({ from: mockFrom })),
}));

vi.mock('../../lib/auth/context-service');

const { addVisitAction, addReferralAction } = await import('../../app/health/_actions');

// ─── بيانات الاختبار ───────────────────────────────────────────────────────────
const mockPersona = {
    userId:        'health-001',
    role:          'health_coordinator',
    schoolId:      'school-A',
    isSystemOwner: false,
};

const validVisit = {
    student_id:   'student-1',
    student_name: 'محمد علي',
    class_id:     'class-001',
    complaint:    'صداع',
    visit_reason: 'مرض',
    action_taken: 'راحة + مسكن ألم',
    status:       'completed' as const,
};

describe('E2E: العيادة الصحية (addVisitAction)', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        // إعادة ضبط insert ليُعيد select → single صحيح
        const singleMock = vi.fn().mockResolvedValue({ data: { id: 'visit-uuid-123' }, error: null });
        const selectMock = vi.fn(() => ({ single: singleMock }));
        mockInsert.mockImplementation(() => ({ select: selectMock }));
    });

    it('يرفض الطلب إذا لم تكن هناك persona نشطة', async () => {
        vi.spyOn(contextService, 'getActivePersona').mockResolvedValue(null);

        const result = await addVisitAction(validVisit);

        expect(result.ok).toBe(false);
        expect(result.error).toContain('غير مصرح');
        expect(mockInsert).not.toHaveBeenCalled();
    });

    it('يُدرج الزيارة مع school_id من persona', async () => {
        vi.spyOn(contextService, 'getActivePersona').mockResolvedValue(
            mockPersona as unknown as Awaited<ReturnType<typeof contextService.getActivePersona>>,
        );

        const result = await addVisitAction(validVisit);

        expect(result.ok).toBe(true);
        expect(result.data?.id).toBe('visit-uuid-123');

        expect(mockFrom).toHaveBeenCalledWith('health_visits');

        // التحقق من أن school_id يأتي من persona.schoolId
        const insertedRow = mockInsert.mock.calls[0]?.[0] as Array<Record<string, unknown>>;
        expect(insertedRow?.[0]?.school_id).toBe('school-A');
    });

    it('يُعيد خطأ إذا فشل Supabase', async () => {
        vi.spyOn(contextService, 'getActivePersona').mockResolvedValue(
            mockPersona as unknown as Awaited<ReturnType<typeof contextService.getActivePersona>>,
        );
        const singleErr = vi.fn().mockResolvedValue({ data: null, error: { message: 'constraint violation' } });
        const selectErr = vi.fn(() => ({ single: singleErr }));
        mockInsert.mockImplementationOnce(() => ({ select: selectErr }));

        const result = await addVisitAction(validVisit);

        expect(result.ok).toBe(false);
        expect(result.error).toBe('constraint violation');
    });

});

describe('E2E: إحالة صحية (addReferralAction)', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        mockFrom.mockImplementation(() => ({ insert: vi.fn().mockResolvedValue({ error: null }) }));
    });

    it('يرفض الطلب بدون persona', async () => {
        vi.spyOn(contextService, 'getActivePersona').mockResolvedValue(null);

        const result = await addReferralAction({
            visit_id:        'visit-1',
            student_name:    'محمد',
            destination:     'مستشفى',
            reason:          'حالة طارئة',
            parent_notified: true,
            notes:           '',
        });

        expect(result.ok).toBe(false);
        expect(result.error).toContain('غير مصرح');
    });

    it('يُدرج الإحالة مع school_id من persona', async () => {
        vi.spyOn(contextService, 'getActivePersona').mockResolvedValue(
            mockPersona as unknown as Awaited<ReturnType<typeof contextService.getActivePersona>>,
        );
        const insertFn = vi.fn().mockResolvedValue({ error: null });
        mockFrom.mockImplementationOnce(() => ({ insert: insertFn }));

        const result = await addReferralAction({
            visit_id:        'visit-1',
            student_name:    'محمد',
            destination:     'مستشفى',
            reason:          'حالة طارئة',
            parent_notified: true,
            notes:           '',
        });

        expect(result.ok).toBe(true);

        const insertedRow = insertFn.mock.calls[0]?.[0] as Array<Record<string, unknown>>;
        expect(insertedRow?.[0]?.school_id).toBe('school-A');
    });

});
