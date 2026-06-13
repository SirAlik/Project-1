import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image as PdfImage } from '@react-pdf/renderer';
import qualityLogo from '../_assets/quality-logo.png';
import type { ActivityFinancial, ClubAssignment, StudentWish, ActivityClub, ActivityEvent, StudentHonor } from '@/lib/types/activity';

interface ActivityReportStats {
    activeClubs: number;
    expenseRatio: number;
}
// Register Arabic Font
Font.register({
    family: 'Tajawal',
    src: 'https://fonts.gstatic.com/s/tajawal/v9/I7akRf9uEnkvY8p9glvTaeA.ttf', // Medium
    fontWeight: 'medium',
});

Font.register({
    family: 'TajawalBold',
    src: 'https://fonts.gstatic.com/s/tajawal/v9/I7akRf9uEnkvY8p9glvTaed8.ttf', // Bold
    fontWeight: 'bold',
});

const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontFamily: 'Tajawal',
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        direction: 'rtl',
    },
    header: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
        borderBottom: 2,
        borderBottomColor: '#1a1a1a',
        paddingBottom: 15,
    },
    logo: {
        width: 60,
        height: 60,
    },
    schoolInfo: {
        textAlign: 'right',
        flex: 1,
    },
    qualityInfo: {
        textAlign: 'left',
        flex: 1,
    },
    titleContainer: {
        marginVertical: 20,
        textAlign: 'center',
        backgroundColor: '#f8f9fa',
        padding: 10,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    title: {
        fontSize: 18,
        fontFamily: 'TajawalBold',
        color: '#1a1a1a',
    },
    table: {
        display: 'flex',
        width: 'auto',
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: '#dee2e6',
        marginTop: 10,
    },
    tableRow: {
        flexDirection: 'row-reverse',
        borderBottomWidth: 1,
        borderBottomColor: '#dee2e6',
        minHeight: 30,
        alignItems: 'center',
    },
    tableHeader: {
        backgroundColor: '#f1f3f5',
        fontFamily: 'TajawalBold',
    },
    tableCol: {
        borderLeftWidth: 1,
        borderLeftColor: '#dee2e6',
        padding: 5,
        justifyContent: 'center',
    },
    tableCell: {
        fontSize: 9,
        textAlign: 'center',
        color: '#343a40',
    },
    footerContainer: {
        position: 'absolute',
        bottom: 40,
        left: 40,
        right: 40,
        borderTop: 1,
        borderTopColor: '#dee2e6',
        paddingTop: 10,
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        fontSize: 8,
        color: '#868e96',
    },
});

/**
 * نماذج تقارير النشاط الطلابي (سلسلة QF71-G-*).
 * ملاحظة معمارية: أكواد QF والبنية الحالية قوالب خاصة بمستأجر «الفلاح» (tenant-specific) — وليست
 * افتراضات سِدرة العالمية. اسم المدرسة يُمرَّر ديناميكياً عبر prop `schoolName` (من سياق المستأجر
 * المصادَق عبر useAuth في ExportButtons) ولا يُثبَّت في القالب. العلامة المرئية «سِدرة» فقط.
 * سجلّ القوالب/الأكواد لكل مدرسة (tenant template registry) = مُمرآة الآن في سجلّ المستأجرين `lib/quality/tenant-templates.ts` (module 'activity'، المصدر المعتمد للأكواد). TODO: ربط الإتاحة المدرسية بالسجلّ على مستوى المُستدعي (بعد تسجيل برنامج المدرسة).
 */
const ReportHeader = ({ code, schoolName }: { code: string; title?: string; schoolName?: string }) => (
    <View style={styles.header}>
        <View style={styles.schoolInfo}>
            <Text style={{ fontSize: 13, fontFamily: 'TajawalBold', marginBottom: 2 }}>{schoolName || 'المدرسة'}</Text>
            <Text style={{ fontSize: 9, marginBottom: 2 }}>وزارة التعليم - الإدارة العامة للتعليم</Text>
            <Text style={{ fontSize: 9 }}>قسم النشاط الطلابي</Text>
        </View>

        {/* شعار نظام الجودة (PNG، مستورد بأمان لـ react-pdf) */}
        <PdfImage src={qualityLogo.src} style={styles.logo} />

        <View style={styles.qualityInfo}>
            <Text style={{ fontSize: 11, fontFamily: 'TajawalBold', color: '#495057' }}>نظام إدارة الجودة</Text>
            <Text style={{ fontSize: 10, marginTop: 4 }}>{code}</Text>
        </View>
    </View>
);

const ReportFooter = ({ code }: { code: string }) => (
    <View style={styles.footerContainer}>
        <Text>نظام سِدرة • رائد النشاط</Text>
        <Text>كود النموذج: {code}</Text>
        <Text>تاريخ الطباعة: {new Date().toLocaleDateString('ar-SA')}</Text>
    </View>
);

// 1. Budget Report (QF71-G-1-2)
export const BudgetReport = ({ items, schoolName }: { items: ActivityFinancial[]; schoolName?: string }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <ReportHeader title="خطة ميزانية النشاط الطلابي" code="QF71-G-1-2" schoolName={schoolName} />
            <View style={styles.titleContainer}>
                <Text style={styles.title}>تقديرات الميزانية للفصل الدراسي الحالي</Text>
            </View>
            <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeader]}>
                    <View style={[styles.tableCol, { width: '40%' }]}>
                        <Text style={styles.tableCell}>البند</Text>
                    </View>
                    <View style={[styles.tableCol, { width: '30%' }]}>
                        <Text style={styles.tableCell}>الفئة</Text>
                    </View>
                    <View style={[styles.tableCol, { width: '30%' }]}>
                        <Text style={styles.tableCell}>المبلغ التقديري</Text>
                    </View>
                </View>
                {items.map((item, i) => (
                    <View key={i} style={styles.tableRow}>
                        <View style={[styles.tableCol, { width: '40%' }]}>
                            <Text style={styles.tableCell}>{item.item_name}</Text>
                        </View>
                        <View style={[styles.tableCol, { width: '30%' }]}>
                            <Text style={styles.tableCell}>{item.category}</Text>
                        </View>
                        <View style={[styles.tableCol, { width: '30%' }]}>
                            <Text style={styles.tableCell}>{item.amount} ريال</Text>
                        </View>
                    </View>
                ))}
            </View>
            <View style={{ marginTop: 20, textAlign: 'left' }}>
                <Text style={{ fontSize: 12, fontFamily: 'TajawalBold' }}>
                    إجمالي الميزانية المقترحة: {items.reduce((acc, curr) => acc + Number(curr.amount), 0)} ريال
                </Text>
            </View>
            <ReportFooter code="QF71-G-1-2" />
        </Page>
    </Document>
);

// 2. Expenses Log (QF71-G-7-1)
export const ExpensesReport = ({ expenses, schoolName }: { expenses: ActivityFinancial[]; schoolName?: string }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <ReportHeader title="سجل الصرف المالي الفعلي" code="QF71-G-7-1" schoolName={schoolName} />
            <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeader]}>
                    <View style={[styles.tableCol, { width: '20%' }]}>
                        <Text style={styles.tableCell}>رقم الفاتورة</Text>
                    </View>
                    <View style={[styles.tableCol, { width: '40%' }]}>
                        <Text style={styles.tableCell}>بيان الصرف</Text>
                    </View>
                    <View style={[styles.tableCol, { width: '20%' }]}>
                        <Text style={styles.tableCell}>التاريخ</Text>
                    </View>
                    <View style={[styles.tableCol, { width: '20%' }]}>
                        <Text style={styles.tableCell}>المبلغ</Text>
                    </View>
                </View>
                {expenses.map((exp, i) => (
                    <View key={i} style={styles.tableRow}>
                        <View style={[styles.tableCol, { width: '20%' }]}>
                            <Text style={styles.tableCell}>{exp.invoice_number || '---'}</Text>
                        </View>
                        <View style={[styles.tableCol, { width: '40%' }]}>
                            <Text style={styles.tableCell}>{exp.item_name}</Text>
                        </View>
                        <View style={[styles.tableCol, { width: '20%' }]}>
                            <Text style={styles.tableCell}>{exp.date}</Text>
                        </View>
                        <View style={[styles.tableCol, { width: '20%' }]}>
                            <Text style={styles.tableCell}>{exp.amount} ريال</Text>
                        </View>
                    </View>
                ))}
            </View>
            <ReportFooter code="QF71-G-7-1" />
        </Page>
    </Document>
);

// 3. Supervisors Distribution (QF71-G-1-1)
export const SupervisorsReport = ({ assignments, schoolName }: { assignments: ClubAssignment[]; schoolName?: string }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <ReportHeader title="بيان توزيع المشرفين على الأندية" code="QF71-G-1-1" schoolName={schoolName} />
            <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeader]}>
                    <View style={[styles.tableCol, { width: '35%' }]}>
                        <Text style={styles.tableCell}>اسم المعلم</Text>
                    </View>
                    <View style={[styles.tableCol, { width: '35%' }]}>
                        <Text style={styles.tableCell}>اسم النادي</Text>
                    </View>
                    <View style={[styles.tableCol, { width: '30%' }]}>
                        <Text style={styles.tableCell}>الدور</Text>
                    </View>
                </View>
                {assignments.map((a, i) => (
                    <View key={i} style={styles.tableRow}>
                        <View style={[styles.tableCol, { width: '35%' }]}>
                            <Text style={styles.tableCell}>{a.teacher_name}</Text>
                        </View>
                        <View style={[styles.tableCol, { width: '35%' }]}>
                            <Text style={styles.tableCell}>{a.club_name}</Text>
                        </View>
                        <View style={[styles.tableCol, { width: '30%' }]}>
                            <Text style={styles.tableCell}>{a.role === 'supervisor' ? 'مشرف أساسي' : 'مساعد'}</Text>
                        </View>
                    </View>
                ))}
            </View>
            <ReportFooter code="QF71-G-1-1" />
        </Page>
    </Document>
);

// 4. Student Desires (QF71-G-3-1)
export const StudentWishesReport = ({ wishes, clubs, schoolName }: { wishes: StudentWish[]; clubs: ActivityClub[]; schoolName?: string }) => {
    const getClubName = (id: string | null) => id ? (clubs.find((c) => c.id === id)?.name || id) : '—';
    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <ReportHeader title="بيان رغبات الطلاب في النشاط" code="QF71-G-3-1" schoolName={schoolName} />
                <View style={styles.table}>
                    <View style={[styles.tableRow, styles.tableHeader]}>
                        <View style={[styles.tableCol, { width: '25%' }]}>
                            <Text style={styles.tableCell}>اسم الطالب</Text>
                        </View>
                        <View style={[styles.tableCol, { width: '25%' }]}>
                            <Text style={styles.tableCell}>الرغبة الأولى</Text>
                        </View>
                        <View style={[styles.tableCol, { width: '25%' }]}>
                            <Text style={styles.tableCell}>الرغبة الثانية</Text>
                        </View>
                        <View style={[styles.tableCol, { width: '25%' }]}>
                            <Text style={styles.tableCell}>الرغبة الثالثة</Text>
                        </View>
                    </View>
                    {wishes.map((w, i) => (
                        <View key={i} style={styles.tableRow}>
                            <View style={[styles.tableCol, { width: '25%' }]}>
                                <Text style={styles.tableCell}>{w.student_name}</Text>
                            </View>
                            <View style={[styles.tableCol, { width: '25%' }]}>
                                <Text style={styles.tableCell}>{getClubName(w.first_choice)}</Text>
                            </View>
                            <View style={[styles.tableCol, { width: '25%' }]}>
                                <Text style={styles.tableCell}>{getClubName(w.second_choice)}</Text>
                            </View>
                            <View style={[styles.tableCol, { width: '25%' }]}>
                                <Text style={styles.tableCell}>{getClubName(w.third_choice)}</Text>
                            </View>
                        </View>
                    ))}
                </View>
                <ReportFooter code="QF71-G-3-1" />
            </Page>
        </Document>
    );
};

// 5. Events Log (QF71-G-4-1)
export const EventsReport = ({ events, schoolName }: { events: ActivityEvent[]; schoolName?: string }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <ReportHeader title="سجل تنفيذ الفعاليات والبرامج" code="QF71-G-4-1" schoolName={schoolName} />
            <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeader]}>
                    <View style={[styles.tableCol, { width: '15%' }]}>
                        <Text style={styles.tableCell}>التاريخ</Text>
                    </View>
                    <View style={[styles.tableCol, { width: '30%' }]}>
                        <Text style={styles.tableCell}>البرنامج</Text>
                    </View>
                    <View style={[styles.tableCol, { width: '20%' }]}>
                        <Text style={styles.tableCell}>المقر</Text>
                    </View>
                    <View style={[styles.tableCol, { width: '35%' }]}>
                        <Text style={styles.tableCell}>المخرجات/النتائج</Text>
                    </View>
                </View>
                {events.map((e, i) => (
                    <View key={i} style={styles.tableRow}>
                        <View style={[styles.tableCol, { width: '15%' }]}>
                            <Text style={styles.tableCell}>{e.date}</Text>
                        </View>
                        <View style={[styles.tableCol, { width: '30%' }]}>
                            <Text style={styles.tableCell}>{e.title}</Text>
                        </View>
                        <View style={[styles.tableCol, { width: '20%' }]}>
                            <Text style={styles.tableCell}>{e.location}</Text>
                        </View>
                        <View style={[styles.tableCol, { width: '35%' }]}>
                            <Text style={styles.tableCell}>{e.outcome || 'قيد التنفيذ'}</Text>
                        </View>
                    </View>
                ))}
            </View>
            <ReportFooter code="QF71-G-4-1" />
        </Page>
    </Document>
);

// 6. Honored Students (QF71-G-5-3)
export const HonorsReport = ({ honors, schoolName }: { honors: StudentHonor[]; schoolName?: string }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <ReportHeader title="سجل تكريم الطلاب المتميزين" code="QF71-G-5-3" schoolName={schoolName} />
            <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeader]}>
                    <View style={[styles.tableCol, { width: '30%' }]}>
                        <Text style={styles.tableCell}>اسم الطالب</Text>
                    </View>
                    <View style={[styles.tableCol, { width: '40%' }]}>
                        <Text style={styles.tableCell}>سبب التكريم</Text>
                    </View>
                    <View style={[styles.tableCol, { width: '30%' }]}>
                        <Text style={styles.tableCell}>الجائزة المستلمة</Text>
                    </View>
                </View>
                {honors.map((h, i) => (
                    <View key={i} style={styles.tableRow}>
                        <View style={[styles.tableCol, { width: '30%' }]}>
                            <Text style={styles.tableCell}>{h.student_name}</Text>
                        </View>
                        <View style={[styles.tableCol, { width: '40%' }]}>
                            <Text style={styles.tableCell}>{h.reason}</Text>
                        </View>
                        <View style={[styles.tableCol, { width: '30%' }]}>
                            <Text style={styles.tableCell}>{h.prize}</Text>
                        </View>
                    </View>
                ))}
            </View>
            <ReportFooter code="QF71-G-5-3" />
        </Page>
    </Document>
);

// 7. Comprehensive Activity Record (QF71-G-3-2)
export const FullActivityRecord = ({
    events,
    honors,
    stats,
    schoolName,
}: {
    events: ActivityEvent[];
    honors: StudentHonor[];
    stats: ActivityReportStats;
    schoolName?: string;
}) => (
    <Document>
        {/* Page 1: Summary & Stats */}
        <Page size="A4" style={styles.page}>
            <ReportHeader title="السجل التراكمي الشامل للنشاط" code="QF71-G-3-2" schoolName={schoolName} />
            <View style={styles.titleContainer}>
                <Text style={styles.title}>ملخص الإنجازات والنشاطات</Text>
            </View>
            <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 11, marginBottom: 8 }}>عدد الأندية المفتوحة: {stats.activeClubs}</Text>
                <Text style={{ fontSize: 11, marginBottom: 8 }}>إجمالي الفعاليات والبرامج: {events.length}</Text>
                <Text style={{ fontSize: 11, marginBottom: 8 }}>عدد الطلاب المكرمين: {honors.length}</Text>
                <Text style={{ fontSize: 11, marginBottom: 8 }}>
                    نسبة استهلاك الميزانية: {stats.expenseRatio.toFixed(1)}%
                </Text>
            </View>
            <Text style={{ fontSize: 12, fontFamily: 'TajawalBold', marginBottom: 10 }}>أبرز الفعاليات المنفذة:</Text>
            <View style={styles.table}>
                {events.slice(0, 10).map((e, i) => (
                    <View key={i} style={styles.tableRow}>
                        <View style={[styles.tableCol, { width: '20%' }]}>
                            <Text style={styles.tableCell}>{e.date}</Text>
                        </View>
                        <View style={[styles.tableCol, { width: '80%' }]}>
                            <Text style={[styles.tableCell, { textAlign: 'right' }]}>{e.title}</Text>
                        </View>
                    </View>
                ))}
            </View>
            <ReportFooter code="QF71-G-3-2" />
        </Page>
    </Document>
);
