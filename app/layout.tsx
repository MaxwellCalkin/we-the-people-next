import type { Metadata, Viewport } from "next";
import { Cormorant_Unicase, Inter } from "next/font/google";
import Providers from "@/components/Providers";
import "./globals.css";

const cormorantUnicase = Cormorant_Unicase({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Makes the share-card URLs (app/opengraph-image.tsx) absolute, which
  // LinkedIn, X, and Slack require.
  metadataBase: new URL("https://heard-us.vercel.app"),
  title: {
    default: "Heard — See if you're being represented",
    template: "%s · Heard",
  },
  description:
    "Vote on the bills before Congress, compare your votes with your representatives, and prepare for your next election.",
  // og:title and og:description fall back to each page's title and description.
  openGraph: {
    type: "website",
    siteName: "Heard",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a1628",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cormorantUnicase.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
