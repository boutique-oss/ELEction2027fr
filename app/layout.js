import localFont from 'next/font/local';
import './globals.css';

const inter = localFont({
  src: [
    { path: '../assets/fonts/Inter-Regular.ttf', weight: '400' },
    { path: '../assets/fonts/Inter-Medium.ttf', weight: '500' },
    { path: '../assets/fonts/Inter-SemiBold.ttf', weight: '600' },
    { path: '../assets/fonts/Inter-Bold.ttf', weight: '700' },
  ],
  display: 'swap',
});

export const metadata = {
  title: 'Présidentielle 2027',
  description: 'Sondages (moyenne pondérée), actu filtrée, manifs à Poitiers et repères pour comprendre la présidentielle 2027.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Présidentielle 27', statusBarStyle: 'black-translucent' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#141416' },
    { media: '(prefers-color-scheme: light)', color: '#f2f2f5' },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
