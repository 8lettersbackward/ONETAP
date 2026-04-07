
import type {Metadata} from 'next';
import './globals.css';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { Navbar } from '@/components/navbar';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: '1tap | Emergency Buddy',
  description: 'Instant emergency help and personal safety orchestration',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="overflow-x-hidden">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      </head>
      <body className="font-body antialiased selection:bg-accent selection:text-accent-foreground overflow-x-hidden min-h-screen bg-background" suppressHydrationWarning>
        <FirebaseClientProvider>
          <Navbar />
          <main className="pt-16 min-h-screen w-full overflow-x-hidden">
            {children}
          </main>
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
