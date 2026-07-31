import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppShell } from '@/components/NavBar';

export const metadata: Metadata = {
  title: '学迹 · 上海小学生学习辅助',
  description: '给上海小学生家长 + 孩子用的学习辅助平台',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0ea5e9',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-slate-50 antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
