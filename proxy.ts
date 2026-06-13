import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

/**
 * FINAL TRUTH: Role Scope Classification
 * =======================================
 * GLOBAL ROLES (no schoolId required):
 *   - system_owner: Canonical global admin with wildcard access
 *
 * SCHOOL-SCOPED ROLES (schoolId REQUIRED):
 *   - All other roles must have a valid schoolId to activate
 *   - school_admin and all school roles are SCHOOL-SCOPED
 */

import { ROLE_ACCESS_MAP, GLOBAL_ROLES, ALL_ROLES } from '@/lib/auth/roles';
import type { UserRole } from '@/lib/auth/roles';

const PUBLIC_ROUTES = ['/', '/auth/callback', '/unauthorized', '/403'];

/**
 * Public route PREFIXES (token-scoped, no session required).
 * `/activity/consent/<uniqueLink>` is a parent-facing consent link gated by an
 * unguessable per-record token; data access is via server actions, not broad anon DB.
 */
const PUBLIC_PREFIXES = ['/activity/consent/'];

/** Dev-only trace logger — silenced in production to avoid request-path/timing log noise. */
const trace = (...args: unknown[]) => {
    if (process.env.NODE_ENV !== 'production') {
        console.log(...args);
    }
};

/**
 * Helper: Creates a redirect response and copies all cookies from the source response.
 * This prevents session loss when auth tokens are refreshed before a redirect.
 */
function redirectWithCookies(sourceResponse: NextResponse, url: URL): NextResponse {
    const redirectResponse = NextResponse.redirect(url);
    // Copy all cookies from the source response to the redirect response
    sourceResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    return redirectResponse;
}

export async function proxy(req: NextRequest) {
    const startTime = performance.now();
    const pathname = req.nextUrl.pathname;

    // 0. EMERGENCY BYPASS FOR ROOT
    if (pathname === '/') {
        trace(`[Proxy] Path: / | Time: ${(performance.now() - startTime).toFixed(2)}ms | Branch: root-bypass`);
        return NextResponse.next();
    }

    // Create a single local response that will collect all cookie updates
    const response = NextResponse.next({
        request: {
            headers: req.headers,
        },
    });

    // 1. Static Asset Bypass (BEFORE any auth)
    if (pathname.includes('.') || pathname.startsWith('/_next') || pathname === '/favicon.ico') {
        trace(`[Proxy] Path: ${pathname} | Time: ${(performance.now() - startTime).toFixed(2)}ms | Branch: static-bypass`);
        return NextResponse.next();
    }

    // 2. ZERO-WORK POLICY: /portal and /api/persona/select bypass active_persona checks
    if (pathname === '/portal' || pathname.startsWith('/api/persona/select')) {
        trace(`[Proxy] Path: ${pathname} | Time: ${(performance.now() - startTime).toFixed(2)}ms | Branch: portal-zero-work`);
        return response;
    }

    // 3. Public Route Bypass (BEFORE auth call)
    if (
        PUBLIC_ROUTES.includes(pathname) ||
        pathname.startsWith('/auth/') ||
        PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
    ) {
        trace(`[Proxy] Path: ${pathname} | Time: ${(performance.now() - startTime).toFixed(2)}ms | Branch: public-route`);
        return response;
    }

    // 4. Supabase Client Setup
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return req.cookies.getAll();
                },
                setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        req.cookies.set(name, value);
                        response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
                    });
                },
            },
        }
    );

    // 5. Auth Session Refresh & Verification
    const authStart = performance.now();
    const { data: { user } } = await supabase.auth.getUser();
    trace(`[Proxy] Auth check took: ${(performance.now() - authStart).toFixed(2)}ms`);

    // 6. SPECIAL /login HANDLING
    if (pathname === '/login') {
        if (user) {
            trace(`[Proxy] Path: /login | Time: ${(performance.now() - startTime).toFixed(2)}ms | Branch: login-to-portal`);
            return redirectWithCookies(response, new URL('/portal', req.url));
        } else {
            trace(`[Proxy] Path: /login | Time: ${(performance.now() - startTime).toFixed(2)}ms | Branch: login-allowed`);
            return response;
        }
    }

    // 7. Protected Route Guard (Authentication)
    if (!user) {
        trace(`[Proxy] Path: ${pathname} | Time: ${(performance.now() - startTime).toFixed(2)}ms | Branch: no-auth-redirect`);
        const redirectUrl = new URL('/login', req.url);
        redirectUrl.searchParams.set('redirect', pathname);
        return redirectWithCookies(response, redirectUrl);
    }

    // 8. ACTIVE CONTEXT CHECK
    const activePersonaCookie = req.cookies.get('active_persona')?.value;

    if (!activePersonaCookie) {
        if (pathname === '/portal') {
            return response;
        }
        trace('[Proxy] No active persona found. Redirecting to Portal.');
        return redirectWithCookies(response, new URL('/portal', req.url));
    }

    // التحقق من توقيع الـ JWT واستخراج الدور
    let canonicalRole: UserRole;
    try {
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            trace('[Proxy] JWT_SECRET غير مضبوط. إعادة توجيه للبوابة.');
            return redirectWithCookies(response, new URL('/portal', req.url));
        }

        const secret = new TextEncoder().encode(jwtSecret);
        const { payload } = await jwtVerify(activePersonaCookie, secret);
        const rawRole: string = typeof payload.role === 'string' ? payload.role : '';

        const resolved: UserRole | undefined =
            ALL_ROLES.has(rawRole as UserRole) ? (rawRole as UserRole) : undefined;

        if (!resolved) {
            trace(`[Proxy] دور غير معروف "${rawRole}". إعادة توجيه للبوابة.`);
            return redirectWithCookies(response, new URL('/portal', req.url));
        }

        canonicalRole = resolved;
    } catch (e) {
        trace('[Proxy] فشل التحقق من JWT:', e);
        return redirectWithCookies(response, new URL('/portal', req.url));
    }

    // 10. RBAC Check
    // الأدوار العالمية (system_owner) تملك صلاحية وصول كاملة
    if (GLOBAL_ROLES.has(canonicalRole)) {
        trace(`[Proxy] Path: ${pathname} | Time: ${(performance.now() - startTime).toFixed(2)}ms | Branch: global-role-allow`);
        return response;
    }

    const allowedPrefixes = ROLE_ACCESS_MAP[canonicalRole] ?? [];
    const isAllowed = allowedPrefixes.includes('*') || allowedPrefixes.some((prefix: string) => pathname.startsWith(prefix));

    if (!isAllowed) {
        trace(`[Proxy] Path: ${pathname} | Time: ${(performance.now() - startTime).toFixed(2)}ms | Branch: rbac-denied`);
        return NextResponse.rewrite(new URL('/403', req.url));
    }

    trace(`[Proxy] Path: ${pathname} | Time: ${(performance.now() - startTime).toFixed(2)}ms | Branch: rbac-allowed`);
    return response;
}

// Ensure it applies to all routes except api/auth/callback (which is public)
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public assets
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
