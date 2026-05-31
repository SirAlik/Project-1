/**
 * normalize-auth-roles.mjs
 * ========================
 * يحدّث app_metadata.role لجميع مستخدمي Supabase Auth
 * إلى الأسماء الرسمية الجديدة وفق ROLE_KEYS_STANDARD.md،
 * ثم يُلغي جميع الجلسات الفعالة لإجبار إعادة الدخول.
 *
 * الاستخدام:
 *   node scripts/normalize-auth-roles.mjs
 *   node scripts/normalize-auth-roles.mjs --dry-run   (معاينة بدون تغيير)
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

// ============================================================
// الإعداد
// ============================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('❌  NEXT_PUBLIC_SUPABASE_URL أو SUPABASE_SERVICE_ROLE_KEY غير موجود في .env.local');
    process.exit(1);
}

const isDryRun = process.argv.includes('--dry-run');

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
});

// ============================================================
// خريطة إعادة التسمية
// ============================================================

/** @type {Record<string, string>} */
const ROLE_MAP = {
    'school_coordinator':     'school_admin',
    'principal':              'school_principal',
    'lrc_specialist':         'school_librarian',
    'vp_students':            'student_affairs_vp',
    'vp_academic':            'academic_vp',
    'vp_school':              'school_affairs_vp',
    'activities_coordinator': 'activity_leader',
    'health_supervisor':      'health_coordinator',
};

// ============================================================
// جلب جميع المستخدمين (paginated)
// ============================================================

async function fetchAllUsers() {
    const users = [];
    let page = 1;
    const perPage = 1000;

    while (true) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
        if (error) throw new Error(`listUsers error: ${error.message}`);
        users.push(...data.users);
        if (data.users.length < perPage) break;
        page++;
    }

    return users;
}

// ============================================================
// التنفيذ الرئيسي
// ============================================================

async function main() {
    console.log(`\n🔄  normalize-auth-roles — وضع: ${isDryRun ? 'DRY RUN (لا تغييرات فعلية)' : 'LIVE'}\n`);

    const allUsers = await fetchAllUsers();
    console.log(`📋  إجمالي المستخدمين: ${allUsers.length}\n`);

    const report = { updated: 0, signedOut: 0, skipped: 0, errors: 0 };

    for (const user of allUsers) {
        const currentRole = user.app_metadata?.role;
        const newRole = ROLE_MAP[currentRole];

        if (!newRole) {
            // الدور إما محدّث بالفعل أو لا يحتاج تغييراً (system_owner, teacher, student, إلخ)
            report.skipped++;
            continue;
        }

        console.log(`  👤  ${user.email || user.id}`);
        console.log(`      ${currentRole} → ${newRole}`);

        if (isDryRun) {
            report.updated++;
            continue;
        }

        // 1. تحديث app_metadata.role
        const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
            app_metadata: { ...user.app_metadata, role: newRole },
        });

        if (updateError) {
            console.error(`      ❌  تعذّر التحديث: ${updateError.message}`);
            report.errors++;
            continue;
        }

        report.updated++;

        // 2. إلغاء جميع جلسات هذا المستخدم
        const { error: signOutError } = await supabase.auth.admin.signOut(user.id, 'global');

        if (signOutError) {
            console.warn(`      ⚠️  تعذّر إلغاء الجلسة: ${signOutError.message}`);
        } else {
            report.signedOut++;
        }
    }

    // ============================================================
    // التقرير النهائي
    // ============================================================

    console.log('\n' + '─'.repeat(50));
    console.log('📊  النتيجة النهائية:');
    console.log(`    ✅  محدَّث:          ${report.updated}`);
    if (!isDryRun) {
        console.log(`    🚪  جلسات مُلغاة:   ${report.signedOut}`);
    }
    console.log(`    ⏭️  لا يحتاج تغيير:  ${report.skipped}`);
    if (report.errors > 0) {
        console.log(`    ❌  أخطاء:           ${report.errors}`);
    }
    console.log('─'.repeat(50) + '\n');

    if (isDryRun) {
        console.log('💡  شغّل بدون --dry-run لتطبيق التغييرات فعلياً.\n');
    } else if (report.updated > 0) {
        console.log('✅  اكتمل. سيُجبر المستخدمون المتأثرون على تسجيل دخول جديد.');
        console.log('   JWT tokens الجديدة ستحمل الأسماء الرسمية الصحيحة.\n');
    } else {
        console.log('✅  لا يوجد مستخدمون بأدوار قديمة. قاعدة البيانات محدَّثة بالفعل.\n');
    }
}

main().catch((err) => {
    console.error('❌  خطأ غير متوقع:', err.message);
    process.exit(1);
});
