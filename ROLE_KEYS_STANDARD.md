# Sidra OS Official Role Keys Constitution

## Official Role Keys

| role_key | Arabic Label |
|---|---|
| system_owner | مالك النظام |
| school_admin | منسق المدرسة |
| school_principal | مدير المدرسة |
| school_librarian | أمين مصادر التعلم |
| student_affairs_vp | وكيل شؤون الطلاب |
| academic_vp | وكيل الشؤون التعليمية |
| school_affairs_vp | وكيل الشؤون المدرسية |
| school_secretary | سكرتير المدرسة |
| activity_leader | رائد النشاط |
| student_counselor | الموجه الطلابي |
| student | الطالب |
| parent | ولي الأمر |
| teacher | معلم |
| health_coordinator | الموجه الصحي |
| quality_coordinator | منسق الجودة |
| lab_technician | محضر المختبر |

## Rules

- These are the ONLY official role keys allowed in the system.
- Any legacy role names must be normalized to these keys.
- All RBAC/PBAC/Auth logic must use these role keys only.
- Database, routes, dashboards, and permissions must follow this standard.
- Arabic labels are display-only.
- role_key is the official programming identifier

## Critical Disambiguation

- `school_admin` (**منسق المدرسة**) is a **school-level** role scoped to one tenant via `school_id`. It is **NOT** the platform owner.
- `system_owner` (**مالك النظام**) is the **global platform owner** (no `school_id`); it is the only role with wildcard access.
- The System Owner area lives at **`/platform`** (renamed from `/admin` on 2026-06-10), and `/platform/dashboard` is the platform command center. The word "admin" in `school_admin` is a role key only — it does **not** imply platform/system ownership.
