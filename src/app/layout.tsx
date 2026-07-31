import type { Metadata } from "next";
import { Inter, Manrope, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";

const manropeHeading = Manrope({ subsets: ["latin"], variable: "--font-heading" });
const interSans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const serifBody = Source_Serif_4({ subsets: ["latin"], variable: "--font-serif" });

export const metadata: Metadata = {
  title: "Radikal — Adventure sports in the Indian Himalayas",
  description:
    "Small-group ski, snowboard, bike and trek tours across Manali, Ladakh, Kashmir and Lahaul-Spiti, led by certified local guides.",
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
        <main className="flex flex-1 flex-col">{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
