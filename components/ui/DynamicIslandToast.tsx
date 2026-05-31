'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, Coins, X } from 'lucide-react';
import { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'reward';

interface ToastProps {
    id: string;
    message: string;
    type: ToastType;
    onClose: (id: string) => void;
}

export function DynamicIslandToast({ id, message, type, onClose }: ToastProps) {
    const Icons = {
        success: <CheckCircle2 className="text-emerald-500" size={18} />,
        error: <AlertCircle className="text-destructive" size={18} />,
        info: <Info className="text-primary" size={18} />,
        reward: <Coins className="text-warning" size={18} />,
    };

    useEffect(() => {
        const timer = setTimeout(() => onClose(id), 5000);
        return () => clearTimeout(timer);
    }, [id, onClose]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: -20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            whileHover={{ scale: 1.02 }}
            className="pointer-events-auto flex items-center gap-3 bg-popover/90 backdrop-blur-2xl px-6 py-3 rounded-full border border-border shadow-2xl overflow-hidden min-w-[200px] max-w-md mx-auto mb-4"
        >
            <motion.div
                initial={{ rotate: -20 }}
                animate={{ rotate: 0 }}
                className="shrink-0"
            >
                {Icons[type]}
            </motion.div>

            <p className="text-sm font-bold text-popover-foreground truncate flex-1 leading-none">{message}</p>

            <button
                onClick={() => onClose(id)}
                className="p-1 hover:bg-muted rounded-full transition-colors ml-2"
                aria-label="Dismiss notification"
            >
                <X size={14} className="text-muted-foreground" />
            </button>
        </motion.div>
    );
}

// Global Toast Registry
let toastId = 0;
export const createToast = (message: string, type: ToastType) => {
    const event = new CustomEvent('add-toast', {
        detail: { id: `toast-${toastId++}`, message, type }
    });
    window.dispatchEvent(event);
};
