import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Havenso Cafe — AI Smart Ordering & Cafe Experience",
  description: "Next-generation AI-powered cafe ordering platform with natural conversation, real-time kitchen tracking, and live service support.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${inter.variable} ${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full font-sans antialiased flex flex-col bg-zinc-50 text-zinc-900">
        {children}
      </body>
    </html>
  );
}
