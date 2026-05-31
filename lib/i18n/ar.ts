// Arabic Localization for School OS
// مصطلحات وزارة التعليم السعودية

export const ar = {
    // Navigation
    nav: {
        dashboard: "لوحة التحكم",
        attendance: "الحضور والغياب",
        referrals: "الإحالات السلوكية",
        assets: "العهد المدرسية",
        profiles: "سجلات الطلاب",
        contracts: "التعهدات",
        settings: "الإعدادات",
        home: "الرئيسية",
        presence: "الحضور",
        records: "السجلات",
        signings: "التوقيعات"
    },

    // KPIs and Stats
    kpi: {
        attendanceRate: "نسبة الحضور اليوم",
        totalAbsent: "إجمالي الغياب",
        totalLate: "التأخر الصباحي",
        pendingReferrals: "إحالات بانتظار الإجراء",
        booksIssued: "كتب مسلمة",
        atRiskStudents: "طلاب في منطقة الخطر",
        teacherCoverage: "نسبة تغطية المعلمين"
    },

    // Actions
    actions: {
        markPresent: "تسجيل حضور",
        markLate: "تسجيل تأخر",
        markAbsent: "تسجيل غياب",
        recordExit: "تسجيل استئذان",
        save: "حفظ",
        cancel: "إلغاء",
        print: "طباعة",
        export: "تصدير PDF",
        send: "إرسال",
        resolve: "إغلاق",
        escalate: "تصعيد",
        sign: "توقيع",
        review: "مراجعة",
        approve: "اعتماد",
        reject: "رفض"
    },

    // Terms (Ministry Standard)
    terms: {
        counselor: "الموجه الطلابي",
        vpStudentAffairs: "وكيل شؤون الطلاب",
        vpAcademic: "وكيل الشؤون التعليمية",
        principal: "مدير المدرسة",
        teacher: "المعلم",
        student: "الطالب",
        guardian: "ولي الأمر",
        absenceNotice: "إشعار غياب",
        latenessLog: "سجل التأخر",
        behavioralContract: "التعهد السلوكي",
        referral: "إحالة سلوكية",
        exitLog: "سجل الاستئذان"
    },

    // Dashboard Widgets
    widgets: {
        liveGateFeed: "طابور معالجة التأخر",
        riskRadar: "رادار المخاطر",
        disciplineTrends: "تحليل الاتجاهات السلوكية",
        actionStream: "جدول المهام التشغيلية",
        rotatingStats: "الإحصائيات الدوارة"
    },

    // Status Labels
    status: {
        present: "حاضر",
        absent: "غائب",
        late: "متأخر",
        excusedExit: "مستأذن",
        draft: "مسودة",
        pendingCounselor: "بانتظار الموجه",
        inProgress: "تحت الإجراء",
        resolved: "مغلقة",
        escalated: "مصعّدة"
    },

    // Messages
    messages: {
        attendanceUpdated: "تم تحديث الحضور بنجاح",
        referralSent: "تم إرسال الإحالة للموجه الطلابي",
        referralResolved: "تم إغلاق الإحالة",
        referralEscalated: "تم تصعيد الإحالة لمدير المدرسة",
        contractSigned: "تم توقيع التعهد بنجاح",
        assetIssued: "تم تسليم العهدة",
        assetReturned: "تم استلام العهدة",
        guardianMismatch: "اسم ولي الأمر لا يطابق الشخص المفوض",
        selectStudent: "اختر طالباً لعرض التفاصيل",
        noDataAvailable: "لا توجد بيانات متاحة"
    },

    // QF Form Titles
    qf: {
        "C-2-2": "بيانات الطالب الشخصية",
        "C-2-3": "كشف الطلاب",
        "C-3-1": "استلام/تسليم الكتب",
        "C-4-1": "سجل الاستئذان",
        "C-5-1": "سجل التأخر الصباحي",
        "C-5-2": "سجل الغياب اليومي",
        "C-5-3": "إحالة التأخر/الغياب المتكرر",
        "C-6-1": "التعهد السلوكي"
    },

    // Placeholders
    placeholders: {
        searchStudent: "ابحث عن طالب...",
        enterNotes: "أدخل الملاحظات...",
        selectClass: "اختر الفصل",
        selectDate: "اختر التاريخ"
    }
};

export type LocaleKey = keyof typeof ar;
