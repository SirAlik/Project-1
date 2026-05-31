import localFont from 'next/font/local';
import { Inter, Tajawal } from 'next/font/google';

export const inter = Inter({
    variable: "--font-inter",
    subsets: ["latin"],
    display: 'swap',
});

export const tajawal = Tajawal({
    variable: "--font-tajawal",
    subsets: ["arabic"],
    weight: ["400", "500", "700", "800"],
    display: 'swap',
});

export const saudiFont = localFont({
    src: [
        {
            path: '../public/fonts/saudi/Saudi-Regular.woff2',
            weight: '400',
            style: 'normal',
        },
        {
            path: '../public/fonts/saudi/Saudi-Bold.woff2',
            weight: '700',
            style: 'normal',
        },
    ],
    variable: '--font-brand-saudi',
    display: 'swap',
});
