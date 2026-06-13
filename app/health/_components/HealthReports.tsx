import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import type { HealthVisit, HealthSupply, HygieneLog, CanteenCheck } from '@/lib/types/health';

type VisitReportRow = HealthVisit & { class_name?: string };
type SupplyReportRow = HealthSupply & { last_updated?: string };
type HygieneReportRow = HygieneLog & { class_name?: string };
type CanteenReportRow = CanteenCheck & { cleanliness_score?: number; food_variety_score?: number };

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
        padding: 30,
        fontFamily: 'Tajawal',
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        direction: 'rtl',
    },
    header: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        borderBottom: 1,
        borderBottomColor: '#000',
        paddingBottom: 10,
    },
    schoolInfo: {
        textAlign: 'right',
    },
    qualityInfo: {
        textAlign: 'left',
    },
    titleContainer: {
        marginVertical: 15,
        textAlign: 'center',
    },
    title: {
        fontSize: 18,
        fontFamily: 'TajawalBold',
        textDecoration: 'underline',
    },
    table: {
        display: 'flex',
        width: 'auto',
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: '#000',
        borderRightWidth: 0,
        borderBottomWidth: 0,
    },
    tableRow: {
        margin: 'auto',
        flexDirection: 'row-reverse',
    },
    tableCol: {
        width: '25%',
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: '#000',
        borderLeftWidth: 0,
        borderTopWidth: 0,
        padding: 5,
    },
    tableCell: {
        fontSize: 10,
        textAlign: 'center',
    },
    tableHeader: {
        backgroundColor: '#F0F0F0',
        fontFamily: 'TajawalBold',
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 30,
        right: 30,
        borderTop: 1,
        borderTopColor: '#000',
        paddingTop: 10,
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        fontSize: 8,
        color: '#666',
    }
});

/**
 * نماذج تقارير الصحة المدرسية (سلسلة QF-70-j-*).
 * ملاحظة معمارية: أكواد QF والبنية الحالية قوالب خاصة بمستأجر «الفلاح» (tenant-specific) — وليست
 * افتراضات سِدرة العالمية. اسم المدرسة يُمرَّر ديناميكياً عبر prop `schoolName` (المصدر: سياق المستأجر
 * المصادَق server-side عبر useAuth في المُستدعي) ولا يُثبَّت في القالب. سجلّ القوالب/الأكواد لكل
 * مدرسة (tenant template registry) = طبقة لاحقة (Phase 3D) ولا يُنفَّذ هنا.
 */
const ReportHeader = ({ title, code, schoolName }: { title: string; code: string; schoolName?: string }) => (
    <View style={styles.header}>
        <View style={styles.schoolInfo}>
            <Text style={{ fontSize: 12, fontFamily: 'TajawalBold' }}>{schoolName || 'المدرسة'}</Text>
            <Text style={{ fontSize: 8 }}>تحت إشراف وزارة التعليم</Text>
        </View>
        <View style={styles.titleContainer}>
            <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.qualityInfo}>
            <Text style={{ fontSize: 10 }}>نظام إدارة الجودة</Text>
            <Text style={{ fontSize: 8 }}>{code}</Text>
        </View>
    </View>
);

const ReportFooter = ({ code }: { code: string }) => (
    <View style={styles.footer}>
        <Text>تم التوليد بواسطة نظام سِدرة</Text>
        <Text>{code}</Text>
    </View>
);

// 1. Visit Log Report (QF-70-j-4-1)
export const VisitLogReport = ({ visits, schoolName }: { visits: VisitReportRow[]; schoolName?: string }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <ReportHeader title="سجل الزيارات اليومي" code="QF-70-j-4-1" schoolName={schoolName} />
            <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeader]}>
                    <View style={[styles.tableCol, { width: '15%' }]}><Text style={styles.tableCell}>التاريخ/الوقت</Text></View>
                    <View style={[styles.tableCol, { width: '25%' }]}><Text style={styles.tableCell}>اسم الطالب</Text></View>
                    <View style={[styles.tableCol, { width: '15%' }]}><Text style={styles.tableCell}>الصف</Text></View>
                    <View style={[styles.tableCol, { width: '25%' }]}><Text style={styles.tableCell}>الشكوى</Text></View>
                    <View style={[styles.tableCol, { width: '20%' }]}><Text style={styles.tableCell}>الإجراء المتخذ</Text></View>
                </View>
                {visits.map((v, i) => (
                    <View key={i} style={styles.tableRow}>
                        <View style={[styles.tableCol, { width: '15%' }]}><Text style={styles.tableCell}>{v.date}</Text></View>
                        <View style={[styles.tableCol, { width: '25%' }]}><Text style={styles.tableCell}>{v.student_name}</Text></View>
                        <View style={[styles.tableCol, { width: '15%' }]}><Text style={styles.tableCell}>{v.class_name || '-'}</Text></View>
                        <View style={[styles.tableCol, { width: '25%' }]}><Text style={styles.tableCell}>{v.complaint}</Text></View>
                        <View style={[styles.tableCol, { width: '20%' }]}><Text style={styles.tableCell}>{v.action_taken}</Text></View>
                    </View>
                ))}
            </View>
            <ReportFooter code="QF-70-j-4-1" />
        </Page>
    </Document>
);

// 2. Supply Log Report (QF-70-j-3-1)
export const SupplyLogReport = ({ supplies, schoolName }: { supplies: SupplyReportRow[]; schoolName?: string }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <ReportHeader title="سجل عهدة العيادة المدرسية" code="QF-70-j-3-1" schoolName={schoolName} />
            <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeader]}>
                    <View style={[styles.tableCol, { width: '40%' }]}><Text style={styles.tableCell}>البيان (المادة)</Text></View>
                    <View style={[styles.tableCol, { width: '20%' }]}><Text style={styles.tableCell}>الكمية</Text></View>
                    <View style={[styles.tableCol, { width: '20%' }]}><Text style={styles.tableCell}>الفئة</Text></View>
                    <View style={[styles.tableCol, { width: '20%' }]}><Text style={styles.tableCell}>آخر تحديث</Text></View>
                </View>
                {supplies.map((s, i) => (
                    <View key={i} style={styles.tableRow}>
                        <View style={[styles.tableCol, { width: '40%' }]}><Text style={styles.tableCell}>{s.item_name}</Text></View>
                        <View style={[styles.tableCol, { width: '20%' }]}><Text style={styles.tableCell}>{s.quantity}</Text></View>
                        <View style={[styles.tableCol, { width: '20%' }]}><Text style={styles.tableCell}>{s.category}</Text></View>
                        <View style={[styles.tableCol, { width: '20%' }]}><Text style={styles.tableCell}>{s.last_updated?.split('T')[0]}</Text></View>
                    </View>
                ))}
            </View>
            <ReportFooter code="QF-70-j-3-1" />
        </Page>
    </Document>
);

// 3. Hygiene Log Report (QF-70-j-6-1)
export const HygieneReport = ({ logs, schoolName }: { logs: HygieneReportRow[]; schoolName?: string }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <ReportHeader title="سجل فحص النظافة الشخصية" code="QF-70-j-6-1" schoolName={schoolName} />
            <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeader]}>
                    <View style={[styles.tableCol, { width: '20%' }]}><Text style={styles.tableCell}>التاريخ</Text></View>
                    <View style={[styles.tableCol, { width: '20%' }]}><Text style={styles.tableCell}>الصف</Text></View>
                    <View style={[styles.tableCol, { width: '40%' }]}><Text style={styles.tableCell}>الملاحظات</Text></View>
                    <View style={[styles.tableCol, { width: '20%' }]}><Text style={styles.tableCell}>الحالة</Text></View>
                </View>
                {logs.map((l, i) => (
                    <View key={i} style={styles.tableRow}>
                        <View style={[styles.tableCol, { width: '20%' }]}><Text style={styles.tableCell}>{l.check_date}</Text></View>
                        <View style={[styles.tableCol, { width: '20%' }]}><Text style={styles.tableCell}>{l.class_name || '-'}</Text></View>
                        <View style={[styles.tableCol, { width: '40%' }]}><Text style={styles.tableCell}>{l.notes || 'لا يوجد'}</Text></View>
                        <View style={[styles.tableCol, { width: '20%' }]}><Text style={styles.tableCell}>تم الفحص</Text></View>
                    </View>
                ))}
            </View>
            <ReportFooter code="QF-70-j-6-1" />
        </Page>
    </Document>
);

// 4. Canteen Check Report (QF-70-j-8-1)
export const CanteenReport = ({ checks, schoolName }: { checks: CanteenReportRow[]; schoolName?: string }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <ReportHeader title="سجل متابعة المقصف المدرسي" code="QF-70-j-8-1" schoolName={schoolName} />
            <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeader]}>
                    <View style={[styles.tableCol, { width: '20%' }]}><Text style={styles.tableCell}>التاريخ</Text></View>
                    <View style={[styles.tableCol, { width: '20%' }]}><Text style={styles.tableCell}>نظافة الأدوات</Text></View>
                    <View style={[styles.tableCol, { width: '20%' }]}><Text style={styles.tableCell}>توافر الأصناف</Text></View>
                    <View style={[styles.tableCol, { width: '40%' }]}><Text style={styles.tableCell}>ملاحظات</Text></View>
                </View>
                {checks.map((c, i) => (
                    <View key={i} style={styles.tableRow}>
                        <View style={[styles.tableCol, { width: '20%' }]}><Text style={styles.tableCell}>{c.check_date}</Text></View>
                        <View style={[styles.tableCol, { width: '20%' }]}><Text style={styles.tableCell}>{c.cleanliness_score}/5</Text></View>
                        <View style={[styles.tableCol, { width: '20%' }]}><Text style={styles.tableCell}>{c.food_variety_score}/5</Text></View>
                        <View style={[styles.tableCol, { width: '40%' }]}><Text style={styles.tableCell}>{c.notes || '-'}</Text></View>
                    </View>
                ))}
            </View>
            <ReportFooter code="QF-70-j-8-1" />
        </Page>
    </Document>
);
