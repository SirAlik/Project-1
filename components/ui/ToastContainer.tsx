'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { DynamicIslandToast, ToastType } from './DynamicIslandToast';

interface ToastData {
    id: string;
    message: string;
    type: ToastType;
}

export function ToastContainer() {
    const [toasts, setToasts] = useState<ToastData[]>([]);

    useEffect(() => {
        const handleAddToast = (event: CustomEvent<ToastData>) => {
            setToasts(prev => [...prev, event.detail]);
        };

        window.addEventListener('add-toast', handleAddToast as EventListener);
        return () => window.removeEventListener('add-toast', handleAddToast as EventListener);
    }, []);

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    return (
        <div className="fixed top-6 left-0 right-0 z-[9999] pointer-events-none flex flex-col items-center">
            <AnimatePresence mode="popLayout">
                {toasts.map(toast => (
                    <DynamicIslandToast
                        key={toast.id}
                        {...toast}
                        onClose={removeToast}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
}
