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
      <body>
        <AppNav />
        {children}
      </body>
    </html>
  );
}
