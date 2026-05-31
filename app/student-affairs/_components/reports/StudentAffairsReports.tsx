import React from "react";
import {
    Page,
    Text,
    View,
    Document,
    StyleSheet,
    Font,
    Image as PdfImage
} from "@react-pdf/renderer";
import {
    StudentProfile,
    StudentAttendance,
    BehavioralReferral,
    StudentAsset,
    BehavioralContract
} from "@/lib/types/student-affairs";

// Register Arabic Font
Font.register({
    family: "Tajawal",
    fonts: [
        { src: "https://fonts.gstatic.com/s/tajawal/v9/I02J666eST_SRstHwn7m9vAt.ttf", fontWeight: 400 },
        { src: "https://fonts.gstatic.com/s/tajawal/v9/I02G666eST_SRstHwkAt.ttf", fontWeight: 700 },
        { src: "https://fonts.gstatic.com/s/tajawal/v9/I02G666eST_SRstHwkAt.ttf", fontWeight: 900 },
    ],
});

const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontFamily: "Tajawal",
        fontSize: 10,
        color: "#1f2937",
        direction: "rtl",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: 2,
        borderBottomColor: "#000",
        paddingBottom: 10,
        marginBottom: 20,
    },
    schoolInfo: {
        textAlign: "right",
    },
    ministryLogo: {
        width: 120,
        height: 60,
    },
    qfCode: {
        fontSize: 8,
        fontWeight: "bold",
        color: "#4b5563",
        marginTop: 4,
    },
    title: {
        fontSize: 16,
        fontWeight: "heavy",
        textAlign: "center",
        marginBottom: 20,
        color: "#000",
        textDecoration: "underline",
    },
    section: {
        marginBottom: 15,
        padding: 10,
        border: 1,
        borderColor: "#e5e7eb",
        borderRadius: 4,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: "bold",
        backgroundColor: "#f3f4f6",
        padding: 5,
        marginBottom: 10,
        textAlign: "right",
    },
    row: {
        flexDirection: "row-reverse",
        justifyContent: "space-between",
        marginBottom: 6,
    },
    label: {
        fontWeight: "bold",
        color: "#374151",
    },
    value: {
        color: "#000",
    },
    table: {
        marginTop: 10,
        borderWidth: 1,
        borderColor: "#000",
    },
    tableHeader: {
        flexDirection: "row-reverse",
        backgroundColor: "#f3f4f6",
        borderBottomWidth: 1,
        borderBottomColor: "#000",
        fontWeight: "bold",
    },
    tableRow: {
        flexDirection: "row-reverse",
        borderBottomWidth: 1,
        borderBottomColor: "#e5e7eb",
    },
    tableCell: {
        padding: 5,
        textAlign: "center",
        flex: 1,
        borderLeftWidth: 1,
        borderLeftColor: "#e5e7eb",
    },
    footer: {
        position: "absolute",
        bottom: 30,
        left: 40,
        right: 40,
        borderTop: 1,
        borderTopColor: "#e5e7eb",
        paddingTop: 10,
        flexDirection: "row",
        justifyContent: "space-between",
    },
    signatureBlock: {
        marginTop: 30,
        flexDirection: "row-reverse",
        justifyContent: "space-between",
    },
    signature: {
        textAlign: "center",
        width: 150,
    }
});

// Shared Layout Components
const QFHeader = ({ qf }: { title?: string; qf: string }) => (
    <View style={styles.header}>
        <View style={styles.schoolInfo}>
            <Text style={{ fontSize: 12, fontWeight: "bold" }}>مدارس الفلاح الأهلية</Text>
            <Text>وحدة شؤون الطلاب</Text>
            <Text style={styles.qfCode}>{qf}</Text>
        </View>
        <PdfImage style={styles.ministryLogo} src="https://upload.wikimedia.org/wikipedia/ar/thumb/8/8a/Ministry_of_Education_%28Saudi_Arabia%29_logo.svg/1200px-Ministry_of_Education_%28Saudi_Arabia%29_logo.svg.png" />
    </View>
);

const QFFooter = () => (
    <View style={styles.footer}>
        <Text>التاريخ: {new Date().toLocaleDateString('ar-SA')}</Text>
        <Text>نظام إدارة المدارس - School OS</Text>
        <Text>صفحة 1 من 1</Text>
    </View>
);

// 1. QF71-C-2-2: Student Personal Data
export const QF71_C_2_2 = ({ student }: { student: StudentProfile }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <QFHeader title="بيانات الطالب الشخصية" qf="QF71-C-2-2" />
            <Text style={styles.title}>بيانات الطالب الشخصية</Text>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>المعلومات الأساسية</Text>
                <View style={styles.row}><Text style={styles.label}>الاسم الرباعي:</Text><Text style={styles.value}>{student.name}</Text></View>
                <View style={styles.row}><Text style={styles.label}>رقم الملف:</Text><Text style={styles.value}>{student.student_id}</Text></View>
                <View style={styles.row}><Text style={styles.label}>رقم الهوية / الإقامة:</Text><Text style={styles.value}>{student.national_id || "---"}</Text></View>
                <View style={styles.row}><Text style={styles.label}>الجنسية:</Text><Text style={styles.value}>{student.nationality || "---"}</Text></View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>معلومات التواصل</Text>
                <View style={styles.row}><Text style={styles.label}>اسم ولي الأمر:</Text><Text style={styles.value}>{student.guardian_name || "---"}</Text></View>
                <View style={styles.row}><Text style={styles.label}>رقم الجوال:</Text><Text style={styles.value}>{student.guardian_phone || "---"}</Text></View>
                <View style={styles.row}><Text style={styles.label}>العنوان:</Text><Text style={styles.value}>{student.address_city} - {student.address_district}</Text></View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>الملاحظات الطبية</Text>
                <Text style={{ fontSize: 9, lineHeight: 1.5 }}>{student.medical_notes || "لا توجد حلات مرضية مسجلة"}</Text>
            </View>

            <View style={styles.signatureBlock}>
                <View style={styles.signature}><Text>توقيع وكيل شؤون الطلاب</Text><Text style={{ marginTop: 20 }}>.........................</Text></View>
                <View style={styles.signature}><Text>ختم المدرسة</Text><Text style={{ marginTop: 20 }}>.........................</Text></View>
            </View>
            <QFFooter />
        </Page>
    </Document>
);

// 2. QF71-C-5-1: Morning Lateness Log
export const QF71_C_5_1 = ({ records, date }: { records: StudentAttendance[], date: string }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <QFHeader title="سجل التأخر الصباحي" qf="QF71-C-5-1" />
            <Text style={styles.title}>سجل التأخر الصباحي ليوم {date}</Text>

            <View style={styles.table}>
                <View style={styles.tableHeader}>
                    <Text style={[styles.tableCell, { flex: 0.5 }]}>م</Text>
                    <Text style={[styles.tableCell, { flex: 2 }]}>اسم الطالب</Text>
                    <Text style={styles.tableCell}>الصف</Text>
                    <Text style={styles.tableCell}>وقت الحضور</Text>
                    <Text style={[styles.tableCell, { flex: 1.5 }]}>السبب</Text>
                </View>
                {records.map((r, i) => (
                    <View key={r.id} style={styles.tableRow}>
                        <Text style={[styles.tableCell, { flex: 0.5 }]}>{i + 1}</Text>
                        <Text style={[styles.tableCell, { flex: 2 }]}>{r.student?.name}</Text>
                        <Text style={styles.tableCell}>{r.student?.student_id}</Text>
                        <Text style={styles.tableCell}>{r.time_in}</Text>
                        <Text style={[styles.tableCell, { flex: 1.5 }]}>{r.excuse_reason || "---"}</Text>
                    </View>
                ))}
            </View>
            <QFFooter />
        </Page>
    </Document>
);

// 3. QF71-C-4-1: Student Exit Log
export const QF71_C_4_1 = ({ records, date }: { records: StudentAttendance[], date: string }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <QFHeader title="سجل استئذان الطلاب" qf="QF71-C-4-1" />
            <Text style={styles.title}>سجل استئذان الطلاب ليوم {date}</Text>

            <View style={styles.table}>
                <View style={styles.tableHeader}>
                    <Text style={[styles.tableCell, { flex: 2 }]}>اسم الطالب</Text>
                    <Text style={styles.tableCell}>وقت الخروج</Text>
                    <Text style={[styles.tableCell, { flex: 1.5 }]}>ولي الأمر المستلم</Text>
                    <Text style={styles.tableCell}>الصلة</Text>
                    <Text style={styles.tableCell}>سبب الخروج</Text>
                </View>
                {records.map((r) => (
                    <View key={r.id} style={styles.tableRow}>
                        <Text style={[styles.tableCell, { flex: 2 }]}>{r.student?.name}</Text>
                        <Text style={styles.tableCell}>{r.time_out}</Text>
                        <Text style={[styles.tableCell, { flex: 1.5 }]}>{r.exit_guardian_name}</Text>
                        <Text style={styles.tableCell}>{r.exit_guardian_relation}</Text>
                        <Text style={styles.tableCell}>{r.exit_reason}</Text>
                    </View>
                ))}
            </View>
            <QFFooter />
        </Page>
    </Document>
);

// 4. QF71-C-5-3: Referral Form (Student Affairs -> Counselor)
export const QF71_C_5_3 = ({ referral }: { referral: BehavioralReferral }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <QFHeader title="إحالة طالب للمرشد الطلابي" qf="QF71-C-5-3" />
            <Text style={styles.title}>إحالة طالب للمرشد الطلابي</Text>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>بيانات الطالب</Text>
                <View style={styles.row}><Text style={styles.label}>اسم الطالب:</Text><Text style={styles.value}>{referral.student?.name}</Text></View>
                <View style={styles.row}><Text style={styles.label}>نوع المخالفة:</Text><Text style={styles.value}>{referral.referral_type}</Text></View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>مرئيات وكيل شؤون الطلاب</Text>
                <Text style={{ minHeight: 60 }}>{referral.vp_reason}</Text>
                <View style={styles.row}><Text style={styles.label}>التاريخ:</Text><Text style={styles.value}>{new Date(referral.created_at).toLocaleDateString('ar-SA')}</Text></View>
            </View>

            <View style={[styles.section, { borderStyle: "dashed", borderColor: "#000" }]}>
                <Text style={styles.sectionTitle}>خاص بالمرشد الطلابي (الإجراء المتخذ)</Text>
                <Text style={{ minHeight: 100 }}>{referral.counselor_action || "بانتظار الإجراء..."}</Text>
                <View style={styles.row}><Text style={styles.label}>حالة الإحالة:</Text><Text style={styles.value}>{referral.status}</Text></View>
            </View>

            <View style={styles.signatureBlock}>
                <View style={styles.signature}><Text>وكيل شؤون الطلاب</Text></View>
                <View style={styles.signature}><Text>المرشد الطلابي</Text></View>
            </View>
            <QFFooter />
        </Page>
    </Document>
);

// 5. QF71-C-5-2: Daily Absence Log
export const QF71_C_5_2 = ({ records, date }: { records: StudentAttendance[], date: string }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <QFHeader title="سجل الغياب اليومي" qf="QF71-C-5-2" />
            <Text style={styles.title}>سجل الغياب اليومي ليوم {date}</Text>

            <View style={styles.table}>
                <View style={styles.tableHeader}>
                    <Text style={[styles.tableCell, { flex: 0.5 }]}>م</Text>
                    <Text style={[styles.tableCell, { flex: 2 }]}>اسم الطالب</Text>
                    <Text style={styles.tableCell}>الصف</Text>
                    <Text style={styles.tableCell}>نوع الغياب</Text>
                    <Text style={[styles.tableCell, { flex: 1.5 }]}>العذر المقدم</Text>
                </View>
                {records.map((r, i) => (
                    <View key={r.id} style={styles.tableRow}>
                        <Text style={[styles.tableCell, { flex: 0.5 }]}>{i + 1}</Text>
                        <Text style={[styles.tableCell, { flex: 2 }]}>{r.student?.name}</Text>
                        <Text style={styles.tableCell}>{r.student?.student_id}</Text>
                        <Text style={styles.tableCell}>{r.is_excused ? "بعذر" : "بدون عذر"}</Text>
                        <Text style={[styles.tableCell, { flex: 1.5 }]}>{r.excuse_reason || "---"}</Text>
                    </View>
                ))}
            </View>
            <QFFooter />
        </Page>
    </Document>
);

// 6. QF71-C-3-1: Book Handover/Return (Asset Management)
export const QF71_C_3_1 = ({ records }: { records: StudentAsset[] }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <QFHeader title="سجل استلام وتسليم العهد" qf="QF71-C-3-1" />
            <Text style={styles.title}>سجل استلام وتسليم الكتب والعهد المدرسيّة</Text>

            <View style={styles.table}>
                <View style={styles.tableHeader}>
                    <Text style={[styles.tableCell, { flex: 2 }]}>اسم الطالب</Text>
                    <Text style={[styles.tableCell, { flex: 1.5 }]}>العهدة / الكتاب</Text>
                    <Text style={styles.tableCell}>تاريخ الاستلام</Text>
                    <Text style={styles.tableCell}>تاريخ العودة</Text>
                    <Text style={styles.tableCell}>الحالة</Text>
                </View>
                {records.map((r) => (
                    <View key={r.id} style={styles.tableRow}>
                        <Text style={[styles.tableCell, { flex: 2 }]}>{r.student?.name}</Text>
                        <Text style={[styles.tableCell, { flex: 1.5 }]}>{r.asset_name}</Text>
                        <Text style={styles.tableCell}>{r.handover_date}</Text>
                        <Text style={styles.tableCell}>{r.return_date || "---"}</Text>
                        <Text style={styles.tableCell}>{r.status}</Text>
                    </View>
                ))}
            </View>
            <QFFooter />
        </Page>
    </Document>
);

// 7. QF71-C-2-3: Student Roster
export const QF71_C_2_3 = ({ students, grade }: { students: StudentProfile[], grade: string }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <QFHeader title="كشف بأسماء الطلاب" qf="QF71-C-2-3" />
            <Text style={styles.title}>كشف بأسماء الطلاب - {grade}</Text>

            <View style={styles.table}>
                <View style={styles.tableHeader}>
                    <Text style={[styles.tableCell, { flex: 0.5 }]}>م</Text>
                    <Text style={[styles.tableCell, { flex: 1 }]}>رقم الملف</Text>
                    <Text style={[styles.tableCell, { flex: 3 }]}>اسم الطالب</Text>
                    <Text style={[styles.tableCell, { flex: 1.5 }]}>رقم الهوية</Text>
                    <Text style={[styles.tableCell, { flex: 1.5 }]}>ملاحظات</Text>
                </View>
                {students.map((s, i) => (
                    <View key={s.id} style={styles.tableRow}>
                        <Text style={[styles.tableCell, { flex: 0.5 }]}>{i + 1}</Text>
                        <Text style={[styles.tableCell, { flex: 1 }]}>{s.student_id}</Text>
                        <Text style={[styles.tableCell, { flex: 3 }]}>{s.name}</Text>
                        <Text style={[styles.tableCell, { flex: 1.5 }]}>{s.national_id || "---"}</Text>
                        <Text style={[styles.tableCell, { flex: 1.5 }]}></Text>
                    </View>
                ))}
            </View>
            <QFFooter />
        </Page>
    </Document>
);

// 8. QF71-C-6-1: Behavioral Contract (التعهد السلوكي)
export const QF71_C_6_1 = ({ student }: { contract?: BehavioralContract, student: StudentProfile }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <QFHeader title="نموذج التعهد السلوكي" qf="QF71-C-6-1" />
            <Text style={styles.title}>نموذج التعهد بعدم تكرار المخالفة</Text>

            <View style={styles.section}>
                <Text style={{ fontSize: 12, lineHeight: 2 }}>
                    أنا الطالب/ {student.name}، المقيد في الصف {student.grade_level}، أتعهد بالالتزام بأنظمة ولوائح المدرسة،
                    وبعدم تكرار ما بدر مني من مخالفة سلوكية، وفي حال تكرار ذلك فإني أتحمل ما يترتب
                    على ذلك من إجراءات نظامية وفق لائحة السلوك والمواظبة.
                </Text>
            </View>

            <View style={[styles.signatureBlock, { marginTop: 50 }]}>
                <View style={styles.signature}><Text>توقيع الطالب</Text><Text style={{ marginTop: 20 }}>.........................</Text></View>
                <View style={styles.signature}><Text>اسم وتوقيع ولي الأمر</Text><Text style={{ marginTop: 20 }}>.........................</Text></View>
            </View>

            <View style={[styles.signatureBlock, { marginTop: 30 }]}>
                <View style={styles.signature}><Text>المرشد الطلابي</Text></View>
                <View style={styles.signature}><Text>وكيل شؤون الطلاب</Text></View>
            </View>
            <QFFooter />
        </Page>
    </Document>
);
