import React, { useState } from "react";
import {
    Heart,
    Award,
    Bus,
    CheckCircle,
    Share2,
    UserCheck,
    Search,
    MapPin,
    Calendar
} from "lucide-react";
import { StudentWish, StudentHonor, ActivityTrip, TripConsent, ActivityClub } from "@/lib/types/activity";
import type { SubmitWishInput, AwardInput, CreateTripInput } from "@/app/activity/_hooks/useActivities";

interface StudentEngagementProps {
    wishes: StudentWish[];
    honors: StudentHonor[];
    trips: ActivityTrip[];
    consents: TripConsent[];
    clubs: ActivityClub[];
    students: { id: string; name: string; class_id: string }[];
    classes: { id: string; name: string }[];
    onSubmitWish: (wish: SubmitWishInput) => void;
    onAward: (honor: AwardInput) => void;
    onCreateTrip: (trip: CreateTripInput) => void;
}

export function StudentEngagement({
    wishes,
    honors,
    trips,
    consents,
    clubs,
    students,
    classes,
    onSubmitWish,
    onAward,
    onCreateTrip
}: StudentEngagementProps) {
    const [activeTab, setActiveTab] = useState<"wishes" | "honors" | "trips">("wishes");

    return (
        <div className="space-y-8 animate-in fade-in zoom-in duration-500">
            {/* Sub-Tabs */}
            <div className="flex gap-4 p-2 bg-zinc-900/50 rounded-3xl border border-zinc-800 w-fit">
                {[
                    { id: "wishes", label: "رغبات الطلاب", icon: Heart },
                    { id: "honors", label: "لوحة الشرف", icon: Award },
                    { id: "trips", label: "الرحلات والزيارات", icon: Bus },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as "wishes" | "honors" | "trips")}
                        className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-sm font-black transition-all ${activeTab === tab.id
                            ? "bg-white text-black shadow-xl"
                            : "text-zinc-500 hover:text-zinc-300"
                            }`}
                    >
                        <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? "text-[hsl(var(--gold))]" : "text-zinc-600"}`} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === "wishes" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1">
                        <StudentWishesForm clubs={clubs} students={students} onSubmit={onSubmitWish} />
                    </div>
                    <div className="lg:col-span-2">
                        <div className="bg-zinc-900/30 border border-zinc-800 rounded-[2.5rem] p-8">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-black text-white">إحصائيات الرغبات</h3>
                                <span className="text-[10px] font-black bg-[hsla(var(--gold),.10)] text-[hsl(var(--gold))] px-3 py-1 rounded-full border border-[hsla(var(--gold),.20)] uppercase tracking-widest">مباشر</span>
                            </div>
                            <div className="space-y-4">
                                {clubs.map(club => {
                                    const firstChoices = wishes.filter(w => w.first_choice === club.id).length;

                                    return (
                                        <div key={club.id} className="space-y-2">
                                            <div className="flex justify-between items-center text-[10px] font-black px-1 uppercase tracking-tighter">
                                                <span className="text-zinc-400">{club.name}</span>
                                                <span className="text-white">{firstChoices} رغبة أولى</span>
                                            </div>
                                            <div className="h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-900 group">
                                                <div
                                                    className="h-full bg-gradient-to-r from-[hsl(var(--gold-strong))] to-[hsl(var(--gold))] transition-all duration-1000 group-hover:brightness-125"
                                                    style={{ width: `${Math.min((firstChoices / students.length) * 100 * 5, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "honors" && (
                <HonorsSection honors={honors} students={students} onAward={onAward} />
            )}

            {activeTab === "trips" && (
                <TripSection trips={trips} consents={consents} classes={classes} onCreate={onCreateTrip} />
            )}
        </div>
    );
}

// --- Sub-Components ---

type WishChoiceKey = "first_choice" | "second_choice" | "third_choice";

function StudentWishesForm({ clubs, students, onSubmit }: { clubs: ActivityClub[]; students: { id: string; name: string }[]; onSubmit: (data: SubmitWishInput) => void }) {
    const [formData, setFormData] = useState({
        student_id: "",
        first_choice: "",
        second_choice: "",
        third_choice: "",
        school_year: "2025-2026"
    });

    const [search, setSearch] = useState("");

    const filteredStudents = students.filter(s => s.name.toLowerCase().includes(search.toLowerCase())).slice(0, 5);

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[hsla(var(--gold),.50)] to-transparent opacity-50" />
            <h3 className="text-lg font-black text-white mb-6">نموذج تسجيل الرغبات</h3>

            <div className="space-y-6">
                <div className="space-y-2">
                    <label className="text-xs font-black text-zinc-500 mr-2 uppercase tracking-widest">بحث عن الطالب</label>
                    <div className="relative">
                        <input
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-sm focus:border-[hsl(var(--gold))] outline-none transition-all pr-12"
                            placeholder="اكتب اسم الطالب..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            aria-label="بحث عن الطالب"
                        />
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                    </div>
                    {search && (
                        <div className="mt-2 bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-2">
                            {filteredStudents.map(student => (
                                <button
                                    key={student.id}
                                    onClick={() => { setFormData({ ...formData, student_id: student.id }); setSearch(student.name); }}
                                    className={`w-full p-4 text-right text-xs font-bold border-b border-zinc-900 last:border-0 hover:bg-zinc-900 transition-all ${formData.student_id === student.id ? "bg-[hsla(var(--gold),.10)] text-[hsl(var(--gold))]" : "text-zinc-400"}`}
                                >
                                    {student.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="space-y-4 pt-4">
                    {[
                        { id: "first_choice", label: "الرغبة الأولى", color: "text-[hsl(var(--gold))]" },
                        { id: "second_choice", label: "الرغبة الثانية", color: "text-[hsl(var(--gold))]" },
                        { id: "third_choice", label: "الرغبة الثالثة", color: "text-[hsl(var(--gold))]" },
                    ].map((choice) => (
                        <div key={choice.id} className="space-y-2">
                            <label className={`text-[10px] font-black ${choice.color} mr-2 uppercase tracking-widest`}>{choice.label}</label>
                            <select
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 text-xs font-black focus:border-[hsl(var(--gold))] outline-none appearance-none"
                                value={formData[choice.id as WishChoiceKey]}
                                onChange={(e) => setFormData({ ...formData, [choice.id]: e.target.value })}
                                aria-label={choice.label}
                            >
                                <option value="">اختر النادي...</option>
                                {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    ))}
                </div>

                <button
                    disabled={!formData.student_id || !formData.first_choice}
                    onClick={() => onSubmit(formData)}
                    className="w-full bg-white hover:brightness-110 text-black py-4 rounded-2xl text-xs font-black tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-20 mt-4"
                >
                    <CheckCircle className="w-4 h-4 text-[hsl(var(--gold))]" /> حفظ الرغبات
                </button>
            </div>
        </div>
    );
}

function HonorsSection({ honors, students, onAward }: { honors: StudentHonor[]; students: { id: string; name: string }[]; onAward: (data: AwardInput) => void }) {
    const [showModal, setShowModal] = useState(false);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-black text-white">تحفيز وتكريم الطلاب</h3>
                    <p className="text-xs text-zinc-500 font-bold">سجل الإنجازات والمكافآت (QF71-G-5-3)</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-zinc-800 hover:bg-zinc-700 text-white px-8 py-3 rounded-2xl text-xs font-black transition-all flex items-center gap-2"
                >
                    <Award className="w-4 h-4 text-[hsl(var(--gold))]" /> تكريم جديد
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {honors.map(honor => (
                    <div key={honor.id} className="bg-zinc-900/40 border border-zinc-800 p-8 rounded-[2.5rem] relative overflow-hidden group hover:border-[hsl(var(--gold),.30)] transition-all duration-500">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-[hsl(var(--gold),.05)] blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="p-3 bg-[hsla(var(--gold),.10)] rounded-2xl w-fit mb-4">
                            <Award className="w-6 h-6 text-[hsl(var(--gold))] shadow-[hsl(var(--gold),.20)]" />
                        </div>
                        <h4 className="text-sm font-black text-white mb-1">{honor.student_name}</h4>
                        <p className="text-[10px] text-zinc-500 font-bold mb-4">{honor.reason}</p>
                        <div className="flex justify-between items-center pt-4 border-t border-zinc-800/50">
                            <div>
                                <p className="text-[8px] font-black text-zinc-600 uppercase">الجائزة</p>
                                <p className="text-[10px] font-black text-[hsl(var(--gold))]">{honor.prize || "شهادة تقدير"}</p>
                            </div>
                            <span className="text-[8px] bg-zinc-800 px-2 py-1 rounded text-zinc-500 font-black">{honor.awarded_date}</span>
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <AwardModal
                    students={students}
                    onClose={() => setShowModal(false)}
                    onSubmit={(data) => { onAward(data); setShowModal(false); }}
                />
            )}
        </div>
    );
}

function TripSection({ trips, consents, classes, onCreate }: { trips: ActivityTrip[]; consents: TripConsent[]; classes: { id: string; name: string }[]; onCreate: (data: CreateTripInput) => void }) {
    const [showModal, setShowModal] = useState(false);
    const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert("📋 تم نسخ الرابط بنجاح");
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-black text-white">الرحلات والزيارات الخارجية</h3>
                    <p className="text-xs text-zinc-500 font-bold">تنظيم الموافقات اللوجستية (QF71-G-5-2)</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-[hsl(var(--gold-strong))] hover:bg-[hsl(var(--gold))] text-white px-8 py-3 rounded-2xl text-xs font-black transition-all shadow-xl shadow-[hsla(var(--gold),.20)] flex items-center gap-2"
                >
                    <Bus className="w-4 h-4" /> إنشاء رحلة جديدة
                </button>
            </div>

            <div className="space-y-4">
                {trips.map(trip => {
                    const tripConsents = consents.filter(c => c.trip_id === trip.id);
                    const approved = tripConsents.filter(c => c.parent_consent).length;
                    return (
                        <div key={trip.id} className="bg-zinc-950/50 border border-zinc-800 rounded-3xl p-6 flex flex-col md:flex-row justify-between items-center gap-6 hover:bg-zinc-900/50 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-[hsla(var(--gold),.10)] rounded-2xl">
                                    <Bus className="w-6 h-6 text-[hsl(var(--gold))]" />
                                </div>
                                <div>
                                    <h4 className="text-base font-black text-white">{trip.title}</h4>
                                    <div className="flex items-center gap-3 mt-1 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {trip.destination}</span>
                                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {trip.trip_date}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-8 items-center bg-zinc-900 px-8 py-3 rounded-2xl border border-zinc-800">
                                <div className="text-center">
                                    <p className="text-[8px] font-black text-zinc-600 mb-1 uppercase">إجمالي المسجلين</p>
                                    <p className="text-sm font-black text-white">{tripConsents.length}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[8px] font-black text-zinc-600 mb-1 uppercase">الموافقات</p>
                                    <p className="text-sm font-black text-emerald-400">{approved}</p>
                                </div>
                            </div>

                            <div className="flex gap-2 w-full md:w-auto">
                                <button
                                    onClick={() => setSelectedTripId(selectedTripId === trip.id ? null : trip.id)}
                                    className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-xs font-black transition-all ${selectedTripId === trip.id ? 'bg-white text-black' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'}`}
                                >
                                    <UserCheck className="w-4 h-4" /> {selectedTripId === trip.id ? "إغلاق القائمة" : "المتابعة"}
                                </button>
                                <button
                                    onClick={() => {
                                        const firstConsent = tripConsents[0];
                                        if (firstConsent) copyToClipboard(`${window.location.origin}/activity/consent/${firstConsent.unique_link}`);
                                    }}
                                    className="p-3 bg-zinc-800 hover:bg-[hsla(var(--gold),.20)] hover:text-[hsl(var(--gold))] text-zinc-500 rounded-2xl transition-all"
                                    title="نسخ رابط أول طالب (اختبار)"
                                    aria-label="نسخ رابط الاختبار"
                                >
                                    <Share2 className="w-4 h-4" />
                                </button>
                            </div>

                            {selectedTripId === trip.id && (
                                <div className="w-full mt-6 bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden animate-in slide-in-from-top-4">
                                    <div className="p-4 border-b border-zinc-800 bg-zinc-950/30 text-[10px] font-black text-zinc-500 uppercase">قائمة الطلاب وروابط الموافقة</div>
                                    <div className="divide-y divide-zinc-800">
                                        {tripConsents.map(c => (
                                            <div key={c.id} className="flex justify-between items-center p-4 hover:bg-white/5 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-2 rounded-full ${c.parent_consent ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-zinc-700'}`} />
                                                    <span className="text-xs font-bold text-white">{c.student_name}</span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className={`text-[10px] font-black uppercase ${c.parent_consent ? 'text-emerald-400' : 'text-zinc-600'}`}>
                                                        {c.parent_consent ? 'تمت الموافقة' : 'بانتظار الرد'}
                                                    </span>
                                                    <button
                                                        onClick={() => copyToClipboard(`${window.location.origin}/activity/consent/${c.unique_link}`)}
                                                        className="p-2 hover:bg-[hsla(var(--gold),.10)] hover:text-[hsl(var(--gold))] text-zinc-500 rounded-xl transition-all"
                                                        aria-label="نسخ رابط الموافقة"
                                                    >
                                                        <Share2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {showModal && (
                <TripModal
                    classes={classes}
                    onClose={() => setShowModal(false)}
                    onSubmit={(data) => { onCreate(data); setShowModal(false); }}
                />
            )}
        </div>
    );
}

// Sub-Modals

function AwardModal({ students, onClose, onSubmit }: { students: { id: string; name: string }[]; onClose: () => void; onSubmit: (data: AwardInput) => void }) {
    const [formData, setFormData] = useState({
        student_id: "",
        reason: "تفوق دراسي",
        prize: "",
        awarded_date: new Date().toISOString().split('T')[0]
    });

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-zinc-950/90 backdrop-blur-md animate-in slide-in-from-bottom-8">
            <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
                    <h3 className="text-xl font-black text-white">إضافة إنجاز طالب</h3>
                    <Award className="w-6 h-6 text-[hsl(var(--gold))]" />
                </div>
                <div className="p-8 space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-black text-zinc-500 uppercase tracking-widest">اختيار الطالب المكرم</label>
                        <select
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-sm focus:border-[hsl(var(--gold))] outline-none"
                            value={formData.student_id}
                            onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                            aria-label="اختيار الطالب"
                        >
                            <option value="">اختر من القائمة...</option>
                            {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-zinc-500 uppercase">سبب التكريم</label>
                            <select
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-sm"
                                value={formData.reason}
                                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                aria-label="سبب التكريم"
                            >
                                <option>تفوق دراسي</option>
                                <option>مشاركة متميزة في النشاط</option>
                                <option>سلوك مثالي</option>
                                <option>إبداع وموهبة</option>
                                <option>فوز في مسابقة</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-zinc-500 uppercase">نوع الجائزة</label>
                            <input
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-sm"
                                placeholder="شهادة، كوبون، درع..."
                                value={formData.prize}
                                onChange={(e) => setFormData({ ...formData, prize: e.target.value })}
                                aria-label="نوع الجائزة"
                            />
                        </div>
                    </div>
                </div>
                <div className="p-8 flex gap-4">
                    <button
                        disabled={!formData.student_id}
                        onClick={() => onSubmit(formData)}
                        className="flex-1 bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold-strong))] text-black py-4 rounded-2xl text-xs font-black transition-all disabled:opacity-30"
                    >
                        اعتماد التكريم
                    </button>
                    <button onClick={onClose} className="px-8 bg-zinc-800 text-zinc-400 rounded-2xl text-xs font-black transition-all">إلغاء</button>
                </div>
            </div>
        </div>
    );
}

function TripModal({ classes, onClose, onSubmit }: { classes: { id: string; name: string }[]; onClose: () => void; onSubmit: (data: CreateTripInput) => void }) {
    const [formData, setFormData] = useState({
        title: "",
        destination: "",
        trip_date: new Date().toISOString().split('T')[0],
        target_classes: [] as string[],
        cost: 0
    });

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-zinc-950/90 backdrop-blur-md animate-in slide-in-from-top-8">
            <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] w-full max-w-[600px] overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center text-right">
                    <h3 className="text-xl font-black text-white">تخطيط رحلة أو زيارة خارجية</h3>
                    <Bus className="w-6 h-6 text-[hsl(var(--gold))]" />
                </div>
                <div className="p-8 grid grid-cols-2 gap-6">
                    <div className="col-span-2 space-y-2">
                        <label className="text-xs font-black text-zinc-500 uppercase">مسمى البرنامج</label>
                        <input
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-sm focus:border-[hsl(var(--gold))] outline-none transition-all placeholder:text-zinc-700 text-right"
                            placeholder="مثال: زيارة لمركز الملك عبد العزيز الإثرائي"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            aria-label="مسمى البرنامج"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-black text-zinc-500 uppercase">الوجهة</label>
                        <input
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-sm text-right"
                            value={formData.destination}
                            onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                            aria-label="الوجهة"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-black text-zinc-500 uppercase">التاريخ</label>
                        <input
                            type="date"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-sm"
                            value={formData.trip_date}
                            onChange={(e) => setFormData({ ...formData, trip_date: e.target.value })}
                            aria-label="تاريخ الرحلة"
                        />
                    </div>
                    <div className="col-span-2 space-y-4 pt-4 border-t border-zinc-800">
                        <label className="text-xs font-black text-zinc-500 uppercase mb-2 block">الصفوف المستهدفة</label>
                        <div className="grid grid-cols-3 gap-2">
                            {classes.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => {
                                        const exists = formData.target_classes.includes(c.id);
                                        setFormData({ ...formData, target_classes: exists ? formData.target_classes.filter(id => id !== c.id) : [...formData.target_classes, c.id] });
                                    }}
                                    className={`px-3 py-2 rounded-xl text-[10px] font-black border transition-all ${formData.target_classes.includes(c.id) ? "bg-[hsl(var(--gold))] border-[hsl(var(--gold))] text-white" : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}
                                >
                                    {c.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="p-8 bg-zinc-900/50 flex gap-4">
                    <button
                        disabled={!formData.title || formData.target_classes.length === 0}
                        onClick={() => onSubmit(formData)}
                        className="flex-1 bg-white hover:brightness-110 text-black py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                    >
                        تأكيد الرحلة
                    </button>
                    <button onClick={onClose} className="px-8 bg-zinc-800 text-zinc-400 rounded-2xl text-xs font-black transition-all">إلغاء</button>
                </div>
            </div>
        </div>
    );
}
