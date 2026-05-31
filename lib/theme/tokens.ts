export const THEME_TOKENS = {
    colors: {
        bg: '#0B0F14',
        primary: '#3EC7D3',
        accent: '#B58AF6',
        text: '#F8FAFC',
        muted: '#94A3B8',
        surface: 'rgba(22, 28, 36, 0.70)',
        border: 'rgba(255, 255, 255, 0.08)',
    },
    gradients: {
        primary: 'linear-gradient(135deg, #3EC7D3 0%, #B58AF6 100%)',
        shimmer: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
    },
    glows: {
        primary: '0 0 15px rgba(62, 199, 211, 0.30)',
        accent: '0 0 15px rgba(181, 138, 246, 0.30)',
    },
    transitions: {
        default: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
        spring: { type: 'spring', damping: 20, stiffness: 300 },
    }
} as const;

export type ThemeTokens = typeof THEME_TOKENS;
