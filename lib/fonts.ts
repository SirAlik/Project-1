import { Inter, IBM_Plex_Sans_Arabic } from 'next/font/google';

// الخط الأساسي الوحيد للواجهة (Arabic-first) — يوفّر --font-sans لكامل التطبيق.
// (تنظيف Phase 3B) أُزيل خط Saudi المحلي وTajawal من أساس الواجهة. IBM Plex Sans Arabic
// يتضمّن محارف لاتينية، فهو كافٍ للعربية واللاتينية في الواجهة.
// ملاحظة: تسجيل Tajawal لتقارير PDF يبقى محلياً داخل مكوّنات التقارير (منفصل عن أساس الواجهة).
export const ibmPlexArabic = IBM_Plex_Sans_Arabic({
    variable: "--font-sans",
    subsets: ["arabic"],
    weight: ["400", "500", "600", "700"],
    display: 'swap',
});

// خط لاتيني احتياطي (--font-inter) — غير مُشار إليه ضمن سلسلة --font-sans حالياً؛ مُبقى مؤقتاً، مرشّح للإزالة لاحقاً.
export const inter = Inter({
    variable: "--font-inter",
    subsets: ["latin"],
    display: 'swap',
});
