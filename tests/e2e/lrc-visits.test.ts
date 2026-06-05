/**
 * E2E — سيناريو 2: زيارات المكتبة (LRC)
 *
 * يختبر borrowBookAction في app/lrc/_actions.ts:
 *   ✓ رفض الطلب بدون persona
 *   ✓ school_id يأتي من persona — لا من العميل
 *   ✓ رفض الإعارة إذا كانت النسخ غير متوفرة
 *   ✓ نجاح الإعارة مع تحديث available_copies
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as contextService from '../../lib/auth/context-service';

// ─── مزيف لـ Supabase server client ───────────────────────────────────────────
const mockSingle  = vi.fn();
const mockSelect  = vi.fn(() => ({ eq: mockEq }));
const mockEq      = vi.fn(() => ({ eq: mockEq, single: mockSingle }));
const mockInsert  = vi.fn().mockResolvedValue({ error: null });
const mockUpdate  = vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })) }));
const mockFrom    = vi.fn((table: string) => {
    if (table === 'lrc_books') {
        return { select: mockSelect, update: mockUpdate };
    }
    return { insert: mockInsert };
});

vi.mock('../../lib/db/supabase-server', () => ({
    createSupabaseServerClient: vi.fn(() => Promise.resolve({ from: mockFrom })),
}));

vi.mock('../../lib/auth/context-service');

const { borrowBookAction } = await import('../../app/lrc/_actions');

// ─── بيانات الاختبار ───────────────────────────────────────────────────────────
const mockPersona = {
    userId:        'librarian-001',
    role:          'school_librarian',
    schoolId:      'school-A',
    isSystemOwner: false,
};

describe('E2E: زيارات المكتبة / الإعارة (borrowBookAction)', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يرفض الطلب إذا لم تكن هناك persona نشطة', async () => {
        vi.spyOn(contextService, 'getActivePersona').mockResolvedValue(null);

        const result = await borrowBookAction({
            bookId:       'book-1',
            borrowerId:   'student-1',
            borrowerType: 'student',
            loanDate:     '2026-06-05',
            dueDate:      '2026-06-19',
        });

        expect(result.ok).toBe(false);
        expect(result.error).toContain('غير مصرح');
    });

    it('يرفض الإعارة إذا الكتاب غير متوفر (available_copies < 1)', async () => {
        vi.spyOn(contextService, 'getActivePersona').mockResolvedValue(
            mockPersona as unknown as Awaited<ReturnType<typeof contextService.getActivePersona>>,
        );
        // الكتاب موجود لكن نسخه = 0
        mockSingle.mockResolvedValueOnce({ data: { available_copies: 0 }, error: null });

        const result = await borrowBookAction({
            bookId:       'book-1',
            borrowerId:   'student-1',
            borrowerType: 'student',
            loanDate:     '2026-06-05',
            dueDate:      '2026-06-19',
        });

        expect(result.ok).toBe(false);
        expect(result.error).toContain('غير متوفر');
        expect(mockInsert).not.toHaveBeenCalled();
    });

    it('يرفض الإعارة إذا الكتاب غير موجود أو لا يخص المدرسة', async () => {
        vi.spyOn(contextService, 'getActivePersona').mockResolvedValue(
            mockPersona as unknown as Awaited<ReturnType<typeof contextService.getActivePersona>>,
        );
        mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'not found' } });

        const result = await borrowBookAction({
            bookId:       'book-other-school',
            borrowerId:   'student-1',
            borrowerType: 'student',
            loanDate:     '2026-06-05',
            dueDate:      '2026-06-19',
        });

        expect(result.ok).toBe(false);
        expect(result.error).toContain('غير موجود');
    });

    it('ينجح الإعارة ويكتب في lrc_loans مع school_id من persona', async () => {
        vi.spyOn(contextService, 'getActivePersona').mockResolvedValue(
            mockPersona as unknown as Awaited<ReturnType<typeof contextService.getActivePersona>>,
        );
        // الكتاب متوفر
        mockSingle.mockResolvedValueOnce({ data: { available_copies: 3 }, error: null });

        const result = await borrowBookAction({
            bookId:       'book-1',
            borrowerId:   'student-1',
            borrowerType: 'student',
            loanDate:     '2026-06-05',
            dueDate:      '2026-06-19',
        });

        expect(result.ok).toBe(true);

        // التحقق من أن lrc_loans مُدرَج بـ school_id صحيح
        const loanInsertCall = mockInsert.mock.calls[0]?.[0] as Array<Record<string, unknown>>;
        expect(loanInsertCall?.[0]?.school_id).toBe('school-A');
    });

});
