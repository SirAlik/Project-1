'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Home, Compass, ShoppingBag, Sofa, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
    { label: 'الرئيسية', icon: Home, href: '/student/metaverse/home' },
    { label: 'المهام', icon: Compass, href: '/student/metaverse/quests' },
    { label: 'المدينة', icon: ShoppingBag, href: '/student/metaverse/city' },
    { label: 'السكن', icon: Sofa, href: '/student/metaverse/dorm' },
    { label: 'الحساب', icon: User, href: '/student/metaverse/profile' },
];

export const BottomNav = () => {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 px-6 pb-8 pt-4 pointer-events-none">
            <div className="max-w-md mx-auto pointer-events-auto">
                <div className="glass-nav rounded-[2.5rem] flex items-center justify-around p-2.5 relative border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                    {NAV_ITEMS.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="relative flex flex-col items-center justify-center flex-1 py-2 group outline-none"
                            >
                                {/* Active Glow Background */}
                                {isActive && (
                                    <motion.div
                                        layoutId="active-nav-glow"
                                        className="absolute inset-0 z-0 bg-primary/15 rounded-[1.5rem] blur-xl"
                                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                    />
                                )}

                                {/* Content */}
                                <div className="relative z-10 flex flex-col items-center gap-1">
                                    <motion.div
                                        animate={isActive ? {
                                            scale: [1, 1.2, 1.1],
                                            rotate: [0, -10, 0]
                                        } : {}}
                                        transition={{ duration: 0.4 }}
                                        className={`${isActive ? 'text-primary' : 'text-muted group-hover:text-text'} transition-colors duration-300`}
                                    >
                                        <Icon
                                            size={24}
                                            className={`icon-morph ${isActive ? 'stroke-[2.5px] drop-shadow-[0_0_8px_var(--primary)]' : 'stroke-[2px]'}`}
                                        />
                                    </motion.div>

                                    <span className={`text-[10px] font-black tracking-tight ${isActive ? 'text-primary' : 'text-muted group-hover:text-text'} transition-colors duration-300`}>
                                        {item.label}
                                    </span>
                                </div>

                                {/* Active Indicator Bar */}
                                {isActive && (
                                    <motion.div
                                        layoutId="active-bar"
                                        className="absolute -bottom-1 w-6 h-1 bg-primary rounded-full shadow-[0_0_15px_var(--primary)]"
                                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                    />
                                )}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
};
