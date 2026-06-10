import type { Metadata, Viewport } from "next";
import { AppNav } from "./app-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "HashKey OTC CRM V1",
  description: "Personal OTC sales follow-up CRM, PWA-first.",
  applicationName: "OTC CRM",
  appleWebApp: {
    capable: true,
    title: "OTC CRM",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
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
      <body>
        <AppNav />
        {children}
      </body>
    </html>
  );
}
