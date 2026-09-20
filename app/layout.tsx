import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#111112' };

export const metadata: Metadata = {
  title: "TAB — Elsewhere",
  description: "Order a round. Put your phone down. TAB brings the bar to you.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
