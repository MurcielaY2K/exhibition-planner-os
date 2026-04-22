import type { Metadata } from "next";
import "./globals.css";
import { satoshi } from "@/app/fonts";

export const metadata: Metadata = {
  title: "Exhibition Planner OS",
  description:
    "Browser-based exhibition planning software for galleries, museums, and exhibition design teams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${satoshi.variable} h-full antialiased`}>
      <body className="min-h-full bg-[var(--background)] text-[var(--foreground)]">
        {children}
      </body>
    </html>
  );
}
