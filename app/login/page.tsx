import React from "react";
import { LoginCard } from "@/components/landing/LoginCard";

export default function LoginPage() {
    return (
        <main dir="rtl" className="min-h-screen w-full relative overflow-hidden">
            <div aria-hidden="true" className="absolute inset-0">
                <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(0,0,0,0.06),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(0,0,0,0.04),transparent_50%)]" />
                <div className="absolute inset-0 opacity-[0.04] mix-blend-overlay bg-[repeating-linear-gradient(0deg,rgba(0,0,0,0.10)_0px,rgba(0,0,0,0.10)_1px,transparent_1px,transparent_3px)]" />
            </div>

            <div className="relative z-10 min-h-screen flex items-start justify-center px-6 pt-16 pb-16">
                <div className="relative w-full max-w-md">
                    <div aria-hidden="true" className="absolute -inset-10 rounded-[3rem] blur-3xl opacity-60 bg-primary/10" />
                    <LoginCard />
                </div>
            </div>
        </main>
    );
}
