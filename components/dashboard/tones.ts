/**
 * نغمات (tones) موحّدة لمكوّنات لوحات الأدوار — مصدر واحد لألوان الأيقونات/الشارات.
 *
 * كل النغمات تستخدم رموز التصميم المعتمدة (Light Sidra) فقط: primary (teal) · info (أزرق) ·
 * success · warning · danger (destructive) · muted. ممنوع ألوان hex خام أو cyan/emerald/sky/zinc.
 */

export type DashboardTone = 'primary' | 'info' | 'success' | 'warning' | 'danger' | 'muted';

/** صنف رقاقة الأيقونة (خلفية خفيفة + لون نصّ) لكل نغمة. */
export const toneChipClass: Record<DashboardTone, string> = {
    primary: 'bg-primary/10 text-primary',
    info: 'bg-info/10 text-info',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-destructive/10 text-destructive',
    muted: 'bg-muted text-muted-foreground',
};

/** لون النصّ فقط (للقيم/العناوين الملوّنة) لكل نغمة. */
export const toneTextClass: Record<DashboardTone, string> = {
    primary: 'text-primary',
    info: 'text-info',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-destructive',
    muted: 'text-muted-foreground',
};
