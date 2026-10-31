import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
});

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
});

export const metadata: Metadata = {
    title: 'SP Corner | AIU Hostel Recycling Buy-Back Tracker',
    description:
        'Sustainability Pioneers (3 Zero Club) physical-digital hostel recycling buy-back pilot at Albukhary International University (AIU).',
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="en"
            className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
        >
        <body className="min-h-full bg-slate-50 text-slate-900 selection:bg-emerald-600/20 selection:text-emerald-900">
        {children}
        </body>
        </html>
    );
}