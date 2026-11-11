import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PRIME by Activist - Elevating Wellness, Inspiring Trust",
  description: "Committed to quality healthcare, trusted partnerships, and a healthier tomorrow.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
