import Link from "next/link";
import { GraduationCap, ArrowLeft } from "lucide-react";

interface LandingHeaderProps {
    ctaHref: string;
    ctaLabel: string;
}

const NAV_LINKS = [
    { href: "#pulse", label: "نبض المدرسة" },
    { href: "#roles", label: "الأدوار" },
    { href: "#how", label: "من البيانات إلى القرار" },
    { href: "#trust", label: "الأمان" },
];

// ترويسة الهبوط الخاصة بالصفحة العامة (بديلة عن GlobalHeader المخفي على '/').
export function LandingHeader({ ctaHref, ctaLabel }: LandingHeaderProps) {
    return (
        <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
                {/* Brand */}
                <Link href="/" className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                        <GraduationCap className="h-5 w-5" />
                    </span>
                    <span className="leading-none">
                        <span className="block text-sm font-black tracking-tight text-foreground">Sidra OS</span>
                        <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                            School Operating System
                        </span>
                    </span>
                </Link>

                {/* Nav */}
                <nav className="hidden items-center gap-8 md:flex">
                    {NAV_LINKS.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            className="text-sm font-bold text-foreground transition-colors hover:text-primary"
                        >
                            {link.label}
                        </a>
                    ))}
                </nav>

                {/* CTA */}
                <Link
                    href={ctaHref}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                >
                    {ctaLabel}
                    <ArrowLeft className="h-4 w-4" />
                </Link>
            </div>
        </header>
    );
}
