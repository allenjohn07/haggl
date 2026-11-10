import type { Metadata, Viewport } from "next";
import { Geist_Mono, Nunito } from "next/font/google";
import "./globals.css";

// Rounded UI font plus a mono for prices (see styles/tokens.css).
const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["500", "700", "800", "900"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Haggle",
  description: "Watch two pixel-art AI agents haggle, then pay with PayPal.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f6efe2",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${nunito.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
