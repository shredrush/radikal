import type { Metadata } from "next";
import { Inter, Manrope, Source_Serif_4 } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/site-header";
import { SiteFooterWrapper } from "@/components/site-footer-wrapper";
import { SupportWidget } from "@/components/support/support-widget";
import { Toaster } from "@/components/ui/sonner";
import { CurrencyProvider } from "@/components/currency/currency-provider";
import { ThemeProvider } from "@/components/theme/theme-provider";

const manropeHeading = Manrope({ subsets: ["latin"], variable: "--font-heading" });
const interSans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const serifBody = Source_Serif_4({ subsets: ["latin"], variable: "--font-serif" });

export const metadata: Metadata = {
  title: "Radikal",
  description:
    "Radikal is a travel platform that connects outdoor enthusiasts with certified expert guides for small-group, sustainable adventures. Discover unique experiences, learn the skills, share your stories, and explore the world responsibly.",
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
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
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          disableTransitionOnChange
        >
          <CurrencyProvider>
            <SiteHeader />
            <main id="top" className="flex flex-1 flex-col">
              {children}
            </main>
            <SiteFooterWrapper />
            <SupportWidget />
            <Toaster />
          </CurrencyProvider>
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
