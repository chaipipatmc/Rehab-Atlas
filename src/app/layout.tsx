import type { Metadata } from "next";
import { Inter, Noto_Serif } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Analytics, CookieConsent } from "@/components/shared/analytics";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const notoSerif = Noto_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: {
    default: "Rehab-Atlas — A Digital Sanctuary for Recovery",
    template: "%s | Rehab-Atlas",
  },
  description:
    "Navigate the complexities of healing with absolute discretion. We curate the world's most distinguished recovery centers, acting as your personal advocate in the journey back to yourself.",
  keywords: [
    "rehab centers",
    "addiction treatment",
    "mental health treatment",
    "rehab directory",
    "treatment matching",
    "recovery centers",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Rehab-Atlas",
    images: [
      {
        url: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200&h=630&fit=crop",
        width: 1200,
        height: 630,
        alt: "Rehab-Atlas — A Digital Sanctuary for Recovery",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${notoSerif.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-surface text-foreground">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <Toaster />
        <Analytics />
        <CookieConsent />
      </body>
    </html>
  );
}
