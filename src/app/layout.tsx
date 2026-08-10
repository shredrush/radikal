import type { Metadata } from "next";
import { Inter, Manrope, Source_Serif_4 } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/site-header";
import { SiteFooterWrapper } from "@/components/site-footer-wrapper";
import { Toaster } from "@/components/ui/sonner";

const manropeHeading = Manrope({ subsets: ["latin"], variable: "--font-heading" });
const interSans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const serifBody = Source_Serif_4({ subsets: ["latin"], variable: "--font-serif" });

export const metadata: Metadata = {
  title: "Radikal",
  description:
    "Small-group skiing, snowboarding, cycling and trekking trips across Manali, Ladakh, Kashmir and Lahaul-Spiti, led by certified local guides.",
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        interSans.variable,
        manropeHeading.variable,
        serifBody.variable,
        "font-sans"
      )}
    >
      <body className="min-h-full flex flex-col">
        <SiteHeader />
        <main id="top" className="flex flex-1 flex-col">
          {children}
        </main>
        <SiteFooterWrapper />
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
