/**
 * E2E — سيناريو 4: مغادرة الفصل
 *
 * يختبر addEventAction في app/classroom/_actions.ts بحمولة نوع الخروج:
 *   ✓ رفض الطلب بدون persona
 *   ✓ school_id يأتي من persona — لا من العميل
 *   ✓ إدراج حدث الخروج مع actor_role_cached صحيح
 *   ✓ إدراج متعدد (مجموعة طلاب) في استدعاء واحد
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as contextService from '../../lib/auth/context-service';

// ─── مزيف لـ Supabase server client ───────────────────────────────────────────
// addEventAction يستدعي: .insert(rows).select('id')  — بدون .single()
// لذا mockSelect يجب أن يُحل مباشرةً كـ Promise
const mockSelect = vi.fn().mockResolvedValue({ data: [{ id: 'evt-1' }], error: null });
const mockInsert = vi.fn(() => ({ select: mockSelect }));
const mockFrom   = vi.fn(() => ({ insert: mockInsert }));

vi.mock('../../lib/db/supabase-server', () => ({
    createSupabaseServerClient: vi.fn(() => Promise.resolve({ from: mockFrom })),
}));

vi.mock('../../lib/auth/context-service');

const { addEventAction } = await import('../../app/classroom/_actions');

// ─── بيانات الاختبار ───────────────────────────────────────────────────────────
const mockPersona = {
    userId:        'teacher-001',
    role:          'teacher',
    schoolId:      'school-A',
    isSystemOwner: false,
};

const exitEvent = {
    student_id:          'student-1',
    student_name_cached: 'عمر خالد',
    type:                'خروج دورة مياه',
    note:                null,
    action_category:     'exit',
    event_date:          '2026-06-05',
    class_id:            'class-001',
};

describe('E2E: مغادرة الفصل (addEventAction)', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        mockSelect.mockResolvedValue({ data: [{ id: 'evt-1' }], error: null });
        mockInsert.mockImplementation(() => ({ select: mockSelect }));
    });

    it('يرفض الطلب بدون persona نشطة', async () => {
        vi.spyOn(contextService, 'getActivePersona').mockResolvedValue(null);

        const result = await addEventAction([exitEvent]);

        expect(result.ok).toBe(false);
        expect(result.error).toContain('غير مصرح');
        expect(mockInsert).not.toHaveBeenCalled();
    });

    it('يُدرج حدث الخروج مع school_id من persona', async () => {
        vi.spyOn(contextService, 'getActivePersona').mockResolvedValue(
            mockPersona as unknown as Awaited<ReturnType<typeof contextService.getActivePersona>>,
        );

        const result = await addEventAction([exitEvent]);

        expect(result.ok).toBe(true);
        expect(mockFrom).toHaveBeenCalledWith('events');

        const insertedRows = mockInsert.mock.calls[0]?.[0] as Array<Record<string, unknown>>;
        expect(insertedRows?.[0]?.school_id).toBe('school-A');
        expect(insertedRows?.[0]?.created_by).toBe('teacher-001');
        expect(insertedRows?.[0]?.actor_role_cached).toBe('teacher');
    });

    it('يُدرج مجموعة خروجات في استدعاء واحد', async () => {
        vi.spyOn(contextService, 'getActivePersona').mockResolvedValue(
            mockPersona as unknown as Awaited<ReturnType<typeof contextService.getActivePersona>>,
        );

        const exits = [
            { ...exitEvent, student_id: 's-1', student_name_cached: 'طالب 1' },
            { ...exitEvent, student_id: 's-2', student_name_cached: 'طالب 2' },
            { ...exitEvent, student_id: 's-3', student_name_cached: 'طالب 3' },
        ];

        const result = await addEventAction(exits);

        expect(result.ok).toBe(true);

        const insertedRows = mockInsert.mock.calls[0]?.[0] as Array<Record<string, unknown>>;
        expect(insertedRows).toHaveLength(3);
        for (const row of insertedRows) {
            expect(row.school_id).toBe('school-A');
        }
    });

    it('يُعيد خطأ إذا فشل insert', async () => {
        vi.spyOn(contextService, 'getActivePersona').mockResolvedValue(
            mockPersona as unknown as Awaited<ReturnType<typeof contextService.getActivePersona>>,
        );
        mockInsert.mockImplementationOnce(() => ({
            select: vi.fn().mockResolvedValue({ data: null, error: { message: 'RLS violation' } }),
        }));

        const result = await addEventAction([exitEvent]);

        expect(result.ok).toBe(false);
        expect(result.error).toBe('RLS violation');
    });

});
