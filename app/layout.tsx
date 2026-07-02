import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "FestVerse — TGPCOP",
    template: "%s | FestVerse TGPCOP",
  },
  description:
    "The Official Event Management Platform for Tulsiramji Gaikwad-Patil College of Pharmacy",
  keywords: ["TGPCOP", "events", "college fest", "pharmacy college"],
  openGraph: {
    title: "FestVerse — TGPCOP",
    description: "The Official Event Management Platform for TGPCOP",
    siteName: "FestVerse",
    locale: "en_IN",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${outfit.variable} antialiased`}>
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
