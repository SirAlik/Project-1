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
    Employee,
    CorrespondenceRow,
    LeaveRow,
    HRInquiry,
    Meeting,
    ProcurementRequest,
    AttendanceLog,
    AssignmentLetter,
    AgendaItem
} from "@/lib/types/secretary";

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
        borderBottomColor: "#1f2937",
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
        color: "#6b7280",
        marginTop: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: "black",
        textAlign: "center",
        marginBottom: 20,
        color: "#000",
    },
    section: {
        marginBottom: 15,
        padding: 10,
        border: 1,
        borderColor: "#e5e7eb",
        borderRadius: 4,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: "bold",
        backgroundColor: "#f9fafb",
        padding: 5,
        marginBottom: 10,
        borderBottom: 1,
        borderBottomColor: "#e5e7eb",
        textAlign: "right",
    },
    row: {
        flexDirection: "row-reverse",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    label: {
        fontWeight: "bold",
        color: "#4b5563",
    },
    value: {
        color: "#000",
    },
    table: {
        marginTop: 10,
        borderWidth: 1,
        borderColor: "#e5e7eb",
    },
    tableHeader: {
        flexDirection: "row-reverse",
        backgroundColor: "#f3f4f6",
        borderBottomWidth: 1,
        borderBottomColor: "#e5e7eb",
        padding: 5,
    },
    tableCell: {
        flex: 1,
        textAlign: "right",
        padding: 4,
        fontSize: 9,
    },
    footer: {
        position: "absolute",
        bottom: 30,
        left: 40,
        right: 40,
        borderTop: 1,
        borderTopColor: "#e5e7eb",
        paddingTop: 10,
        flexDirection: "row-reverse",
        justifyContent: "space-between",
        fontSize: 8,
        color: "#9ca3af",
    },
    signatureBlock: {
        marginTop: 40,
        flexDirection: "row-reverse",
        justifyContent: "space-around",
    },
    signature: {
        textAlign: "center",
        width: 150,
    },
    signatureLine: {
        borderBottom: 1,
        borderBottomColor: "#d1d5db",
        marginTop: 20,
        marginBottom: 5,
    },
});

/**
 * نماذج السكرتارية الرسمية (سلسلة QF71-A-* و QF19-*).
 * ملاحظة معمارية: أكواد QF والبنية الحالية قوالب خاصة بمستأجر «الفلاح» (tenant-specific) — وليست
 * افتراضات سِدرة العالمية. اسم المدرسة يُمرَّر ديناميكياً عبر prop `schoolName` (المصدر: سياق المستأجر
 * المصادَق عبر useAuth في ReportsCenter) ولا يُثبَّت في القالب. العلامة المرئية «سِدرة» فقط.
 * سجلّ القوالب/الأكواد لكل مدرسة (tenant template registry) = طبقة لاحقة (Phase 3D) ولا يُنفَّذ هنا.
 */
const QFHeader = ({ qfCode, title, schoolName }: { qfCode: string; title: string; schoolName?: string }) => (
    <View style={styles.header}>
        <View style={styles.schoolInfo}>
            <Text style={{ fontSize: 12, fontWeight: "bold" }}>المملكة العربية السعودية</Text>
            <Text>وزارة التعليم</Text>
            <Text>{schoolName || 'المدرسة'}</Text>
            <Text style={styles.qfCode}>رمز النموذج: {qfCode}</Text>
        </View>
        <View style={{ alignItems: "center" }}>
            <PdfImage
                src="https://upload.wikimedia.org/wikipedia/ar/thumb/a/a2/Logo_Ministry_of_Education_Saudi_Arabia.svg/1200px-Logo_Ministry_of_Education_Saudi_Arabia.svg.png"
                style={styles.ministryLogo}
            />
            <Text style={{ fontSize: 14, fontWeight: "black", marginTop: 5 }}>{title}</Text>
        </View>
        <View style={{ textAlign: "left" }}>
            <Text>التاريخ: {new Date().toLocaleDateString('ar-SA')}</Text>
            <Text>الموافق: {new Date().toLocaleDateString('en-GB')}</Text>
            <Text>الصفحة: 1 من 1</Text>
        </View>
    </View>
);

const QFFooter = () => (
    <View style={styles.footer}>
        <Text>سِدرة • السكرتارية الموحدة</Text>
        <Text>طُبع بواسطة النظام آلياً</Text>
    </View>
);

const SignatureSection = ({ role1 = "سكرتير المدرسة", name1 = "................", role2 = "مدير المدرسة", name2 = "................" }) => (
    <View style={styles.signatureBlock}>
        <View style={styles.signature}>
            <Text style={{ fontWeight: "bold" }}>{role1}</Text>
            <View style={styles.signatureLine} />
            <Text>{name1}</Text>
        </View>
        <View style={styles.signature}>
            <Text style={{ fontWeight: "bold" }}>{role2}</Text>
            <View style={styles.signatureLine} />
            <Text>{name2}</Text>
        </View>
    </View>
);

// --- 1. HR & Attendance Forms ---

// QF71-A-3-1: Late Arrival Inquiry
export const LateInquiryPDF = ({ inquiry, employee, schoolName }: { inquiry: HRInquiry; employee: Employee; schoolName?: string }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <QFHeader qfCode="QF71-A-3-1" title="استفسار عن تأخر موظف" schoolName={schoolName} />

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>بيانات الموظف</Text>
                <View style={styles.row}>
                    <Text style={styles.label}>الاسم:</Text>
                    <Text style={styles.value}>{employee.name}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>الرقم الوظيفي:</Text>
                    <Text style={styles.value}>{employee.employee_id}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>التخصص / القسم:</Text>
                    <Text style={styles.value}>{employee.department}</Text>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>تفاصيل المخالفة</Text>
                <Text style={{ textAlign: "right", lineHeight: 1.6 }}>
                    بناءً على سجلات الحضور والغياب، يتبين تأخركم عن العمل في تاريخ {inquiry.incident_date} حيث كان وقت وصولكم {inquiry.incident_date} (سيتم ربط الوقت لاحقاً). يرجى تقديم تبريركم خطياً للعرض على الإدارة.
                </Text>
            </View>

            <View style={{ ...styles.section, height: 120 }}>
                <Text style={styles.sectionTitle}>رأي / تبرير الموظف</Text>
                <Text style={styles.value}>{inquiry.justification || "................................................................"}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>مرئيات الإدارة</Text>
                <Text style={styles.value}>{inquiry.principal_decision || "................................................................"}</Text>
            </View>

            <SignatureSection />
            <QFFooter />
        </Page>
    </Document>
);

// QF71-A-3-2: Absence Inquiry
export const AbsenceInquiryPDF = ({ inquiry, employee, schoolName }: { inquiry: HRInquiry; employee: Employee; schoolName?: string }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <QFHeader qfCode="QF71-A-3-2" title="استفسار عن غياب موظف" schoolName={schoolName} />
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>بيانات الموظف</Text>
                <View style={styles.row}><Text style={styles.label}>الاسم:</Text><Text style={styles.value}>{employee.name}</Text></View>
            </View>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>تفاصيل الغياب</Text>
                <Text style={{ textAlign: "right" }}>نحيطكم علماً بتغيبكم عن العمل بتاريخ {inquiry.incident_date}.</Text>
            </View>
            <View style={{ ...styles.section, height: 100 }}><Text style={styles.sectionTitle}>التبرير</Text><Text>{inquiry.justification || ""}</Text></View>
            <SignatureSection />
            <QFFooter />
        </Page>
    </Document>
);

// QF19-2: Meeting Minutes
export const MeetingMinutesPDF = ({ meeting, schoolName }: { meeting: Meeting; schoolName?: string }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <QFHeader qfCode="QF19-2" title="محضر اجتماع رسمي" schoolName={schoolName} />
            <View style={styles.section}>
                <View style={styles.row}>
                    <Text style={styles.label}>عنوان الاجتماع:</Text>
                    <Text style={styles.value}>{meeting.title}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>التاريخ:</Text>
                    <Text style={styles.value}>{meeting.meeting_date}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>المكان:</Text>
                    <Text style={styles.value}>{meeting.location}</Text>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>جدول الأعمال</Text>
                {meeting.agenda_items?.map((item, i) => (
                    <Text key={i} style={{ textAlign: "right", marginBottom: 4 }}>- {item.text}</Text>
                ))}
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>أبرز التوصيات والقرارات</Text>
                <Text style={{ textAlign: "right", lineHeight: 1.5 }}>{meeting.minutes || "جاري التوثيق..."}</Text>
            </View>

            <View style={styles.table}>
                <View style={styles.tableHeader}>
                    <Text style={styles.tableCell}>الاسم</Text>
                    <Text style={styles.tableCell}>الصفة</Text>
                    <Text style={styles.tableCell}>الحضور</Text>
                    <Text style={styles.tableCell}>التوقيع</Text>
                </View>
                {meeting.attendees?.map((a, i) => (
                    <View key={i} style={styles.row}>
                        <Text style={styles.tableCell}>{a.employee_name}</Text>
                        <Text style={styles.tableCell}>{a.role}</Text>
                        <Text style={styles.tableCell}>{a.attended ? "حاضر" : "معتذر"}</Text>
                        <Text style={styles.tableCell}>................</Text>
                    </View>
                ))}
            </View>

            <SignatureSection name1="سكرتير الاجتماع" name2="رئيس الاجتماع" />
            <QFFooter />
        </Page>
    </Document>
);

// QF71-A-4-1: Procurement Request
export const ProcurementRequestPDF = ({ request, schoolName }: { request: ProcurementRequest; schoolName?: string }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <QFHeader qfCode="QF71-A-4-1" title="نموذج طلب احتياج / شراء" schoolName={schoolName} />
            <View style={styles.section}>
                <View style={styles.row}>
                    <Text style={styles.label}>رقم الطلب:</Text>
                    <Text style={styles.value}>{request.request_number}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>القسم الطالب:</Text>
                    <Text style={styles.value}>{request.department || "عام"}</Text>
                </View>
            </View>

            <View style={styles.table}>
                <View style={styles.tableHeader}>
                    <Text style={{ ...styles.tableCell, flex: 0.5 }}>م</Text>
                    <Text style={{ ...styles.tableCell, flex: 3 }}>اسم الصنف</Text>
                    <Text style={styles.tableCell}>الكمية</Text>
                    <Text style={{ ...styles.tableCell, flex: 2 }}>المواصفات</Text>
                </View>
                {request.items?.map((item, i) => (
                    <View key={i} style={{ ...styles.row, borderBottom: 1, borderBottomColor: "#eee" }}>
                        <Text style={{ ...styles.tableCell, flex: 0.5 }}>{i + 1}</Text>
                        <Text style={{ ...styles.tableCell, flex: 3 }}>{item.name}</Text>
                        <Text style={styles.tableCell}>{item.qty}</Text>
                        <Text style={{ ...styles.tableCell, flex: 2 }}>{item.specs}</Text>
                    </View>
                ))}
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>مبررات الطلب</Text>
                <Text style={{ textAlign: "right" }}>{request.justification}</Text>
            </View>

            <SignatureSection name1="مقدم الطلب" name2="المسؤول المالي" />
            <QFFooter />
        </Page>
    </Document>
);

// QF71-A-2-1: Incoming Mail Log
export const IncomingLogPDF = ({ letters, schoolName }: { letters: CorrespondenceRow[]; schoolName?: string }) => (
    <Document>
        <Page size="A4" orientation="landscape" style={styles.page}>
            <QFHeader qfCode="QF71-A-2-1" title="سجل الوارد العام" schoolName={schoolName} />
            <View style={styles.table}>
                <View style={styles.tableHeader}>
                    <Text style={styles.tableCell}>الرقم التسلسلي</Text>
                    <Text style={styles.tableCell}>المرسل</Text>
                    <Text style={{ ...styles.tableCell, flex: 2 }}>الموضوع</Text>
                    <Text style={styles.tableCell}>التاريخ</Text>
                    <Text style={styles.tableCell}>الحالة</Text>
                </View>
                {letters.filter(l => l.type === 'incoming').map((l, i) => (
                    <View key={i} style={styles.row}>
                        <Text style={styles.tableCell}>{i + 1}</Text>
                        <Text style={styles.tableCell}>{l.sender}</Text>
                        <Text style={{ ...styles.tableCell, flex: 2 }}>{l.subject}</Text>
                        <Text style={styles.tableCell}>{l.date}</Text>
                        <Text style={styles.tableCell}>{l.status}</Text>
                    </View>
                ))}
            </View>
            <QFFooter />
        </Page>
    </Document>
);

// QF71-A-3-3: Salary Deduction Decision
export const DeductionDecisionPDF = ({ inquiry, employee, schoolName }: { inquiry: HRInquiry; employee: Employee; schoolName?: string }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <QFHeader qfCode="QF71-A-3-3" title="قرار حسم من الراتب" schoolName={schoolName} />
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>بيانات الموظف</Text>
                <View style={styles.row}><Text style={styles.label}>الاسم:</Text><Text style={styles.value}>{employee.name}</Text></View>
                <View style={styles.row}><Text style={styles.label}>الرقم الوظيفي:</Text><Text style={styles.value}>{employee.employee_id}</Text></View>
            </View>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>منطوق القرار</Text>
                <Text style={{ textAlign: "right", lineHeight: 1.8 }}>
                    بناءً على مخالفته المتمثلة في ({inquiry.type === 'late' ? 'التأخر المتكرر' : 'الغياب بدون عذر'}) بتاريخ {inquiry.incident_date}،
                    وبعد الاطلاع على تبريره المقدم، فقد تقرر حسم مدة ({inquiry.deduction_days}) يوماً من راتبه.
                </Text>
            </View>
            <SignatureSection role1="المدير المالي" role2="مدير المدرسة" />
            <QFFooter />
        </Page>
    </Document>
);

// QF71-A-3-4: Daily Exit Log (Permissions)
export const AttendanceExitLogPDF = ({ logs, schoolName }: { logs: AttendanceLog[]; schoolName?: string }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <QFHeader qfCode="QF71-A-3-4" title="سجل الاستئذان اليومي" schoolName={schoolName} />
            <View style={styles.table}>
                <View style={styles.tableHeader}>
                    <Text style={styles.tableCell}>الموظف</Text>
                    <Text style={styles.tableCell}>وقت الخروج</Text>
                    <Text style={styles.tableCell}>وقت العودة</Text>
                    <Text style={{ ...styles.tableCell, flex: 2 }}>السبب</Text>
                </View>
                {logs.filter(l => l.exit_time).map((l, i) => (
                    <View key={i} style={styles.row}>
                        <Text style={styles.tableCell}>{l.employee?.name || 'موظف'}</Text>
                        <Text style={styles.tableCell}>{l.exit_time}</Text>
                        <Text style={styles.tableCell}>{l.return_time || '--:--'}</Text>
                        <Text style={{ ...styles.tableCell, flex: 2 }}>{l.exit_reason}</Text>
                    </View>
                ))}
            </View>
            <QFFooter />
        </Page>
    </Document>
);

// QF71-A-3-5: Emergency Leave Request
export const EmergencyLeavePDF = ({ leave, employee, schoolName }: { leave: LeaveRow; employee: Employee; schoolName?: string }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <QFHeader qfCode="QF71-A-3-5" title="طلب إجازة اضطرارية" schoolName={schoolName} />
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>بيانات مقدم الطلب</Text>
                <View style={styles.row}><Text style={styles.label}>الاسم:</Text><Text style={styles.value}>{employee.name}</Text></View>
                <View style={styles.row}><Text style={styles.label}>الرقم الوظيفي:</Text><Text style={styles.value}>{employee.employee_id}</Text></View>
            </View>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>تفاصيل الإجازة</Text>
                <View style={styles.row}><Text style={styles.label}>من تاريخ:</Text><Text style={styles.value}>{leave.start_date}</Text></View>
                <View style={styles.row}><Text style={styles.label}>إلى تاريخ:</Text><Text style={styles.value}>{leave.end_date}</Text></View>
                <View style={styles.row}><Text style={styles.label}>السبب:</Text><Text style={styles.value}>{leave.reason}</Text></View>
            </View>
            <SignatureSection role1="الموظف" name1={employee.name} />
            <QFFooter />
        </Page>
    </Document>
);

// QF71-A-2-2: Outgoing Mail Log
export const OutgoingLogPDF = ({ letters, schoolName }: { letters: CorrespondenceRow[]; schoolName?: string }) => (
    <Document>
        <Page size="A4" orientation="landscape" style={styles.page}>
            <QFHeader qfCode="QF71-A-2-2" title="سجل الصادر العام" schoolName={schoolName} />
            <View style={styles.table}>
                <View style={styles.tableHeader}>
                    <Text style={styles.tableCell}>الرقم</Text>
                    <Text style={styles.tableCell}>الوجهة</Text>
                    <Text style={{ ...styles.tableCell, flex: 2 }}>الموضوع</Text>
                    <Text style={styles.tableCell}>التاريخ</Text>
                    <Text style={styles.tableCell}>طريقة الإرسال</Text>
                </View>
                {letters.filter(l => l.type === 'outgoing').map((l, i) => (
                    <View key={i} style={styles.row}>
                        <Text style={styles.tableCell}>{i + 1}</Text>
                        <Text style={styles.tableCell}>{l.sender}</Text>
                        <Text style={{ ...styles.tableCell, flex: 2 }}>{l.subject}</Text>
                        <Text style={styles.tableCell}>{l.date}</Text>
                        <Text style={styles.tableCell}>بريد رسمي</Text>
                    </View>
                ))}
            </View>
            <QFFooter />
        </Page>
    </Document>
);

// QF71-A-2-3: Assignment Letter
export const AssignmentLetterPDF = ({ letter, employee, schoolName }: { letter: AssignmentLetter; employee: Employee; schoolName?: string }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <QFHeader qfCode="QF71-A-2-3" title="قرار تكليف بمهمة" schoolName={schoolName} />
            <View style={styles.section}>
                <Text style={{ textAlign: "right", marginVertical: 20, lineHeight: 1.6 }}>
                    بناءً على ما تقتضيه مصلحة العمل، فقد تقرر تكليف الأستاذ/ {employee.name} بمهمة ({letter.purpose}) في جهة ({letter.destination})
                    وذلك اعتباراً من تاريخ {letter.start_date} وحتى {letter.end_date}.
                </Text>
            </View>
            <SignatureSection role1="المدير المباشر" role2="مدير المدرسة" />
            <QFFooter />
        </Page>
    </Document>
);

// QF71-A-2-4: Official Letter Template
export const OfficialLetterPDF = ({ correspondence, schoolName }: { correspondence: CorrespondenceRow; schoolName?: string }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <QFHeader qfCode="QF71-A-2-4" title="خطاب رسمي" schoolName={schoolName} />
            <View style={{ marginTop: 40, textAlign: "right" }}>
                <Text style={{ fontSize: 12, fontWeight: "bold" }}>سعادة/ {correspondence.sender || '...............'} المحترم</Text>
                <Text style={{ marginTop: 10 }}>السلام عليكم ورحمة الله وبركاته،،،</Text>
                <Text style={{ marginTop: 20, marginBottom: 20, fontWeight: "bold", textAlign: "center" }}>الموضوع: {correspondence.subject}</Text>
                <Text style={{ lineHeight: 1.8 }}>نحيطكم علماً بـ ..........................................................................................................................................</Text>
                <Text style={{ marginTop: 40 }}>وتقبلوا وافر التحية والتقدير،،،</Text>
            </View>
            <SignatureSection />
            <QFFooter />
        </Page>
    </Document>
);

// QF71-A-2-5: Commencement Letter
export const CommencementLetterPDF = ({ letter, employee, schoolName }: { letter: AssignmentLetter; employee: Employee; schoolName?: string }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <QFHeader qfCode="QF71-A-2-5" title="خطاب مباشرة عمل" schoolName={schoolName} />
            <View style={styles.section}>
                <Text style={{ textAlign: "right", lineHeight: 1.6 }}>
                    نفيدكم بأن الموظف/ {employee.name} قد باشر مهام عمله في وظيفة ({letter.position_title}) بقسم ({letter.department})
                    وذلك بتاريخ {letter.issue_date}.
                </Text>
            </View>
            <SignatureSection />
            <QFFooter />
        </Page>
    </Document>
);

// QF71-A-2-6: Clearance Form
export const ClearanceFormPDF = ({ letter, employee, schoolName }: { letter: AssignmentLetter; employee: Employee; schoolName?: string }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <QFHeader qfCode="QF71-A-2-6" title="نموذج إخلاء طرف" schoolName={schoolName} />
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>بيانات الموظف</Text>
                <View style={styles.row}><Text style={styles.label}>الاسم:</Text><Text style={styles.value}>{employee.name}</Text></View>
                <View style={styles.row}><Text style={styles.label}>آخر يوم عمل:</Text><Text style={styles.value}>{letter.last_working_day}</Text></View>
            </View>
            <View style={styles.table}>
                <View style={styles.tableHeader}>
                    <Text style={{ ...styles.tableCell, flex: 2 }}>القسم</Text>
                    <Text style={styles.tableCell}>الحالة</Text>
                    <Text style={styles.tableCell}>التوقيع</Text>
                </View>
                {['إدارة الموارد البشرية', 'المكتبة المدرسية', 'معامل العلوم', 'قسم المالية'].map((dept, i) => (
                    <View key={i} style={styles.row}>
                        <Text style={{ ...styles.tableCell, flex: 2 }}>{dept}</Text>
                        <Text style={styles.tableCell}>تم الإخلاء</Text>
                        <Text style={styles.tableCell}>................</Text>
                    </View>
                ))}
            </View>
            <SignatureSection />
            <QFFooter />
        </Page>
    </Document>
);

// QF19-1: Meeting Invitation
export const MeetingInvitationPDF = ({ meeting, schoolName }: { meeting: Meeting; schoolName?: string }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <QFHeader qfCode="QF19-1" title="دعوة لحضور اجتماع" schoolName={schoolName} />
            <View style={{ marginTop: 20, textAlign: "right" }}>
                <Text>السادة الموظفين الموقرين،،،</Text>
                <Text style={{ marginTop: 10 }}>السلام عليكم ورحمة الله وبركاته،،،</Text>
                <Text style={{ marginTop: 20, lineHeight: 1.6 }}>
                    نأمل منكم التكرم بحضور اجتماع ({meeting.title}) والمقرر عقده بتاريخ {meeting.meeting_date} في تمام الساعة {meeting.meeting_time} بمقر ({meeting.location}).
                </Text>
                <Text style={{ marginTop: 20, fontWeight: "bold" }}>جدول الأعمال:</Text>
                {meeting.agenda_items?.map((item: AgendaItem, i: number) => (
                    <Text key={i} style={{ marginRight: 10 }}>- {item.text}</Text>
                ))}
            </View>
            <SignatureSection name1="منظم الاجتماع" />
            <QFFooter />
        </Page>
    </Document>
);
