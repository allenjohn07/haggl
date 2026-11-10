import type { Metadata, Viewport } from "next";
import "./globals.css";

// Fonts and theme are owned by the `ui` lane (dark, minimal, a handwritten accent font).
export const metadata: Metadata = {
  title: "Haggl",
  description: "Two pixel advisors argue about your purchase, check other prices, and tell you if it's worth it.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f0f12",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
