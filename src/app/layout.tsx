import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MirAIe AC Dashboard',
  description: 'Control your Panasonic air conditioner from anywhere',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#f8fafc" />
      </head>
      <body className="antialiased">
        <div className="min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
