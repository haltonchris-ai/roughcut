import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RoughCUT — Spec the box. Scan the sticker.",
  description:
    "RoughCUT lets electricians spec every box on a job once, then scan the sticker to see it from anywhere — on site, offline, or back at the shop.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@700;800;900&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-bg text-ink font-sans antialiased">{children}</body>
    </html>
  );
}
