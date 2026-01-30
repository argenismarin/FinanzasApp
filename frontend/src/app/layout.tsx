import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    metadataBase: new URL('https://finanzas-app-wine.vercel.app'),
    title: 'FinanzasApp - Gestión de Finanzas Personales',
    description: 'Aplicación web para gestionar tus finanzas personales con OCR, analítica y sincronización con SharePoint',
    manifest: '/manifest.json',
    icons: {
        icon: [
            { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        ],
        apple: [
            { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        ],
    },
    openGraph: {
        title: 'FinanzasApp - Gestión de Finanzas Personales',
        description: 'Gestión inteligente de tus finanzas personales con OCR de facturas, analítica avanzada y sincronización en la nube',
        url: 'https://finanzas-app-wine.vercel.app',
        siteName: 'FinanzasApp',
        locale: 'es_CO',
        type: 'website',
        images: [
            {
                url: '/icon-192.png',
                width: 192,
                height: 192,
                alt: 'FinanzasApp Logo',
            },
        ],
    },
    twitter: {
        card: 'summary',
        title: 'FinanzasApp - Gestión de Finanzas Personales',
        description: 'Gestión inteligente de tus finanzas personales',
        images: ['/icon-192.png'],
    },
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'FinanzasApp',
    },
    formatDetection: {
        telephone: false,
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="es">
            <body className={inter.className}>
                <Providers>
                    {children}
                </Providers>
            </body>
        </html>
    );
}
