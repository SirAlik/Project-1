import Link from "next/link";
import { GraduationCap } from "lucide-react";

const FOOTER_LINKS = [
    { label: "الخصوصية", href: "#" },
    { label: "الشروط", href: "#" },
    { label: "الدعم", href: "#" },
];

export function LandingFooter() {
    return (
        <footer className="border-t border-border bg-surface-soft">
            <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 md:flex-row">
                <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <GraduationCap className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-bold text-foreground">
                        سِدرة — <span className="text-muted-foreground font-medium">نظام تشغيل المدرسة</span>
                    </span>
                </div>

                <nav className="flex items-center gap-6">
                    {FOOTER_LINKS.map((link) => (
                        <Link
                            key={link.label}
                            href={link.href}
                            className="text-sm font-bold text-foreground transition-colors hover:text-primary"
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>

                <p className="text-xs font-medium text-muted-foreground">© 2026 سِدرة · جميع الحقوق محفوظة</p>
            </div>
        </footer>
    );
}
