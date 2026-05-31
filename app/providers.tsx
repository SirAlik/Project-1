"use client";

import { AuthProvider } from "./_context/AuthContext";

export function Providers({ children }: { children: React.ReactNode }) {
    return <AuthProvider>{children}</AuthProvider>;
}
