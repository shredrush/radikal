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
import { DEFAULT_CURRENCY, currencyForCountry } from "@/lib/currency";
import { getClientCountry } from "@/lib/geo";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Default the currency selector to the visitor's country (Vercel geo header).
  // `getClientCountry` only trusts the header on Vercel and validates its shape.
  // Gracefully falls back to INR locally or when the header is absent.
  let initialCurrency = DEFAULT_CURRENCY;
  try {
    initialCurrency =
      currencyForCountry(await getClientCountry()) ?? DEFAULT_CURRENCY;
  } catch {
    // headers() unavailable outside a request scope — keep INR.
  }

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
        <CurrencyProvider initialCurrency={initialCurrency}>
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
      </body>
    </html>
  );
}
