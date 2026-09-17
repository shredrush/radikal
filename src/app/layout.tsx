import type { Metadata } from "next";
import { Inter, Manrope, Source_Serif_4 } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/site-header";
import { SiteHeaderWrapper } from "@/components/site-header-wrapper";
import { SiteFooterWrapper } from "@/components/site-footer-wrapper";
import { SupportWidget } from "@/components/support/support-widget";
import { Toaster } from "@/components/ui/sonner";
import { CurrencyProvider } from "@/components/currency/currency-provider";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { JsonLd } from "@/components/seo/json-ld";
import { absoluteUrl } from "@/lib/seo";

const manropeHeading = Manrope({ subsets: ["latin"], variable: "--font-heading" });
const interSans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const serifBody = Source_Serif_4({ subsets: ["latin"], variable: "--font-serif" });

export const metadata: Metadata = {
  metadataBase: new URL("https://www.radikal.in"),
  title: {
    default: "Radikal | Explore, Learn & Belong Outdoors",
    template: "%s | Radikal",
  },
  description:
    "Radikal connects travellers with verified experts for small-group treks, climbs, cycling, snowboarding, ski experiences — each one crafted and led by the guide themself",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "/",
    siteName: "Radikal",
    title: "Radikal | Explore, Learn & Belong Outdoors",
    description:
      "Radikal connects travellers with verified experts for small-group treks, climbs, cycling, snowboarding, ski experiences — each one crafted and led by the guide themself",
  },
  twitter: {
    card: "summary_large_image",
    title: "Radikal | Explore, Learn & Belong Outdoors",
    description:
      "Radikal connects travellers with verified experts for small-group treks, climbs, cycling, snowboarding, ski experiences — each one crafted and led by the guide themself",
  },
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
        <JsonLd
          data={[
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              "@id": `${absoluteUrl("/")}#organization`,
              name: "Radikal",
              url: absoluteUrl("/"),
              logo: absoluteUrl("/logo.svg"),
            },
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              "@id": `${absoluteUrl("/")}#website`,
              name: "Radikal",
              url: absoluteUrl("/"),
              publisher: { "@id": `${absoluteUrl("/")}#organization` },
              inLanguage: "en-IN",
            },
          ]}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          disableTransitionOnChange
        >
          <CurrencyProvider>
            <SiteHeaderWrapper>
              <SiteHeader />
            </SiteHeaderWrapper>
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
