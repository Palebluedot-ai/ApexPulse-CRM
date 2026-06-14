import type { Metadata, Viewport } from "next";
import { AppNav } from "./app-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "HashKey OTC",
  description: "Personal OTC sales follow-up CRM, PWA-first.",
  applicationName: "HashKey OTC",
  appleWebApp: {
    capable: true,
    title: "HashKey OTC",
  },
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#faf4e8",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-HK">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,720&family=Noto+Sans+SC:wght@400;500;700&family=Noto+Serif+SC:wght@600;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="pb-24 lg:pb-0">
        <AppNav />
        {children}
      </body>
    </html>
  );
}
