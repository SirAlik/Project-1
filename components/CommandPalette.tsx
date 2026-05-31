'use client';

import React, { useState, useEffect, useCallback, useRef, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import {
    Command,
    Search,
    X,
    Shield,
    Settings,
    Plus,
    Calendar,
    User,
    Users,
    Heart,
    BookOpen,
    FileText,
    Book,
    GraduationCap,
    Globe,
    CheckCircle,
    ArrowRight,
    Sparkles,
} from 'lucide-react';
import { searchRoutes, RouteMetadata } from '@/lib/routes';

// Icon mapping
const iconMap: Record<string, React.ReactNode> = {
    Shield: <Shield size={18} />,
    Settings: <Settings size={18} />,
    Plus: <Plus size={18} />,
    Calendar: <Calendar size={18} />,
    User: <User size={18} />,
    Users: <Users size={18} />,
    Heart: <Heart size={18} />,
    BookOpen: <BookOpen size={18} />,
    FileText: <FileText size={18} />,
    Book: <Book size={18} />,
    GraduationCap: <GraduationCap size={18} />,
    Globe: <Globe size={18} />,
    CheckCircle: <CheckCircle size={18} />,
    Flask: <Sparkles size={18} />,
};

interface CommandPaletteProps {
    userRole?: string;
}

export function CommandPalette({ userRole = 'system_owner' }: CommandPaletteProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<RouteMetadata[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    // Search effect
    useEffect(() => {
        const searchResults = searchRoutes(query, userRole);
        startTransition(() => {
            setResults(searchResults);
            setSelectedIndex(0);
        });
    }, [query, userRole]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // CMD/CTRL + K to open
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }

            // Escape to close
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
        if (!isOpen) {
            startTransition(() => setQuery(''));
        }
    }, [isOpen]);

    // Handle navigation within results
    const navigateTo = useCallback((path: string) => {
        setIsOpen(false);
        router.push(path);
    }, [router]);

    const handleKeyNavigation = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % results.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
        } else if (e.key === 'Enter' && results[selectedIndex]) {
            e.preventDefault();
            navigateTo(results[selectedIndex].path);
        }
    }, [results, selectedIndex, navigateTo]);

    if (!isOpen) return null;

    const content = (
        <div
            className="fixed inset-0 z-[9999] flex items-start justify-center pt-[20vh]"
            onClick={() => setIsOpen(false)}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

            {/* Modal */}
            <div
                className="relative w-full max-w-2xl mx-4 bg-zinc-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center gap-3 p-4 border-b border-white/5">
                    <Search size={20} className="text-white/40" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKeyNavigation}
                        placeholder="ابحث عن صفحة أو أداة..."
                        className="flex-1 bg-transparent text-white text-lg font-medium placeholder:text-white/30 outline-none"
                        dir="rtl"
                    />
                    <div className="flex items-center gap-2">
                        <kbd className="px-2 py-1 text-[10px] font-bold bg-white/5 text-white/40 rounded">ESC</kbd>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                            aria-label="إغلاق البحث"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Results */}
                <div className="max-h-[400px] overflow-y-auto">
                    {results.length === 0 ? (
                        <div className="p-8 text-center">
                            <Search size={40} className="mx-auto mb-3 text-white/10" />
                            <p className="text-sm font-bold text-white/40">لا توجد نتائج</p>
                            <p className="text-xs text-white/20 mt-1">جرب كلمات بحث مختلفة</p>
                        </div>
                    ) : (
                        <div className="p-2" dir="rtl">
                            {results.map((route, index) => (
                                <button
                                    key={route.path}
                                    onClick={() => navigateTo(route.path)}
                                    className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all ${index === selectedIndex
                                        ? 'bg-primary/10 text-primary'
                                        : 'hover:bg-white/5 text-white'
                                        }`}
                                >
                                    <div className={`p-2 rounded-lg ${index === selectedIndex ? 'bg-primary/20' : 'bg-white/5'
                                        }`}>
                                        {iconMap[route.icon] || <Command size={18} />}
                                    </div>
                                    <div className="flex-1 text-right">
                                        <p className="font-bold text-sm">{route.labelAr}</p>
                                        <p className="text-[10px] opacity-50 font-mono">{route.path}</p>
                                    </div>
                                    <ArrowRight size={16} className={`opacity-0 transition-opacity ${index === selectedIndex ? 'opacity-100' : ''
                                        }`} />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-white/5 flex items-center justify-between text-[10px] text-white/30">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-white/5 rounded">↑</kbd>
                            <kbd className="px-1.5 py-0.5 bg-white/5 rounded">↓</kbd>
                            للتنقل
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-white/5 rounded">Enter</kbd>
                            للفتح
                        </span>
                    </div>
                    <span className="font-bold text-primary/60">CMD+K</span>
                </div>
            </div>
        </div>
    );

    // Use portal to render at document root
    if (typeof document !== 'undefined') {
        return createPortal(content, document.body);
    }

    return null;
}

/**
 * Trigger button for Command Palette (optional - keyboard shortcut always works)
 */
export function CommandPaletteTrigger() {
    const handleClick = () => {
        // Dispatch keyboard event to trigger palette
        const event = new KeyboardEvent('keydown', {
            key: 'k',
            metaKey: true,
            bubbles: true,
        });
        document.dispatchEvent(event);
    };

    return (
        <button
            onClick={handleClick}
            className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-white/60 hover:text-white transition-all"
        >
            <Search size={14} />
            <span className="text-xs font-bold">بحث</span>
            <kbd className="px-1.5 py-0.5 text-[10px] bg-white/10 rounded">⌘K</kbd>
        </button>
    );
}
