"use client";

import React from "react";

export function SkeletonKPI() {
    return (
        <div className="glass-panel p-8 rounded-[2.5rem] border animate-pulse flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 mb-6" />
            <div className="w-24 h-3 bg-white/5 rounded-full mb-4" />
            <div className="w-32 h-10 bg-white/5 rounded-2xl" />
        </div>
    );
}

export function SkeletonFeedItem() {
    return (
        <div className="flex items-center justify-between p-6 rounded-3xl border border-white/5 animate-pulse">
            <div className="flex items-center gap-6">
                <div className="w-12 h-12 rounded-2xl bg-white/5" />
                <div className="space-y-3">
                    <div className="w-48 h-4 bg-white/5 rounded-full" />
                    <div className="w-24 h-2 bg-white/5 rounded-full" />
                </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-white/5" />
        </div>
    );
}
