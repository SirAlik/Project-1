import {
    Crown,
    SlidersHorizontal,
    School,
    Building2,
    GraduationCap,
    Users,
    Library,
    ClipboardList,
    HeartHandshake,
    HeartPulse,
    FlaskConical,
    Trophy,
    ClipboardCheck,
    Presentation,
    BookOpen,
    UserRound,
    type LucideIcon,
} from "lucide-react";

/**
 * خريطة عرض الأدوار في البوابة (طبقة عرض فقط).
 * المفاتيح الداخلية (role keys) لم تُغيَّر — هذه تسميات عربية + وصف + أيقونة للعرض للمستخدم.
 */
export interface RoleDisplay {
    labelAr: string;
    description: string;
    icon: LucideIcon;
}

export const ROLE_DISPLAY: Record<string, RoleDisplay> = {
    system_owner: {
        labelAr: "مالك النظام",
        description: "إدارة المنصة والمدارس والصلاحيات العليا",
        icon: Crown,
    },
    school_admin: {
        labelAr: "منسق المدرسة",
        description: "إعداد المدرسة، الحسابات، الدعوات، والتشغيل الأساسي",
        icon: SlidersHorizontal,
    },
    school_principal: {
        labelAr: "مدير المدرسة",
        description: "القيادة العامة ومتابعة مؤشّرات أداء المدرسة",
        icon: School,
    },
    school_affairs_vp: {
        labelAr: "وكيل الشؤون المدرسية",
        description: "المرافق، السلامة، الصيانة، المناوبة، والجاهزية التشغيلية",
        icon: Building2,
    },
    academic_vp: {
        labelAr: "وكيل الشؤون التعليمية",
        description: "المناهج، الجداول، الإشراف التعليمي، وجودة التعلّم",
        icon: GraduationCap,
    },
    student_affairs_vp: {
        labelAr: "وكيل شؤون الطلاب",
        description: "الحضور، السلوك، الحالات، ورعاية شؤون الطلاب",
        icon: Users,
    },
    school_librarian: {
        labelAr: "أمين مصادر التعلم",
        description: "إدارة المكتبة، الإعارات، الزيارات، وحجوزات مركز المصادر",
        icon: Library,
    },
    school_secretary: {
        labelAr: "سكرتير المدرسة",
        description: "المهام الإدارية، المراسلات، وحضور الكادر",
        icon: ClipboardList,
    },
    student_counselor: {
        labelAr: "الموجه الطلابي",
        description: "الجلسات الإرشادية، الحالات، والمتابعة السلوكية",
        icon: HeartHandshake,
    },
    health_coordinator: {
        labelAr: "الموجه الصحي",
        description: "العيادة، الزيارات الصحية، والإحالات الطبية",
        icon: HeartPulse,
    },
    lab_technician: {
        labelAr: "محضر المختبر",
        description: "تجهيز المختبرات، التجارب، والسلامة المعملية",
        icon: FlaskConical,
    },
    activity_leader: {
        labelAr: "رائد النشاط",
        description: "الأندية، الفعاليات، الرحلات، والمشاركة الطلابية",
        icon: Trophy,
    },
    quality_coordinator: {
        labelAr: "منسق الجودة",
        description: "مؤشّرات الجودة، الأدلة، الملاحظات، والتحسين المستمر",
        icon: ClipboardCheck,
    },
    teacher: {
        labelAr: "معلم",
        description: "إدارة الفصل، رصد الحضور والدرجات، ومتابعة الطلاب",
        icon: Presentation,
    },
    student: {
        labelAr: "الطالب",
        description: "مساحتك التعليمية: جدولك، مهامك، وإنجازاتك",
        icon: BookOpen,
    },
    parent: {
        labelAr: "ولي الأمر",
        description: "متابعة أبنائك: الحضور، التقارير، والتواصل",
        icon: UserRound,
    },
};

const FALLBACK_ROLE_DISPLAY: RoleDisplay = {
    labelAr: "دور",
    description: "مساحة عمل مخصّصة لهذا الدور",
    icon: UserRound,
};

export function getRoleDisplay(role: string): RoleDisplay {
    return ROLE_DISPLAY[role] ?? FALLBACK_ROLE_DISPLAY;
}
