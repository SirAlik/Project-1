import { BookOpenCheck, FlaskConical, HeartPulse, Library, ShieldAlert } from "lucide-react";
import { QualityOwnerPanel } from "@/components/quality/QualityOwnerPanel";
import { PageHeader, DashboardGrid, ActionCard } from "@/components/dashboard";

const MODULES = [
    {
        href: "/classroom",
        title: "الكادر التعليمي",
        description: "إدارة الصفوف والحضور والتحصيل بعد ربطها ببيانات حقيقية.",
        icon: BookOpenCheck,
    },
    {
        href: "/lrc",
        title: "مصادر التعلم",
        description: "لا تُعرض مؤشرات مكتبة تقديرية هنا؛ كل قراءة يجب أن تأتي من الخدمة الرسمية.",
        icon: Library,
    },
    {
        href: "/science",
        title: "المختبر",
        description: "حجوزات المختبر والمخزون تظهر بعد اكتمال الربط التشغيلي.",
        icon: FlaskConical,
    },
    {
        href: "/health",
        title: "الصحة المدرسية",
        description: "الزيارات الصحية لا تُلخص بأرقام ثابتة أو افتراضية.",
        icon: HeartPulse,
    },
];

export default function EducationalAffairsPage() {
    return (
        <div className="space-y-8" dir="rtl">
            {/* حالة فارغة صادقة: لا مؤشرات تعليمية ثابتة — تُعرض بعد ربط مصادر بيانات حقيقية */}
            <PageHeader
                icon={ShieldAlert}
                kicker="الشؤون التعليمية"
                title="لا توجد لوحة مؤشرات تعليمية جاهزة"
                subtitle="تمت إزالة المؤشرات الثابتة من هذه الصفحة. ستعرض هذه المنطقة ملخصات الشؤون التعليمية فقط بعد اعتماد مصادر بيانات حقيقية لكل وحدة."
            />

            <DashboardGrid cols={2}>
                {MODULES.map((module) => (
                    <ActionCard
                        key={module.href}
                        href={module.href}
                        icon={module.icon}
                        title={module.title}
                        description={module.description}
                    />
                ))}
            </DashboardGrid>

            {/* نماذج الجودة (مالك: وكيل الشؤون التعليمية) — مُبوّبة بسجلّ المستأجر */}
            <QualityOwnerPanel module="academic" moduleLabel="الشؤون التعليمية" />
        </div>
    );
}
