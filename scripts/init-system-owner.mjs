import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

// =====================================================
// Configuration
// =====================================================
const SUPABASE_URL =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://ciwqgskyqtnciexfcgrr.supabase.co";

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// حساب مالك النظام
const SYSTEM_OWNER_EMAIL = "ali_khalids@outlook.sa";
const SYSTEM_OWNER_PASSWORD = process.env.SYSTEM_OWNER_PASSWORD;

// الاسم اللي يظهر في الواجهة (اختر واحد)
// const DISPLAY_NAME = "System Owner";
const DISPLAY_NAME = "مالك النظام";

// الدور (ثابت في النظام)
const SYSTEM_ROLE = "system_owner";

// تحقق من المتغيرات
if (!SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY in env (.env.local)");
}
if (!SYSTEM_OWNER_PASSWORD) {
    throw new Error("Missing SYSTEM_OWNER_PASSWORD in env (.env.local)");
}

// =====================================================
// Supabase Service Client (Server-only)
// =====================================================
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
});

// =====================================================
// Create / Ensure System Owner
// =====================================================
async function ensureSystemOwner() {
    console.log(`[INFO] Ensuring System Owner Account: ${SYSTEM_OWNER_EMAIL}`);

    // 1) Create Auth User (or continue if exists)
    const { data: created, error: createError } =
        await supabase.auth.admin.createUser({
            email: SYSTEM_OWNER_EMAIL,
            password: SYSTEM_OWNER_PASSWORD,
            email_confirm: true,
            user_metadata: { full_name: DISPLAY_NAME },
        });

    if (createError) {
        console.error("[ERROR] Account creation failed:", createError.message);
        console.log(
            "[INFO] Account may already exist. Continuing to profile upsert..."
        );
    } else {
        console.log("[SUCCESS] Auth user created:", created.user.id);
    }

    // 2) Get User ID (Fetch by email)
    const { data: listUsers, error: listErr } =
        await supabase.auth.admin.listUsers();

    if (listErr) {
        console.error("[ERROR] listUsers failed:", listErr.message);
        return;
    }

    const systemOwnerUser = listUsers.users.find(
        (u) => (u.email || "").toLowerCase() === SYSTEM_OWNER_EMAIL.toLowerCase()
    );

    if (!systemOwnerUser) {
        console.error("[ERROR] Could not locate user ID by email.");
        return;
    }

    const userId = systemOwnerUser.id;
    console.log(`[INFO] Target User ID: ${userId}`);

    // 3) Upsert Profile (this is what your UI usually reads)
    const { error: profileError } = await supabase.from("profiles").upsert(
        {
            id: userId,
            email: SYSTEM_OWNER_EMAIL,
            full_name: DISPLAY_NAME, // ✅ يظهر في الهيدر/الهوية
            system_role: SYSTEM_ROLE, // ✅ system_owner
            // school_id not required for system_owner
        },
        { onConflict: "id" }
    );

    if (profileError) {
        console.error("[ERROR] Profile upsert failed:", profileError);
    } else {
        console.log("[SUCCESS] Account set as SYSTEM_OWNER ✅");
    }
}

ensureSystemOwner();