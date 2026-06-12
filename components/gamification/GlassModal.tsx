'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft } from 'lucide-react';

interface GlassModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    onBack?: () => void;
}

export const GlassModal = ({ isOpen, onClose, title, children, onBack }: GlassModalProps) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative w-full max-w-lg glass-panel rounded-3xl overflow-hidden shadow-2xl border-primary/20"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/5">
                            <div className="flex items-center"> {/* Grouping for back button and title */}
                                {onBack && ( // Conditionally render back button
                                    <button
                                        onClick={onBack}
                                        className="p-2 hover:bg-white/5 rounded-full transition-colors mr-2 text-muted hover:text-text"
                                        aria-label="Go back"
                                    >
                                        <ChevronLeft size={20} /> {/* Changed to ChevronLeft for back */}
                                    </button>
                                )}
                                {title && (
                                    <h3 className="text-xl font-bold font-heading gradient-text">
                                        {title}
                                    </h3>
                                )}
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/5 rounded-full transition-colors text-muted hover:text-text"
                                aria-label="Close modal" // Added aria-label
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6">
                            {children}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
