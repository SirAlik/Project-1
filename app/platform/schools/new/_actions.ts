"use server";

interface CreateSchoolData {
    name: string;
    type: string;
    slug: string;
}

export async function createSchoolAction(data: CreateSchoolData) {
    if (!data.name || !data.slug) {
        throw new Error("Missing required fields");
    }

    throw new Error("إنشاء المدارس غير مفعل بعد. يجب ربط هذا المسار بعملية قاعدة بيانات حقيقية قبل الاستخدام.");
}
