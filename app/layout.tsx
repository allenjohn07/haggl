import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Kalam } from "next/font/google";
import "./globals.css";

// Inter for chat and buttons, Kalam (handwritten) for the advisors' lines and the verdict, JetBrains Mono for prices.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const kalam = Kalam({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-kalam" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: "Haggl",
  description: "Two pixel advisors argue about your purchase, check other prices, and tell you if it's worth it.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#09090c",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${kalam.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
