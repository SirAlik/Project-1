// قواميس الأسماء العربية لـ workflows — مرجع مشترك بين UI وغيرها

export const WORKFLOW_NAMES: Record<string, string> = {
  CORRECTIVE_ACTION: 'الإجراء التصحيحي',
  HR_ATTENDANCE:     'مساءلة الحضور',
  STAFF_EVAL:        'تقييم الأداء الوظيفي',
  MEETING:           'محضر الاجتماع',
  BULK_UPLOAD:       'الرفع المجمّع',
};

export const STATE_LABELS: Record<string, string> = {
  // عامة
  draft:                   'مسودة',
  in_progress:             'جارٍ',
  completed:               'مكتمل',
  cancelled:               'ملغى',
  escalated:               'مُصعَّد',
  // الإجراء التصحيحي
  awaiting_acknowledgment: 'بانتظار الإقرار',
  under_review:            'قيد المراجعة',
  in_corrective_action:    'جارٍ التصحيح',
  awaiting_verification:   'بانتظار التحقق',
  closed_effective:        'مغلق — فعّال',
  closed_ineffective:      'مغلق — غير فعّال',
  // مساءلة الحضور
  initiated:               'مُفتتح',
  awaiting_employee:       'بانتظار رد الموظف',
  awaiting_manager:        'بانتظار قرار المدير',
  decided:                 'تم البت',
  archived:                'مؤرشف',
  // تقييم الأداء
  acknowledged:            'تم الإقرار',
  filed:                   'محفوظ',
  // الاجتماع
  scheduled:               'مجدول',
  ended:                   'انتهى',
  awaiting_signatures:     'بانتظار التوقيعات',
  minutes_signed:          'محضر موقّع',
  // الرفع المجمّع
  uploaded:                'مرفوع',
  validated:               'تم التحقق',
  awaiting_approval:       'بانتظار الموافقة',
  processing:              'جارٍ المعالجة',
  failed:                  'فشل',
  rejected:                'مرفوض',
};

export const ACTION_LABELS: Record<string, string> = {
  start:              'بدء الـ workflow',
  submit:             'تقديم',
  approve:            'موافقة',
  reject:             'رفض',
  respond:            'ردّ',
  decide:             'اتخاذ القرار',
  archive:            'أرشفة',
  escalate_timeout:   'تصعيد تلقائي',
  verify_effective:   'تحقق: فعّال',
  verify_ineffective: 'تحقق: غير فعّال',
  submit_evidence:    'تقديم الأدلة',
  generate_minutes:   'إنشاء المحضر',
  all_signed:         'اكتمال التوقيعات',
  validate:           'التحقق من البيانات',
  request_approval:   'طلب موافقة',
  execute:            'تنفيذ',
  finish:             'إنهاء',
  start_meeting:      'بدء الاجتماع',
  end_meeting:        'إنهاء الاجتماع',
  acknowledge:        'إقرار',
  complete:           'إكمال',
  file:               'حفظ رسمي',
  cancel:             'إلغاء',
};

export const ROLE_LABELS: Record<string, string> = {
  school_principal:    'مدير المدرسة',
  school_admin:        'المدير الإداري',
  quality_coordinator: 'منسق الجودة',
  school_secretary:    'سكرتير المدرسة',
  teacher:             'معلم',
  academic_vp:         'وكيل أكاديمي',
  student_affairs_vp:  'وكيل شؤون طلابية',
  school_affairs_vp:   'وكيل شؤون مدرسة',
  activity_leader:     'مشرف النشاط',
  health_coordinator:  'منسق الصحة',
  school_librarian:    'أمين المكتبة',
  lab_technician:      'تقني المختبر',
  student_counselor:   'مرشد طلابي',
  system_owner:        'مالك النظام',
};

export function workflowName(code: string): string {
  return WORKFLOW_NAMES[code] ?? code;
}

export function stateLabel(state: string): string {
  if (!state) return '—';
  return STATE_LABELS[state] ?? state;
}

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}
