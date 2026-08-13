import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CurrencyProvider } from "@/context/currency";
import { AppChrome } from "@/components/AppChrome";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.porttrack.com.tr"),
  title: {
    default: "PortTrack – BİST, TEFAS, Yabancı Borsa ve Kripto Portföy Takip Platformu",
    template: "%s | PortTrack Yatırım Takip",
  },
  description:
    "BİST hisseleri, TEFAS yatırım fonları, Amerikan borsaları (NASDAQ/S&P 500), döviz, altın ve kripto para yatırımlarınızı ₺ TL ve $ USD bazında kuruşu kuruşuna canlı takip edin.",
  keywords: [
    "portföy takip",
    "yatırım takip uygulaması",
    "bist hisse takip",
    "tefas fon takip",
    "yabancı borsa takip",
    "kripto portföy takibi",
    "borsa kâr zarar hesaplama",
    "portföy yönetim uygulaması",
    "yatırım performans analizi",
    "bes takip",
    "döviz altın portföy",
  ],
  authors: [{ name: "PortTrack Finans Teknolojileri" }],
  creator: "PortTrack",
  publisher: "PortTrack",
  category: "finance",
  applicationName: "PortTrack",
  alternates: {
    canonical: "https://www.porttrack.com.tr",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "PortTrack – Gelişmiş Yatırım ve Portföy Takip Platformu",
    description:
      "Tüm finansal yatırımlarınızı (BİST, TEFAS, Yabancı Borsa, Kripto, Döviz) tek ekranda anlık takip edin. Gelişmiş grafikler ve TL/USD çoklu para birimi analizi.",
    url: "https://www.porttrack.com.tr",
    siteName: "PortTrack",
    locale: "tr_TR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PortTrack – Yatırım ve Portföy Takip Platformu",
    description:
      "BİST, TEFAS, Yabancı Borsa ve Kripto yatırımlarınızı tek yerden anlık izleyin.",
    creator: "@porttrack",
  },
};

const jsonLdData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "PortTrack",
  operatingSystem: "Web",
  applicationCategory: "FinanceApplication",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "TRY",
  },
  description:
    "BİST hisse senetleri, TEFAS yatırım fonları, Amerikan borsaları, döviz, altın ve kripto para portföy takip platformu.",
  url: "https://www.porttrack.com.tr",
  author: {
    "@type": "Organization",
    name: "PortTrack",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`dark ${inter.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var themes = ['light', 'dark', 'solarized', 'harbor'];
                var theme = (localStorage.theme === 'dracula' || localStorage.theme === 'nord')
                  ? 'harbor'
                  : (themes.includes(localStorage.theme)
                    ? localStorage.theme
                    : 'dark');
                localStorage.theme = theme;
                document.documentElement.dataset.theme = theme;
                document.documentElement.classList.toggle(
                  'dark',
                  theme === 'dark'
                );
              } catch (_) {}
            `,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdData) }}
        />
      </head>
      <body className="min-h-full">
        <CurrencyProvider>
          <AppChrome>{children}</AppChrome>
        </CurrencyProvider>
      </body>
    </html>
  );
}
