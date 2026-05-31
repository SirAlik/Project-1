import React from 'react';
import { Shield } from 'lucide-react';

export default function SchoolAffairsPage() {
    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-6" dir="rtl">
            <div className="text-center opacity-60">
                <Shield size={48} className="mx-auto mb-4 text-[var(--primary)]" />
                <h1 className="text-2xl font-bold mb-2">وكيل الشؤون المدرسية</h1>
                <p className="text-sm">هذه الصفحة قيد الإنشاء (Coming Soon)</p>
            </div>
        </div>
    );
}
