'use client';

import React from 'react';
import { motion } from 'framer-motion';

export interface FurnitureItem {
    id: string;
    type: string;
    x: number; // grid x (0-7)
    y: number; // grid y (0-7)
    icon: React.ComponentType<{ size?: number }>;
}

export const DormRoom = ({ furniture }: { furniture: FurnitureItem[] }) => {
    // 8x8 Grid
    const gridSize = 8;
    const tiles = Array.from({ length: gridSize * gridSize });

    return (
        <div className="relative w-full aspect-square max-w-[400px] mx-auto perspective-1000 flex items-center justify-center">
            {/* Isometric Container */}
            <motion.div
                className="w-[280px] h-[280px] relative transition-all duration-700"
                style={{
                    transform: 'rotateX(60deg) rotateZ(45deg)',
                    transformStyle: 'preserve-3d'
                }}
            >
                {/* Floor Grid */}
                <div className="absolute inset-0 grid grid-cols-8 grid-rows-8 bg-surface-2 border-2 border-primary/20 shadow-[20px_20px_60px_rgba(0,0,0,0.5)]">
                    {tiles.map((_, i) => (
                        <div
                            key={i}
                            className="border-[0.5px] border-primary/5 hover:bg-primary/10 transition-colors"
                        />
                    ))}
                </div>

                {/* Walls (Left & Right) */}
                <div
                    className="absolute origin-bottom-left bg-gradient-to-t from-surface to-surface-2 border-primary/10"
                    style={{
                        width: '100%',
                        height: '100px',
                        transform: 'rotateX(-90deg) translateZ(0px)',
                        bottom: '100%'
                    }}
                />
                <div
                    className="absolute origin-bottom-left bg-gradient-to-t from-surface-2 to-surface border-primary/10"
                    style={{
                        width: '100px',
                        height: '100%',
                        transform: 'rotateY(90deg) translateZ(0px)',
                        right: '100%'
                    }}
                />

                {/* Furniture Items */}
                {furniture.map((item) => {
                    const Icon = item.icon;
                    return (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, z: 50 }}
                            animate={{ opacity: 1, z: 0 }}
                            className="absolute w-[12.5%] h-[12.5%] flex items-center justify-center z-10"
                            style={{
                                left: `${item.x * 12.5}%`,
                                top: `${item.y * 12.5}%`,
                                transform: 'translateZ(10px) rotateZ(-45deg) rotateX(-60deg)'
                            }}
                        >
                            <div className="relative group">
                                <div className="absolute inset-0 blur-xl bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="p-1 bg-surface-solid border border-white/10 rounded-lg text-primary shadow-xl">
                                    <Icon size={20} />
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </motion.div>
        </div>
    );
};
