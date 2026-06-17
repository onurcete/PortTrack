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
  title: "PortTrack – Yatırım Takip",
  description:
    "BIST, TEFAS, yabancı borsalar, döviz, kıymetli maden ve kripto yatırımlarınızı tek yerden takip edin.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`dark ${inter.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.theme === 'light') {
                  document.documentElement.classList.remove('dark');
                } else {
                  document.documentElement.classList.add('dark');
                }
              } catch (_) {}
            `,
          }}
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
