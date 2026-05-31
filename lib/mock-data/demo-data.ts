// بيانات تجريبية ثابتة — تُستخدم عند NEXT_PUBLIC_DEMO_MODE=true
// جميع الـ IDs تبدأ بـ 'd0000000-' لتمييزها بسهولة

export const DEMO_SCHOOL_ID  = 'd0000000-0000-0000-0000-000000000001';
export const DEMO_YEAR_ID    = 'd0000000-0000-0000-0000-000000000002';
export const DEMO_USER_ID    = 'd0000000-0000-0000-0000-000000000003'; // مدير المدرسة
export const DEMO_TEACHER_ID = 'd0000000-0000-0000-0000-000000000004';
export const DEMO_EMAIL      = 'demo@school-os.example';

const C1 = 'd0000000-0000-0000-0001-000000000001'; // الصف الأول أ
const C2 = 'd0000000-0000-0000-0001-000000000002'; // الصف الأول ب
const C3 = 'd0000000-0000-0000-0001-000000000003'; // الصف الثاني أ
const C4 = 'd0000000-0000-0000-0001-000000000004'; // الصف الثالث أ
const C5 = 'd0000000-0000-0000-0001-000000000005'; // الصف الرابع أ

const SUB1 = 'd0000000-0000-0000-0002-000000000001'; // رياضيات
const SUB2 = 'd0000000-0000-0000-0002-000000000002'; // علوم
const SUB3 = 'd0000000-0000-0000-0002-000000000003'; // لغة عربية
const SUB4 = 'd0000000-0000-0000-0002-000000000004'; // تربية إسلامية
const SUB5 = 'd0000000-0000-0000-0002-000000000005'; // تاريخ واجتماعيات

const TERM1 = 'd0000000-0000-0000-0003-000000000001';

const now   = new Date().toISOString();
const today = new Date().toISOString().slice(0, 10);

// 20 اسم طالب لبيانات تجريبية واقعية
const STUDENT_NAMES = [
    'أحمد محمد العلي',    'محمد خالد النصر',   'عبدالله سعد الراشد',
    'سعد فهد المطيري',    'فهد عمر الشهري',    'نورة أحمد القحطاني',
    'ريم محمد العنزي',    'سارة عبدالله الزهراني', 'لينا خالد الدوسري',
    'منال سعد العتيبي',   'عمر ناصر البقمي',   'ناصر تركي السبيعي',
    'تركي فيصل الحربي',   'فيصل بدر الغامدي',  'مشعل علي الشمري',
    'رنا فهد الحارثي',   'هنا ناصر الرشيدي',  'سلمى بدر الثبيتي',
    'أميرة فيصل المالكي', 'ميس مشعل البلوي',
];

const CLASSES = [C1, C2, C3, C4, C5];
const GRADES  = ['الصف الأول', 'الصف الأول', 'الصف الثاني', 'الصف الثالث', 'الصف الرابع'];

const students = STUDENT_NAMES.map((name, i) => ({
    id:            `d0000000-0000-0000-0004-${String(i + 1).padStart(12, '0')}`,
    school_id:     DEMO_SCHOOL_ID,
    full_name:     name,
    class_id:      CLASSES[i % 5],
    grade_level:   GRADES[i % 5],
    national_id:   `10000000${String(i + 1).padStart(2, '0')}`,
    enrollment_date: '2025-09-01',
    is_active:     true,
    created_at:    now,
}));

// سجلات حضور الحصص — 3 أيام × 20 طالب × حصة واحدة
const attendanceDays = [
    today,
    new Date(Date.now() - 86400000).toISOString().slice(0, 10),
    new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10),
];

const periodAttendance = attendanceDays.flatMap((date, di) =>
    students.map((st, si) => ({
        id:           `d0000000-0000-0000-0005-${String(di * 20 + si + 1).padStart(12, '0')}`,
        school_id:    DEMO_SCHOOL_ID,
        student_id:   st.id,
        class_id:     st.class_id,
        date,
        period_number: 1,
        status:       si % 7 === 0 ? 'absent' : si % 11 === 0 ? 'late' : 'present',
        marked_at:    `${date}T08:00:00Z`,
        academic_year_id: DEMO_YEAR_ID,
        school_id_check: DEMO_SCHOOL_ID,
    }))
);

// سجلات الحضور اليومي
const dailyAttendance = attendanceDays.flatMap((date, di) =>
    students.map((st, si) => ({
        id:        `d0000000-0000-0000-0006-${String(di * 20 + si + 1).padStart(12, '0')}`,
        school_id: DEMO_SCHOOL_ID,
        student_id: st.id,
        class_id:  st.class_id,
        date,
        status:    si % 7 === 0 ? 'absent' : 'present',
        academic_year_id: DEMO_YEAR_ID,
        created_at: `${date}T07:30:00Z`,
    }))
);

// أحداث سلوكية
const events = [
    { id: 'd0000000-0000-0000-0007-000000000001', school_id: DEMO_SCHOOL_ID, student_id: students[0].id, event_type: 'behavior_issue', description: 'تأخر عن الحصة', created_at: now },
    { id: 'd0000000-0000-0000-0007-000000000002', school_id: DEMO_SCHOOL_ID, student_id: students[2].id, event_type: 'achievement', description: 'تميز في مادة الرياضيات', created_at: now },
    { id: 'd0000000-0000-0000-0007-000000000003', school_id: DEMO_SCHOOL_ID, student_id: students[5].id, event_type: 'behavior_issue', description: 'مخالفة النظام المدرسي', created_at: now },
    { id: 'd0000000-0000-0000-0007-000000000004', school_id: DEMO_SCHOOL_ID, student_id: students[1].id, event_type: 'achievement', description: 'فوز بالمسابقة العلمية', created_at: now },
    { id: 'd0000000-0000-0000-0007-000000000005', school_id: DEMO_SCHOOL_ID, student_id: students[8].id, event_type: 'notification', description: 'تنبيه غياب متكرر', created_at: now },
];

export type DemoDataMap = Record<string, Record<string, unknown>[]>;

export const DEMO_DATA: DemoDataMap = {
    schools: [{
        id: DEMO_SCHOOL_ID, name_ar: 'مدرسة الأمل النموذجية',
        name_en: 'Al-Amal Model School', city: 'الرياض',
        timezone: 'Asia/Riyadh', logo_url: null, created_at: now,
    }],

    academic_years: [{
        id: DEMO_YEAR_ID, school_id: DEMO_SCHOOL_ID,
        label: '2025-2026', start_date: '2025-09-01', end_date: '2026-06-30',
        is_active: true, created_at: now,
    }],

    terms: [{
        id: TERM1, school_id: DEMO_SCHOOL_ID, academic_year_id: DEMO_YEAR_ID,
        number: 1, name: 'الفصل الدراسي الأول',
        start_date: '2025-09-01', end_date: '2026-01-31', is_active: true,
    }],

    school_stages: [
        { id: 'd0000000-0000-0000-0008-000000000001', school_id: DEMO_SCHOOL_ID, name: 'ابتدائي', code: 'elementary', grade_from: 1, grade_to: 6 },
        { id: 'd0000000-0000-0000-0008-000000000002', school_id: DEMO_SCHOOL_ID, name: 'متوسط',  code: 'middle',      grade_from: 7, grade_to: 9 },
    ],

    classes: [
        { id: C1, school_id: DEMO_SCHOOL_ID, grade_level: 'الصف الأول',   section: 'أ', academic_year_id: DEMO_YEAR_ID, created_at: now },
        { id: C2, school_id: DEMO_SCHOOL_ID, grade_level: 'الصف الأول',   section: 'ب', academic_year_id: DEMO_YEAR_ID, created_at: now },
        { id: C3, school_id: DEMO_SCHOOL_ID, grade_level: 'الصف الثاني',  section: 'أ', academic_year_id: DEMO_YEAR_ID, created_at: now },
        { id: C4, school_id: DEMO_SCHOOL_ID, grade_level: 'الصف الثالث',  section: 'أ', academic_year_id: DEMO_YEAR_ID, created_at: now },
        { id: C5, school_id: DEMO_SCHOOL_ID, grade_level: 'الصف الرابع',  section: 'أ', academic_year_id: DEMO_YEAR_ID, created_at: now },
    ],

    subjects: [
        { id: SUB1, school_id: DEMO_SCHOOL_ID, name_ar: 'رياضيات',              code: 'MATH', created_at: now },
        { id: SUB2, school_id: DEMO_SCHOOL_ID, name_ar: 'علوم',                 code: 'SCI',  created_at: now },
        { id: SUB3, school_id: DEMO_SCHOOL_ID, name_ar: 'لغة عربية',            code: 'ARB',  created_at: now },
        { id: SUB4, school_id: DEMO_SCHOOL_ID, name_ar: 'تربية إسلامية',        code: 'ISL',  created_at: now },
        { id: SUB5, school_id: DEMO_SCHOOL_ID, name_ar: 'تاريخ واجتماعيات',    code: 'SOC',  created_at: now },
    ],

    student_profiles: students,

    student_enrollments: students.map((st, i) => ({
        id:              `d0000000-0000-0000-0009-${String(i + 1).padStart(12, '0')}`,
        school_id:       DEMO_SCHOOL_ID,
        student_id:      st.id,
        class_id:        st.class_id,
        academic_year_id: DEMO_YEAR_ID,
        enrolled_at:     '2025-09-01T08:00:00Z',
    })),

    profiles: [
        {
            id: DEMO_USER_ID, school_id: DEMO_SCHOOL_ID,
            full_name: 'مدير النظام التجريبي', email: DEMO_EMAIL,
            system_role: null, created_at: now,
        },
        {
            id: DEMO_TEACHER_ID, school_id: DEMO_SCHOOL_ID,
            full_name: 'سعاد المعلم', email: 'teacher@school-os.example',
            system_role: null, created_at: now,
        },
    ],

    // 13 دوراً تجريبياً لـ DEMO_USER_ID — schools مُضمَّنة لمحاكاة JOIN
    user_personas: [
        { id: 'd0000000-0000-0000-000a-000000000001', user_id: DEMO_USER_ID, school_id: DEMO_SCHOOL_ID, role: 'school_principal',    is_primary: true,  job_title: null, is_active: true, created_at: now, schools: { name: 'مدرسة الأمل النموذجية' } },
        { id: 'd0000000-0000-0000-000a-000000000002', user_id: DEMO_USER_ID, school_id: DEMO_SCHOOL_ID, role: 'student_affairs_vp', is_primary: false, job_title: null, is_active: true, created_at: now, schools: { name: 'مدرسة الأمل النموذجية' } },
        { id: 'd0000000-0000-0000-000a-000000000003', user_id: DEMO_USER_ID, school_id: DEMO_SCHOOL_ID, role: 'academic_vp',         is_primary: false, job_title: null, is_active: true, created_at: now, schools: { name: 'مدرسة الأمل النموذجية' } },
        { id: 'd0000000-0000-0000-000a-000000000004', user_id: DEMO_USER_ID, school_id: DEMO_SCHOOL_ID, role: 'school_librarian',    is_primary: false, job_title: null, is_active: true, created_at: now, schools: { name: 'مدرسة الأمل النموذجية' } },
        { id: 'd0000000-0000-0000-000a-000000000005', user_id: DEMO_USER_ID, school_id: DEMO_SCHOOL_ID, role: 'school_secretary',    is_primary: false, job_title: null, is_active: true, created_at: now, schools: { name: 'مدرسة الأمل النموذجية' } },
        { id: 'd0000000-0000-0000-000a-000000000006', user_id: DEMO_USER_ID, school_id: DEMO_SCHOOL_ID, role: 'activity_leader',     is_primary: false, job_title: null, is_active: true, created_at: now, schools: { name: 'مدرسة الأمل النموذجية' } },
        { id: 'd0000000-0000-0000-000a-000000000007', user_id: DEMO_USER_ID, school_id: DEMO_SCHOOL_ID, role: 'student_counselor',   is_primary: false, job_title: null, is_active: true, created_at: now, schools: { name: 'مدرسة الأمل النموذجية' } },
        { id: 'd0000000-0000-0000-000a-000000000008', user_id: DEMO_USER_ID, school_id: DEMO_SCHOOL_ID, role: 'health_coordinator',  is_primary: false, job_title: null, is_active: true, created_at: now, schools: { name: 'مدرسة الأمل النموذجية' } },
        { id: 'd0000000-0000-0000-000a-000000000009', user_id: DEMO_USER_ID, school_id: DEMO_SCHOOL_ID, role: 'quality_coordinator', is_primary: false, job_title: null, is_active: true, created_at: now, schools: { name: 'مدرسة الأمل النموذجية' } },
        { id: 'd0000000-0000-0000-000a-000000000010', user_id: DEMO_USER_ID, school_id: DEMO_SCHOOL_ID, role: 'lab_technician',      is_primary: false, job_title: null, is_active: true, created_at: now, schools: { name: 'مدرسة الأمل النموذجية' } },
        { id: 'd0000000-0000-0000-000a-000000000011', user_id: DEMO_USER_ID, school_id: DEMO_SCHOOL_ID, role: 'teacher',             is_primary: false, job_title: null, is_active: true, created_at: now, schools: { name: 'مدرسة الأمل النموذجية' } },
        { id: 'd0000000-0000-0000-000a-000000000012', user_id: DEMO_USER_ID, school_id: DEMO_SCHOOL_ID, role: 'student',             is_primary: false, job_title: null, is_active: true, created_at: now, schools: { name: 'مدرسة الأمل النموذجية' } },
        { id: 'd0000000-0000-0000-000a-000000000013', user_id: DEMO_USER_ID, school_id: DEMO_SCHOOL_ID, role: 'parent',              is_primary: false, job_title: null, is_active: true, created_at: now, schools: { name: 'مدرسة الأمل النموذجية' } },
        // معلم منفصل لـ DEMO_TEACHER_ID (مُستخدم في timetable_slots)
        { id: 'd0000000-0000-0000-000a-000000000014', user_id: DEMO_TEACHER_ID, school_id: DEMO_SCHOOL_ID, role: 'teacher', is_primary: true, job_title: null, is_active: true, created_at: now, schools: { name: 'مدرسة الأمل النموذجية' } },
    ],

    timetable_slots: [
        { id: 'd0000000-0000-0000-000b-000000000001', school_id: DEMO_SCHOOL_ID, class_id: C1, subject_id: SUB1, teacher_id: DEMO_TEACHER_ID, day: 0, period: 1, academic_year_id: DEMO_YEAR_ID },
        { id: 'd0000000-0000-0000-000b-000000000002', school_id: DEMO_SCHOOL_ID, class_id: C2, subject_id: SUB2, teacher_id: DEMO_TEACHER_ID, day: 0, period: 2, academic_year_id: DEMO_YEAR_ID },
        { id: 'd0000000-0000-0000-000b-000000000003', school_id: DEMO_SCHOOL_ID, class_id: C3, subject_id: SUB3, teacher_id: DEMO_TEACHER_ID, day: 1, period: 1, academic_year_id: DEMO_YEAR_ID },
    ],

    period_attendance:     periodAttendance,
    student_daily_attendance: dailyAttendance,
    events,

    notifications: [
        { id: 'd0000000-0000-0000-000c-000000000001', school_id: DEMO_SCHOOL_ID, user_id: DEMO_USER_ID, title: 'ترحيباً بالنظام التجريبي', body: 'هذا النظام يعمل في وضع العرض التجريبي', is_read: false, created_at: now },
    ],

    invites:           [],
    action_audit_log:  [],
    action_idempotency:[],
    cases:             [],
    health_visits:     [],
    lrc_books:         [],
    lrc_visits:        [],
    meeting_sessions:  [],
    ai_insights:       [],
    daily_kpis:        [],
    class_weekly_summary: [],
    student_analytics_cache: [],
    quality_indicators: [],
    behavioral_referrals: [],
    workflow_instances: [],
};
