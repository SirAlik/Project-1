import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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

export async function middleware(req: NextRequest) {
    const startTime = performance.now();
    const pathname = req.nextUrl.pathname;

    // --- PRESENTATION BYPASS ---
    // If 'demo' query param is present, bypass all auth/RBAC checks
    if (req.nextUrl.searchParams.has('demo')) {
        console.log(`[Middleware] Presentation Bypass for: ${pathname}`);
        return NextResponse.next();
    }

    // 0. EMERGENCY BYPASS FOR ROOT
    if (pathname === '/') {
        console.log(`[Middleware] Path: / | Time: ${(performance.now() - startTime).toFixed(2)}ms | Branch: root-bypass`);
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
        console.log(`[Middleware] Path: ${pathname} | Time: ${(performance.now() - startTime).toFixed(2)}ms | Branch: static-bypass`);
        return NextResponse.next();
    }

    // 2. ZERO-WORK POLICY: /portal and /api/persona/select bypass active_persona checks
    if (pathname === '/portal' || pathname.startsWith('/api/persona/select')) {
        console.log(`[Middleware] Path: ${pathname} | Time: ${(performance.now() - startTime).toFixed(2)}ms | Branch: portal-zero-work`);
        return response;
    }

    // 3. Public Route Bypass (BEFORE auth call)
    if (PUBLIC_ROUTES.includes(pathname) || pathname.startsWith('/auth/')) {
        console.log(`[Middleware] Path: ${pathname} | Time: ${(performance.now() - startTime).toFixed(2)}ms | Branch: public-route`);
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
    console.log(`[Middleware] Auth check took: ${(performance.now() - authStart).toFixed(2)}ms`);

    // 6. SPECIAL /login HANDLING
    if (pathname === '/login') {
        if (user) {
            console.log(`[Middleware] Path: /login | Time: ${(performance.now() - startTime).toFixed(2)}ms | Branch: login-to-portal`);
            return redirectWithCookies(response, new URL('/portal', req.url));
        } else {
            console.log(`[Middleware] Path: /login | Time: ${(performance.now() - startTime).toFixed(2)}ms | Branch: login-allowed`);
            return response;
        }
    }

    // 7. Protected Route Guard (Authentication)
    if (!user) {
        console.log(`[Middleware] Path: ${pathname} | Time: ${(performance.now() - startTime).toFixed(2)}ms | Branch: no-auth-redirect`);
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
        console.log('[Middleware] No active persona found. Redirecting to Portal.');
        return redirectWithCookies(response, new URL('/portal', req.url));
    }

    // فك تشفير الـ JWT وتطبيع الدور
    let canonicalRole: UserRole;
    try {
        const parts = activePersonaCookie.split('.');
        if (parts.length !== 3) {
            console.log('[Middleware] Invalid JWT format. Redirecting to Portal.');
            return redirectWithCookies(response, new URL('/portal', req.url));
        }

        const payloadB64url = parts[1];
        let base64 = payloadB64url.replace(/-/g, '+').replace(/_/g, '/');
        const padding = (4 - (base64.length % 4)) % 4;
        base64 += '='.repeat(padding);
        const jsonStr = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        const context = JSON.parse(jsonStr);
        const rawRole: string = context.role ?? '';

        const resolved: UserRole | undefined =
            ALL_ROLES.has(rawRole as UserRole) ? (rawRole as UserRole) : undefined;

        if (!resolved) {
            console.log(`[Middleware] Unknown role "${rawRole}". Redirecting to Portal.`);
            return redirectWithCookies(response, new URL('/portal', req.url));
        }

        canonicalRole = resolved;
    } catch (e) {
        console.log('[Middleware] JWT decode error:', e);
        return redirectWithCookies(response, new URL('/portal', req.url));
    }

    // 10. RBAC Check
    // الأدوار العالمية (system_owner) تملك صلاحية وصول كاملة
    if (GLOBAL_ROLES.has(canonicalRole)) {
        console.log(`[Middleware] Path: ${pathname} | Time: ${(performance.now() - startTime).toFixed(2)}ms | Branch: global-role-allow`);
        return response;
    }

    const allowedPrefixes = ROLE_ACCESS_MAP[canonicalRole] ?? [];
    const isAllowed = allowedPrefixes.includes('*') || allowedPrefixes.some((prefix: string) => pathname.startsWith(prefix));

    if (!isAllowed) {
        console.log(`[Middleware] Path: ${pathname} | Time: ${(performance.now() - startTime).toFixed(2)}ms | Branch: rbac-denied`);
        return NextResponse.rewrite(new URL('/403', req.url));
    }

    console.log(`[Middleware] Path: ${pathname} | Time: ${(performance.now() - startTime).toFixed(2)}ms | Branch: rbac-allowed`);
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
