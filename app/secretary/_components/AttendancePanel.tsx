import React, { useState } from "react";
import { Clock, UserCheck, UserX, LogOut, Search } from "lucide-react";
import { Employee, AttendanceLog } from "@/lib/types/secretary";

interface Props {
    employees: Employee[];
    attendance: AttendanceLog[];
    onLogAttendance: (log: Omit<AttendanceLog, "id" | "created_at" | "is_late">) => void;
}

export function AttendancePanel({ employees, attendance, onLogAttendance }: Props) {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [showLogModal, setShowLogModal] = useState(false);
    const [logType, setLogType] = useState<"arrival" | "exit" | "absence">("arrival");

    const filteredEmployees = employees.filter(e =>
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.employee_id.includes(searchTerm)
    );

    const getTodayLog = (employeeId: string) => {
        return attendance.find(a => a.employee_id === employeeId);
    };

    const handleQuickArrival = (employeeId: string) => {
        const now = new Date();
        onLogAttendance({
            employee_id: employeeId,
            log_date: now.toISOString().split('T')[0],
            arrival_time: now.toTimeString().split(' ')[0],
            departure_time: null,
            is_absent: false
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-zinc-900/50 p-6 rounded-[2rem] border border-zinc-800">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Clock className="w-5 h-5 text-indigo-400" />
                        تسجيل الحضور اليومي
                    </h3>
                    <p className="text-zinc-500 text-sm mt-1">سجل دخول الموظفين، الاستئذانات، وحالات الغياب.</p>
                </div>
                <div className="relative w-full md:w-64">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="بحث عن موظف..."
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-3 pr-11 pl-4 text-xs text-white focus:outline-none focus:border-indigo-500/50 transition-all font-bold"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        aria-label="بحث عن موظف"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEmployees.map(employee => {
                    const log = getTodayLog(employee.id);
                    return (
                        <div key={employee.id} className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-[2.5rem] hover:border-zinc-700 transition-all group relative overflow-hidden">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{employee.employee_id}</div>
                                    <h4 className="text-white font-bold text-lg leading-tight mt-1">{employee.name}</h4>
                                    <p className="text-zinc-500 text-[10px] font-bold mt-0.5">{employee.position} | {employee.department}</p>
                                </div>
                                <div className={`p-2 rounded-xl ${log ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-600'}`}>
                                    {log ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                                </div>
                            </div>

                            <div className="flex gap-2 mt-6">
                                {!log ? (
                                    <>
                                        <button
                                            onClick={() => handleQuickArrival(employee.id)}
                                            className="flex-1 bg-white text-black py-3 rounded-2xl text-[10px] font-black uppercase hover:bg-zinc-200 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Clock className="w-3.5 h-3.5" /> تسجيل دخول
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSelectedEmployee(employee);
                                                setLogType("absence");
                                                setShowLogModal(true);
                                            }}
                                            className="p-3 bg-zinc-800 text-zinc-500 hover:bg-rose-500/10 hover:text-rose-400 rounded-2xl transition-all"
                                            title="تسجيل غياب"
                                        >
                                            <UserX className="w-4 h-4" />
                                        </button>
                                    </>
                                ) : (
                                    <div className="flex-1 space-y-3">
                                        <div className="flex justify-between items-center text-[10px] border-b border-zinc-800/50 pb-2">
                                            <span className="text-zinc-500 font-bold">وقت الوصول:</span>
                                            <span className={`font-black ${log.is_late ? 'text-rose-400' : 'text-emerald-400'}`}>
                                                {log.arrival_time || '--:--'} {log.is_late && '(متأخر)'}
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setSelectedEmployee(employee);
                                                    setLogType("exit");
                                                    setShowLogModal(true);
                                                }}
                                                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-3 rounded-2xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2"
                                            >
                                                <LogOut className="w-3.5 h-3.5" /> تسجيل استئذان
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Attendance Modal (Simplified) */}
            {showLogModal && selectedEmployee && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="p-8">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h4 className="text-white text-xl font-bold">
                                        {logType === "absence" ? "تسجيل غياب" : "تسجيل استئذان"}
                                    </h4>
                                    <p className="text-zinc-500 text-xs mt-1">{selectedEmployee.name}</p>
                                </div>
                                <button onClick={() => setShowLogModal(false)} className="text-zinc-500 hover:text-white transition-colors">إغلاق</button>
                            </div>

                            <form onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.currentTarget);
                                const now = new Date();
                                if (logType === "absence") {
                                    onLogAttendance({
                                        employee_id: selectedEmployee.id,
                                        log_date: now.toISOString().split('T')[0],
                                        arrival_time: null,
                                        departure_time: null,
                                        is_absent: true,
                                        absence_type: formData.get("absence_type") as 'excused' | 'unexcused' | undefined,
                                        notes: formData.get("notes")?.toString()
                                    });
                                } else {
                                    onLogAttendance({
                                        employee_id: selectedEmployee.id,
                                        log_date: now.toISOString().split('T')[0],
                                        arrival_time: null,
                                        departure_time: null,
                                        is_absent: false,
                                        exit_time: now.toTimeString().split(' ')[0],
                                        exit_reason: formData.get("reason")?.toString(),
                                        notes: formData.get("notes")?.toString()
                                    });
                                }
                                setShowLogModal(false);
                            }} className="space-y-6">
                                {logType === "absence" ? (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">نوع الغياب</label>
                                        <select name="absence_type" className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-xs text-white font-bold appearance-none" title="نوع الغياب">
                                            <option value="unexcused">بدون عذر (يولد استفسار تلقائي)</option>
                                            <option value="excused">بعذر رسمي</option>
                                        </select>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">سبب الاستئذان</label>
                                        <input name="reason" type="text" className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-xs text-white font-bold" required title="سبب الاستئذان" />
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">ملاحظات إضافية</label>
                                    <textarea name="notes" className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-xs text-white font-bold h-24" title="ملاحظات إضافية" />
                                </div>

                                <button type="submit" className="w-full bg-indigo-500 hover:bg-indigo-400 text-white py-4 rounded-2xl text-xs font-black uppercase transition-all shadow-lg shadow-indigo-500/20">
                                    تأكيد العملية
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
