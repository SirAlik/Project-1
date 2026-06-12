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

const ReportHeader = ({ code }: { code: string; title?: string }) => (
    <View style={styles.header}>
        <View style={styles.schoolInfo}>
            <Text style={{ fontSize: 13, fontFamily: 'TajawalBold', marginBottom: 2 }}>ظ…ط¯ط§ط±ط³ ط§ظ„ظپظ„ط§ط­ ط§ظ„ط£ظ‡ظ„ظٹط©</Text>
            <Text style={{ fontSize: 9, marginBottom: 2 }}>ظˆط²ط§ط±ط© ط§ظ„طھط¹ظ„ظٹظ… - ط§ظ„ط¥ط¯ط§ط±ط© ط§ظ„ط¹ط§ظ…ط© ظ„ظ„طھط¹ظ„ظٹظ…</Text>
            <Text style={{ fontSize: 9 }}>ظ‚ط³ظ… ط§ظ„ظ†ط´ط§ط· ط§ظ„ط·ظ„ط§ط¨ظٹ</Text>
        </View>

        {/* âœ… Quality Forms Logo (PNG, imported safely for react-pdf) */}
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
export const BudgetReport = ({ items }: { items: ActivityFinancial[] }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <ReportHeader title="ط®ط·ط© ظ…ظٹط²ط§ظ†ظٹط© ط§ظ„ظ†ط´ط§ط· ط§ظ„ط·ظ„ط§ط¨ظٹ" code="QF71-G-1-2" />
            <View style={styles.titleContainer}>
                <Text style={styles.title}>طھظ‚ط¯ظٹط±ط§طھ ط§ظ„ظ…ظٹط²ط§ظ†ظٹط© ظ„ظ„ظپطµظ„ ط§ظ„ط¯ط±ط§ط³ظٹ ط§ظ„ط­ط§ظ„ظٹ</Text>
            </View>
            <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeader]}>
                    <View style={[styles.tableCol, { width: '40%' }]}>
                        <Text style={styles.tableCell}>ط§ظ„ط¨ظ†ط¯</Text>
                    </View>
                    <View style={[styles.tableCol, { width: '30%' }]}>
                        <Text style={styles.tableCell}>ط§ظ„ظپط¦ط©</Text>
                    </View>
                    <View style={[styles.tableCol, { width: '30%' }]}>
                        <Text style={styles.tableCell}>ط§ظ„ظ…ط¨ظ„ط؛ ط§ظ„طھظ‚ط¯ظٹط±ظٹ</Text>
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
                            <Text style={styles.tableCell}>{item.amount} ط±ظٹط§ظ„</Text>
                        </View>
                    </View>
                ))}
            </View>
            <View style={{ marginTop: 20, textAlign: 'left' }}>
                <Text style={{ fontSize: 12, fontFamily: 'TajawalBold' }}>
                    ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ظ…ظٹط²ط§ظ†ظٹط© ط§ظ„ظ…ظ‚طھط±ط­ط©: {items.reduce((acc, curr) => acc + Number(curr.amount), 0)} ط±ظٹط§ظ„
                </Text>
            </View>
            <ReportFooter code="QF71-G-1-2" />
        </Page>
    </Document>
);

// 2. Expenses Log (QF71-G-7-1)
export const ExpensesReport = ({ expenses }: { expenses: ActivityFinancial[] }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <ReportHeader title="ط³ط¬ظ„ ط§ظ„طµط±ظپ ط§ظ„ظ…ط§ظ„ظٹ ط§ظ„ظپط¹ظ„ظٹ" code="QF71-G-7-1" />
            <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeader]}>
                    <View style={[styles.tableCol, { width: '20%' }]}>
                        <Text style={styles.tableCell}>ط±ظ‚ظ… ط§ظ„ظپط§طھظˆط±ط©</Text>
                    </View>
                    <View style={[styles.tableCol, { width: '40%' }]}>
                        <Text style={styles.tableCell}>ط¨ظٹط§ظ† ط§ظ„طµط±ظپ</Text>
                    </View>
                    <View style={[styles.tableCol, { width: '20%' }]}>
                        <Text style={styles.tableCell}>ط§ظ„طھط§ط±ظٹط®</Text>
                    </View>
                    <View style={[styles.tableCol, { width: '20%' }]}>
                        <Text style={styles.tableCell}>ط§ظ„ظ…ط¨ظ„ط؛</Text>
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
                            <Text style={styles.tableCell}>{exp.amount} ط±ظٹط§ظ„</Text>
                        </View>
                    </View>
                ))}
            </View>
            <ReportFooter code="QF71-G-7-1" />
        </Page>
    </Document>
);

// 3. Supervisors Distribution (QF71-G-1-1)
export const SupervisorsReport = ({ assignments }: { assignments: ClubAssignment[] }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <ReportHeader title="ط¨ظٹط§ظ† طھظˆط²ظٹط¹ ط§ظ„ظ…ط´ط±ظپظٹظ† ط¹ظ„ظ‰ ط§ظ„ط£ظ†ط¯ظٹط©" code="QF71-G-1-1" />
            <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeader]}>
                    <View style={[styles.tableCol, { width: '35%' }]}>
                        <Text style={styles.tableCell}>ط§ط³ظ… ط§ظ„ظ…ط¹ظ„ظ…</Text>
                    </View>
                    <View style={[styles.tableCol, { width: '35%' }]}>
                        <Text style={styles.tableCell}>ط§ط³ظ… ط§ظ„ظ†ط§ط¯ظٹ</Text>
                    </View>
                    <View style={[styles.tableCol, { width: '30%' }]}>
                        <Text style={styles.tableCell}>ط§ظ„ط¯ظˆط±</Text>
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
                            <Text style={styles.tableCell}>{a.role === 'supervisor' ? 'ظ…ط´ط±ظپ ط£ط³ط§ط³ظٹ' : 'ظ…ط³ط§ط¹ط¯'}</Text>
                        </View>
                    </View>
                ))}
            </View>
            <ReportFooter code="QF71-G-1-1" />
        </Page>
    </Document>
);

// 4. Student Desires (QF71-G-3-1)
export const StudentWishesReport = ({ wishes, clubs }: { wishes: StudentWish[]; clubs: ActivityClub[] }) => {
    const getClubName = (id: string | null) => id ? (clubs.find((c) => c.id === id)?.name || id) : '—';
    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <ReportHeader title="ط¨ظٹط§ظ† ط±ط؛ط¨ط§طھ ط§ظ„ط·ظ„ط§ط¨ ظپظٹ ط§ظ„ظ†ط´ط§ط·" code="QF71-G-3-1" />
                <View style={styles.table}>
                    <View style={[styles.tableRow, styles.tableHeader]}>
                        <View style={[styles.tableCol, { width: '25%' }]}>
                            <Text style={styles.tableCell}>ط§ط³ظ… ط§ظ„ط·ط§ظ„ط¨</Text>
                        </View>
                        <View style={[styles.tableCol, { width: '25%' }]}>
                            <Text style={styles.tableCell}>ط§ظ„ط±ط؛ط¨ط© ط§ظ„ط£ظˆظ„ظ‰</Text>
                        </View>
                        <View style={[styles.tableCol, { width: '25%' }]}>
                            <Text style={styles.tableCell}>ط§ظ„ط±ط؛ط¨ط© ط§ظ„ط«ط§ظ†ظٹط©</Text>
                        </View>
                        <View style={[styles.tableCol, { width: '25%' }]}>
                            <Text style={styles.tableCell}>ط§ظ„ط±ط؛ط¨ط© ط§ظ„ط«ط§ظ„ط«ط©</Text>
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
export const EventsReport = ({ events }: { events: ActivityEvent[] }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <ReportHeader title="ط³ط¬ظ„ طھظ†ظپظٹط° ط§ظ„ظپط¹ط§ظ„ظٹط§طھ ظˆط§ظ„ط¨ط±ط§ظ…ط¬" code="QF71-G-4-1" />
            <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeader]}>
                    <View style={[styles.tableCol, { width: '15%' }]}>
                        <Text style={styles.tableCell}>ط§ظ„طھط§ط±ظٹط®</Text>
                    </View>
                    <View style={[styles.tableCol, { width: '30%' }]}>
                        <Text style={styles.tableCell}>ط§ظ„ط¨ط±ظ†ط§ظ…ط¬</Text>
                    </View>
                    <View style={[styles.tableCol, { width: '20%' }]}>
                        <Text style={styles.tableCell}>ط§ظ„ظ…ظ‚ط±</Text>
                    </View>
                    <View style={[styles.tableCol, { width: '35%' }]}>
                        <Text style={styles.tableCell}>ط§ظ„ظ…ط®ط±ط¬ط§طھ/ط§ظ„ظ†طھط§ط¦ط¬</Text>
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
                            <Text style={styles.tableCell}>{e.outcome || 'ظ‚ظٹط¯ ط§ظ„طھظ†ظپظٹط°'}</Text>
                        </View>
                    </View>
                ))}
            </View>
            <ReportFooter code="QF71-G-4-1" />
        </Page>
    </Document>
);

// 6. Honored Students (QF71-G-5-3)
export const HonorsReport = ({ honors }: { honors: StudentHonor[] }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <ReportHeader title="ط³ط¬ظ„ طھظƒط±ظٹظ… ط§ظ„ط·ظ„ط§ط¨ ط§ظ„ظ…طھظ…ظٹط²ظٹظ†" code="QF71-G-5-3" />
            <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeader]}>
                    <View style={[styles.tableCol, { width: '30%' }]}>
                        <Text style={styles.tableCell}>ط§ط³ظ… ط§ظ„ط·ط§ظ„ط¨</Text>
                    </View>
                    <View style={[styles.tableCol, { width: '40%' }]}>
                        <Text style={styles.tableCell}>ط³ط¨ط¨ ط§ظ„طھظƒط±ظٹظ…</Text>
                    </View>
                    <View style={[styles.tableCol, { width: '30%' }]}>
                        <Text style={styles.tableCell}>ط§ظ„ط¬ط§ط¦ط²ط© ط§ظ„ظ…ط³طھظ„ظ…ط©</Text>
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
}: {
    events: ActivityEvent[];
    honors: StudentHonor[];
    stats: ActivityReportStats;
}) => (
    <Document>
        {/* Page 1: Summary & Stats */}
        <Page size="A4" style={styles.page}>
            <ReportHeader title="ط§ظ„ط³ط¬ظ„ ط§ظ„طھط±ط§ظƒظ…ظٹ ط§ظ„ط´ط§ظ…ظ„ ظ„ظ„ظ†ط´ط§ط·" code="QF71-G-3-2" />
            <View style={styles.titleContainer}>
                <Text style={styles.title}>ظ…ظ„ط®طµ ط§ظ„ط¥ظ†ط¬ط§ط²ط§طھ ظˆط§ظ„ظ†ط´ط§ط·ط§طھ</Text>
            </View>
            <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 11, marginBottom: 8 }}>ط¹ط¯ط¯ ط§ظ„ط£ظ†ط¯ظٹط© ط§ظ„ظ…ظپطھظˆط­ط©: {stats.activeClubs}</Text>
                <Text style={{ fontSize: 11, marginBottom: 8 }}>ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ظپط¹ط§ظ„ظٹط§طھ ظˆط§ظ„ط¨ط±ط§ظ…ط¬: {events.length}</Text>
                <Text style={{ fontSize: 11, marginBottom: 8 }}>ط¹ط¯ط¯ ط§ظ„ط·ظ„ط§ط¨ ط§ظ„ظ…ظƒط±ظ…ظٹظ†: {honors.length}</Text>
                <Text style={{ fontSize: 11, marginBottom: 8 }}>
                    ظ†ط³ط¨ط© ط§ط³طھظ‡ظ„ط§ظƒ ط§ظ„ظ…ظٹط²ط§ظ†ظٹط©: {stats.expenseRatio.toFixed(1)}%
                </Text>
            </View>
            <Text style={{ fontSize: 12, fontFamily: 'TajawalBold', marginBottom: 10 }}>ط£ط¨ط±ط² ط§ظ„ظپط¹ط§ظ„ظٹط§طھ ط§ظ„ظ…ظ†ظپط°ط©:</Text>
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

