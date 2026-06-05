/**
 * E2E — سيناريو 1: حضور الحصص (period_attendance)
 *
 * يختبر saveAttendanceAction في app/classroom/_actions.ts:
 *   ✓ رفض الطلب بدون persona
 *   ✓ school_id يأتي من persona — لا من العميل
 *   ✓ الكتابة تصل إلى جدول events بالشكل الصحيح
 *   ✓ قائمة فارغة → نجاح بدون كتابة
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as contextService from '../../lib/auth/context-service';

// ─── مزيف لـ Supabase server client ───────────────────────────────────────────
const mockInsert = vi.fn().mockResolvedValue({ error: null });
const mockFrom   = vi.fn(() => ({ insert: mockInsert }));

vi.mock('../../lib/db/supabase-server', () => ({
    createSupabaseServerClient: vi.fn(() =>
        Promise.resolve({ from: mockFrom })
    ),
}));

vi.mock('../../lib/auth/context-service');

// استيراد مؤجَّل حتى بعد تفعيل الـ mocks
const { saveAttendanceAction } = await import('../../app/classroom/_actions');

// ─── بيانات الاختبار ───────────────────────────────────────────────────────────
const mockPersona = {
    userId:        'teacher-001',
    role:          'teacher',
    schoolId:      'school-A',
    isSystemOwner: false,
};

describe('E2E: حضور الحصص (saveAttendanceAction)', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يرفض الطلب إذا لم تكن هناك persona نشطة', async () => {
        vi.spyOn(contextService, 'getActivePersona').mockResolvedValue(null);

        const result = await saveAttendanceAction([
            { studentId: 's-1', status: 'absent' },
        ]);

        expect(result.ok).toBe(false);
        expect(result.error).toContain('غير مصرح');
        expect(mockInsert).not.toHaveBeenCalled();
    });

    it('يُدرج سجلات الغياب مع school_id من persona — لا من العميل', async () => {
        vi.spyOn(contextService, 'getActivePersona').mockResolvedValue(
            mockPersona as unknown as Awaited<ReturnType<typeof contextService.getActivePersona>>,
        );

        const result = await saveAttendanceAction([
            { studentId: 's-1', studentName: 'أحمد', status: 'absent' },
            { studentId: 's-2', studentName: 'سارة',  status: 'late'   },
        ], 'class-001');

        expect(result.ok).toBe(true);
        expect(mockFrom).toHaveBeenCalledWith('events');

        const insertedRows = mockInsert.mock.calls[0][0] as Array<Record<string, unknown>>;
        // school_id يجب أن يأتي من persona.schoolId دائماً
        for (const row of insertedRows) {
            expect(row.school_id).toBe('school-A');
            expect(row.created_by).toBe('teacher-001');
        }
    });

    it('يُعيد نجاحاً بدون كتابة إذا كانت القائمة فارغة', async () => {
        vi.spyOn(contextService, 'getActivePersona').mockResolvedValue(
            mockPersona as unknown as Awaited<ReturnType<typeof contextService.getActivePersona>>,
        );

        const result = await saveAttendanceAction([]);

        expect(result.ok).toBe(true);
        expect(mockInsert).not.toHaveBeenCalled();
    });

    it('يُعيد خطأ إذا فشل Supabase insert', async () => {
        vi.spyOn(contextService, 'getActivePersona').mockResolvedValue(
            mockPersona as unknown as Awaited<ReturnType<typeof contextService.getActivePersona>>,
        );
        mockInsert.mockResolvedValueOnce({ error: { message: 'DB error' } });

        const result = await saveAttendanceAction([
            { studentId: 's-1', status: 'absent' },
        ]);

        expect(result.ok).toBe(false);
        expect(result.error).toBe('DB error');
    });

});
