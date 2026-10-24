import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CyberCalc — Decode it. Transform it. Understand it.',
  description: 'Interactive cybersecurity calculator and byte-analysis workbench for reverse engineers, digital forensics analysts, and CTF competitors.',
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
    <html lang="en" className="dark">
      <body className="bg-[#06090e] text-[#e6edf3] antialiased selection:bg-cyan-500 selection:text-black">
        {children}
      </body>
    </html>
  );
}
