'use client';

import React, { useState } from 'react';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { useAuth } from '@/app/_context/AuthContext';
import { UserMenu } from './UserMenu';
import { NotificationsMenu } from './NotificationsMenu';
import { Menu } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isShellRoute } from '@/lib/navigation/shell-routes';

export const GlobalHeader = () => {
    const { scrollY } = useScroll();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    useAuth();
    const pathname = usePathname();
    const isHome = pathname === '/';

    useMotionValueEvent(scrollY, "change", (latest) => {
        setIsScrolled(latest > 20);
    });

    // إخفاء الترويسة العامة على: الدخول + الهبوط العام (/) + البوابة + أي مسار يملك صدفة سِدرة
    // الخاصة (PlatformShell · SchoolDashboardShell · LrcWorkspace · RoleDashboardShell) — كشف
    // مركزي عبر isShellRoute. صفحات /student و/parent ليست أصدافاً → تبقى ترويستها العامة.
    if (pathname === '/login' || pathname === '/' || pathname === '/portal' || isShellRoute(pathname)) return null;

    // Dynamic contrast styles
    const isTransparent = isHome && !isScrolled;
    const textColor = isTransparent ? 'text-white' : 'text-foreground';
    const textMuted = isTransparent ? 'text-white/80' : 'text-muted-foreground';
    const hoverBg = isTransparent ? 'hover:bg-white/10' : 'hover:bg-secondary/80';
    const containerClasses = isScrolled
        ? 'mt-4 max-w-6xl rounded-2xl bg-background/90 backdrop-blur-md border border-white/10 shadow-lg'
        : 'mt-0 max-w-full bg-transparent border-b border-transparent';

    return (
        <>
        <motion.header
            dir="rtl"
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.5, ease: 'circOut' }}
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500`}
        >
            <div
                className={`
          mx-auto px-6 h-20 flex items-center justify-between
          transition-all duration-300
          ${containerClasses}
        `}
            >
                {/* Right Section: Logo & Role Switcher */}
                <div className="flex items-center gap-6">
                    <Link href="/" className="flex items-center gap-3 group">
                        <span className={`font-black text-xl tracking-tight hidden md:block ${isScrolled ? 'opacity-100' : 'opacity-90'} ${textColor}`}>
                            سِدرة
                        </span>
                    </Link>
                </div>

                {/* Center Section: REMOVED (Strict Purge) */}
                <div className="hidden md:flex flex-1 items-center justify-center max-w-md mx-auto">
                </div>

                {/* Left Section: User & Theme */}
                {/* GUARDRAIL: DO NOT ADD ANY ICONS HERE EXCEPT NOTIFICATIONS & USER MENU */}
                <div className="flex items-center gap-3">

                    {/* Notifications */}
                    <div className={textColor}>
                        <NotificationsMenu />
                    </div>

                    {/* Unified User Menu (Includes Theme & Role Switching) */}
                    <UserMenu />

                    {/* Mobile Menu Toggle */}
                    <button
                        aria-label="القائمة"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className={`md:hidden w-10 h-10 rounded-full flex items-center justify-center transition-colors ${hoverBg} ${textMuted}`}
                    >
                        {isMobileMenuOpen ? <Menu size={24} className="rotate-90" /> : <Menu size={24} />}
                    </button>
                </div>
            </div>
        </motion.header>
            {/* مباعد داخل التدفّق يحجز ارتفاع الترويسة الثابتة (fixed). يُركَّب فقط حين تظهر الترويسة؛
                وعلى المسارات التي تُخفى فيها (/, /login, /portal, /platform/*) لا يُركَّب أصلاً — فلا مساحة مهدورة. */}
            <div aria-hidden className="h-24" />
        </>
    );
};
