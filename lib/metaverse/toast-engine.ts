import { toast } from 'sonner';

type ToastType = 'success' | 'error' | 'info' | 'warning';

export const createToast = (title: string, description?: string, type: ToastType = 'info') => {
    const styles = {
        success: { color: 'var(--primary)', borderColor: 'var(--primary)' },
        error: { color: 'var(--danger)', borderColor: 'var(--danger)' },
        warning: { color: '#F59E0B', borderColor: '#F59E0B' },
        info: { color: 'var(--accent)', borderColor: 'var(--accent)' }
    };

    const options = {
        style: {
            background: 'rgba(22, 28, 36, 0.9)',
            backdropFilter: 'blur(10px)',
            border: `1px solid ${styles[type].borderColor}`,
            color: '#fff',
        },
        descriptionStyle: { color: '#94A3B8' }
    };

    if (type === 'success') return toast.success(title, { ...options, description });
    if (type === 'error') return toast.error(title, { ...options, description });
    if (type === 'warning') return toast.warning(title, { ...options, description });
    return toast.message(title, { ...options, description });
};
