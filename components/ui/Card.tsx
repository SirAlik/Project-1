import React from "react";

interface Props {
    title?: string;
    children: React.ReactNode;
    className?: string;
}

export function Card({ title, children, className = "" }: Props) {
    return (
        <div
            className={`p-6 rounded-2xl transition-all duration-200 ease-out surface-block text-text-primary ${className}`}
        >
            {title && (
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                </CardHeader>
            )}
            {children}
        </div>
    );
}

export function CardHeader({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`mb-4 flex flex-col space-y-1.5 ${className}`}>
            {children}
        </div>
    );
}

export function CardTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <h3 className={`text-lg font-bold text-text-primary leading-none tracking-tight ${className}`}>
            {children}
        </h3>
    );
}

export function CardContent({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={className}>
            {children}
        </div>
    );
}

