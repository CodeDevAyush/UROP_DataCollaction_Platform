import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI-Tool Influence on Code-Switching — SRM Research Study",
  description:
    "Academic research data-collection platform for the UROP study on AI-tool influence on code-switching patterns among SRM students.",
  // A study recruitment tool and admin login should never show up in search
  // results — the HTTP-level X-Robots-Tag header (next.config.ts) covers
  // every response including API routes; this covers crawlers that only
  // read the HTML.
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
