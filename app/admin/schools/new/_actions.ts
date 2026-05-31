"use server";

import { revalidatePath } from "next/cache";

interface CreateSchoolData {
    name: string;
    type: string;
    slug: string;
}

export async function createSchoolAction(data: CreateSchoolData) {
    // Simulate delay for effect
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Validate
    if (!data.name || !data.slug) {
        throw new Error("Missing required fields");
    }

    // In a real app we would insert into DB
    /*
    const { error } = await supabase.from('schools').insert({
        name: data.name,
        type: data.type,
        slug: data.slug,
        created_at: new Date().toISOString()
    });
    if (error) throw error;
    */

    console.log("[Server Action] School created:", data);

    // Revalidate dashboard
    revalidatePath('/admin/dashboard');

    return { success: true, message: "School created successfully" };
}
