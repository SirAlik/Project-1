import React, { useState } from "react";
import { Calendar, MapPin, Clock, Plus, MoreVertical, X } from "lucide-react";
import { Meeting, Employee, MeetingAttendee } from "@/lib/types/secretary";
import { MeetingScheduleInput } from "@/app/secretary/_hooks/useSecretary";

interface Props {
    meetings: Meeting[];
    employees: Employee[];
    onSchedule: (meeting: MeetingScheduleInput, attendeeIds: string[]) => void;
}

export function MeetingScheduler({ meetings, employees, onSchedule }: Props) {
    const [showModal, setShowModal] = useState(false);
    const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white/80 p-6 rounded-[2rem] border border-stone-200">
                <div>
                    <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-indigo-400" />
                        إدارة الاجتماعات واللقاءات
                    </h3>
                    <p className="text-stone-500 text-sm mt-1">جدولة الاجتماعات، دعوة الحضور، وتوثيق المحاضر.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-white text-black px-6 py-3 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-zinc-200 transition-all shadow-lg shadow-white/5"
                >
                    <Plus className="w-4 h-4" /> جدولة اجتماع جديد
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {meetings.map(meeting => (
                    <div key={meeting.id} className="bg-white/80 border border-stone-200 p-6 rounded-[2.5rem] hover:border-stone-300 transition-all group">
                        <div className="flex justify-between items-start mb-6">
                            <div className={`px - 4 py - 1.5 rounded - full text - [9px] font - black border uppercase tracking - widest ${meeting.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/10' :
                                meeting.status === 'scheduled' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/10' :
                                    'bg-stone-200 text-stone-500 border-stone-300'
                                } `}>
                                {meeting.status === 'completed' ? 'منتهى' : 'مجدول'}
                            </div>
                            <button type="button" className="p-2 text-stone-500 hover:text-foreground transition-colors" aria-label="خيارات الاجتماع">
                                <MoreVertical className="w-4 h-4" />
                            </button>
                        </div>

                        <h4 className="text-white font-bold text-lg mb-4">{meeting.title}</h4>

                        <div className="grid grid-cols-2 gap-y-4 mb-6">
                            <div className="flex items-center gap-3 text-stone-500 text-[10px] font-bold uppercase">
                                <Calendar className="w-4 h-4 text-zinc-700" />
                                <span>{meeting.meeting_date}</span>
                            </div>
                            <div className="flex items-center gap-3 text-stone-500 text-[10px] font-bold uppercase">
                                <Clock className="w-4 h-4 text-zinc-700" />
                                <span>{meeting.meeting_time} {meeting.end_time && `- ${meeting.end_time} `}</span>
                            </div>
                            <div className="flex items-center gap-3 text-stone-500 text-[10px] font-bold uppercase col-span-2">
                                <MapPin className="w-4 h-4 text-zinc-700" />
                                <span>{meeting.location || 'غير محدد'}</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-6 border-t border-stone-200">
                            <div className="flex -space-x-2 space-x-reverse">
                                {meeting.attendees?.slice(0, 3).map((a: MeetingAttendee, idx: number) => (
                                    <div key={idx} className="w-8 h-8 rounded-full bg-stone-200 border-2 border-zinc-950 flex items-center justify-center text-[10px] font-black text-stone-500 uppercase">
                                        {a.employee_name?.substring(0, 1) || 'U'}
                                    </div>
                                ))}
                                {(meeting.attendees?.length || 0) > 3 && (
                                    <div className="w-8 h-8 rounded-full bg-stone-200 border-2 border-zinc-950 flex items-center justify-center text-[8px] font-black text-stone-500">
                                        +{(meeting.attendees?.length || 0) - 3}
                                    </div>
                                )}
                            </div>
                            <button className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 transition-colors uppercase" aria-label={`عرض محضر اجتماع ${meeting.title} `}>
                                عرض المحضر
                            </button>
                        </div>
                    </div>
                ))}

                {meetings.length === 0 && (
                    <div className="bg-white/80 border border-stone-200 p-12 rounded-[2.5rem] text-center col-span-full">
                        <Calendar className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                        <h4 className="text-stone-500 font-bold">لم يتم جدولة اجتماعات بعد</h4>
                        <button onClick={() => setShowModal(true)} className="mt-4 text-indigo-400 font-black text-[10px] uppercase hover:underline" aria-label="جدول أول اجتماع الآن">جدول أول اجتماع الآن</button>
                    </div>
                )}
            </div>

            {/* Schedule Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-200/70 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-stone-100 border border-stone-200 w-full max-w-2xl rounded-[3rem] shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
                        <div className="p-10">
                            <div className="flex justify-between items-start mb-10">
                                <div>
                                    <h4 className="text-white text-2xl font-black">جدولة اجتماع جديد</h4>
                                    <p className="text-stone-500 text-sm mt-1">سيتم توليد &quot;دعوة اجتماع&quot; (QF19-1) تلقائياً.</p>
                                </div>
                                <button onClick={() => setShowModal(false)} className="text-stone-500 hover:text-foreground transition-colors p-2" aria-label="إغلاق المجدول">
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.currentTarget);
                                const meetingObj = {
                                    title: formData.get("title"),
                                    meeting_date: formData.get("date"),
                                    meeting_time: formData.get("time"),
                                    location: formData.get("location"),
                                    description: formData.get("description"), // Added description
                                    meeting_type: "general",
                                    status: "scheduled"
                                };
                                onSchedule(meetingObj, selectedAttendees);
                                setShowModal(false);
                                setSelectedAttendees([]);
                            }} className="space-y-8">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2 col-span-2">
                                        <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest px-1">عنوان الاجتماع</label>
                                        <input name="title" type="text" className="w-full bg-white border border-stone-200 rounded-2xl p-4 text-sm text-foreground font-bold" placeholder="مثال: الاجتماع الدوري الأول للهيئة التعليمية" required aria-label="عنوان الاجتماع" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest px-1">التاريخ</label>
                                        <input name="date" type="date" className="w-full bg-white border border-stone-200 rounded-2xl p-4 text-sm text-foreground font-bold" required aria-label="تاريخ الاجتماع" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest px-1">الوقت</label>
                                        <input name="time" type="time" className="w-full bg-white border border-stone-200 rounded-2xl p-4 text-sm text-foreground font-bold" required aria-label="وقت الاجتماع" />
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest px-1">المكان</label>
                                        <input name="location" type="text" className="w-full bg-white border border-stone-200 rounded-2xl p-4 text-sm text-foreground font-bold" placeholder="مثال: غرفة المعلمين / مكتب المدير" required aria-label="مكان الاجتماع" />
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest px-1">وصف الاجتماع</label>
                                        <textarea
                                            name="description"
                                            className="w-full bg-white border border-stone-200 rounded-2xl p-4 text-sm text-foreground font-bold resize-none"
                                            placeholder="أضف وصفاً أو أجندة الاجتماع..."
                                            rows={3}
                                            aria-label="وصف الاجتماع"
                                        ></textarea>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest px-1">دعوة الحضور</label>
                                    <div className="bg-white border border-stone-200 rounded-2xl p-4 h-48 overflow-y-auto space-y-2 scrollbar-thin">
                                        {employees.map(emp => (
                                            <label key={emp.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer group">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 bg-stone-200 border-stone-300 rounded text-indigo-500 focus:ring-0"
                                                    checked={selectedAttendees.includes(emp.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setSelectedAttendees([...selectedAttendees, emp.id]);
                                                        else setSelectedAttendees(selectedAttendees.filter(id => id !== emp.id));
                                                    }}
                                                />
                                                <div className="flex-1">
                                                    <p className="text-xs font-bold text-foreground group-hover:text-foreground transition-colors">{emp.name}</p>
                                                    <p className="text-[10px] text-stone-500">{emp.position}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <button type="submit" className="w-full bg-white text-black py-4 rounded-2xl text-[10px] font-black uppercase transition-all shadow-lg hover:shadow-white/10 active:scale-[0.98]">
                                    تأكيد الجدولة والحفظ
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
