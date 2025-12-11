import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HZ Navigator | HUBZone Certification Platform',
  description: 'Comprehensive HUBZone certification verification and compliance management for federal contractors.',
  keywords: ['HUBZone', 'SBA', 'federal contracting', 'certification', 'compliance'],
  authors: [{ name: 'Visionblox LLC' }],
  openGraph: {
    title: 'HZ Navigator',
    description: 'HUBZone certification platform for federal contractors',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link
          href="https://api.mapbox.com/mapbox-gl-js/v3.8.0/mapbox-gl.css"
          rel="stylesheet"
        />
      </head>
      <body className="h-full">
        {children}
      </body>
    </html>
  );
}
