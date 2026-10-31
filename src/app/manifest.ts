import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'SP Corner | AIU Hostel Recycling Tracker',
        short_name: 'SP Corner',
        description:
            'Sustainability Pioneers (3 Zero Club) Hostel Recycling Buy-Back & QR Tracker at Albukhary International University.',
        start_url: '/',
        display: 'standalone',
        background_color: '#f8fafc',
        theme_color: '#047857',
        orientation: 'portrait-primary',
        icons: [
            {
                src: '/icon.svg',
                sizes: 'any',
                type: 'image/svg+xml',
                purpose: 'any',
            },
            {
                src: '/icon.svg',
                sizes: '512x512',
                type: 'image/svg+xml',
                purpose: 'maskable',
            },
        ],
    };
}