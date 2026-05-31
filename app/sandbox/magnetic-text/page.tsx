"use client";

import React from "react";
import { AntigravityMagneticText } from "@/components/ui/AntigravityMagneticText";
import { Card } from "@/components/ui/Card";

export default function MagneticTextSandbox() {
    return (
        <main className="min-h-screen bg-background text-foreground p-12 space-y-12 flex flex-col items-center justify-center">

            <div className="text-center space-y-4">
                <h1 className="text-4xl font-black tracking-tight mb-8">
                    <AntigravityMagneticText strength={0.8} radius={200} className="text-primary hover:text-accent transition-colors">
                        Antigravity Magnetic Text
                    </AntigravityMagneticText>
                </h1>
                <p className="text-muted-foreground max-w-lg mx-auto">
                    Move your mouse near the text elements below to see the magnetic effect.
                    This uses GSAP for performant, GPU-accelerated motion.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl">
                {/* Standard Strength */}
                <Card className="p-8 flex flex-col items-center justify-center h-48 bg-card border-border">
                    <AntigravityMagneticText strength={0.5} radius={100}>
                        <span className="text-2xl font-bold">Standard (0.5)</span>
                    </AntigravityMagneticText>
                    <p className="text-xs text-muted-foreground mt-4">Pull: 0.5 | Radius: 100px</p>
                </Card>

                {/* High Strength */}
                <Card className="p-8 flex flex-col items-center justify-center h-48 bg-card border-border">
                    <AntigravityMagneticText strength={1.2} radius={150} className="text-accent">
                        <span className="text-2xl font-bold">Strong (1.2)</span>
                    </AntigravityMagneticText>
                    <p className="text-xs text-muted-foreground mt-4">Pull: 1.2 | Radius: 150px</p>
                </Card>

                {/* Large Radius */}
                <Card className="p-8 flex flex-col items-center justify-center h-48 bg-card border-border">
                    <AntigravityMagneticText strength={0.3} radius={300} className="text-secondary-foreground">
                        <span className="text-2xl font-bold">Far Reach (300px)</span>
                    </AntigravityMagneticText>
                    <p className="text-xs text-muted-foreground mt-4">Pull: 0.3 | Radius: 300px</p>
                </Card>
            </div>

            <div className="flex gap-8 mt-12">
                <AntigravityMagneticText strength={0.4} radius={60} className="text-sm font-medium text-muted-foreground">
                    Link One
                </AntigravityMagneticText>
                <AntigravityMagneticText strength={0.4} radius={60} className="text-sm font-medium text-muted-foreground">
                    Link Two
                </AntigravityMagneticText>
                <AntigravityMagneticText strength={0.4} radius={60} className="text-sm font-medium text-muted-foreground">
                    Link Three
                </AntigravityMagneticText>
            </div>
        </main>
    );
}
