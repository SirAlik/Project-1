import type { ReactNode } from "react";

export default function MetaverseLayout({ children }: { children: ReactNode }) {
    return (
        <main className="min-h-screen bg-stone-50 px-6 py-10 text-foreground" dir="rtl">
            <div className="mx-auto max-w-2xl">{children}</div>
        </main>
    );
}
