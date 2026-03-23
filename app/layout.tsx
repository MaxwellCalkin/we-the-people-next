import type { Metadata } from "next";
import { Cormorant_Unicase, Inter } from "next/font/google";
import Providers from "@/components/Providers";
import "./globals.css";

const cormorantUnicase = Cormorant_Unicase({
  variable: "--font-brand",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "We The People",
  description:
    "A civic engagement platform connecting citizens with their representatives and legislation.",
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
