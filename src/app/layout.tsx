import './globals.css';
import Script from 'next/script';
import AppShell from '@/components/layout/AppShell';

export const metadata = { title: 'MarketPilot – Digital Marketing Executive Agent', description: 'Plan, approve, track and report marketing campaigns.' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Script id="theme-init" strategy="beforeInteractive">
          {"try{if(localStorage.getItem('theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}"}
        </Script>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
