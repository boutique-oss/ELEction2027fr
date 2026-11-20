import localFont from 'next/font/local';
import { Analytics } from '@vercel/analytics/next';
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
  description: "Site engagé, non officiel, en soutien à L'Avenir en commun : sondages, actu de la campagne de Jean-Luc Mélenchon, manifs et fiches sur le programme.",
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
      <body className={inter.className}>
        {children}
        {/* Fréquentation (Vercel Web Analytics) : pages vues, pays, appareil, site d'origine. Sans cookie, sans identité. */}
        <Analytics />
      </body>
    </html>
  );
}
