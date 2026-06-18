/**
 * مجموعة مكوّنات لوحات الأدوار الموحّدة (Sidra Light Design System).
 *
 * نظام بصري واحد لكل صفحات الأدوار الإدارية: الاختلافات بين الأدوار في المحتوى/الودجِت/الصلاحيات
 * فقط — لا في أنماط البطاقات أو الترويسات. تُستخدم داخل RoleDashboardShell / SchoolDashboardShell.
 *
 * للشارات/الحالات: أعِد استخدام components/ui/StatusBadge.tsx و components/ui/Pill.tsx (مُوائمة مسبقاً
 * مع الرموز المعتمدة). لسطح نماذج الجودة: components/quality/QualityOwnerPanel.tsx.
 */

export { PageHeader } from './PageHeader';
export { DashboardSection } from './DashboardSection';
export { MetricCard } from './MetricCard';
export { ActionCard } from './ActionCard';
export { EmptyState } from './EmptyState';
export { DashboardGrid } from './DashboardGrid';
export { RoleWelcomeCard } from './RoleWelcomeCard';
export { SegmentedTabs, type SegmentedTab } from './SegmentedTabs';
export { toneChipClass, toneTextClass, type DashboardTone } from './tones';
