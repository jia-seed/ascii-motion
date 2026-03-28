import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ASCII Motion - Convert Images to Animated ASCII Art",
  description: "Transform any image into stunning animated ASCII art. Upload photos and create unique ASCII animations with customizable density, speed, and colors.",
  keywords: "ascii art, image converter, animation, ascii motion, text art, image processing, ascii generator, animated ascii, photo converter",
  authors: [{ name: "ASCII Motion" }],
  robots: "index, follow",
  openGraph: {
    title: "ASCII Motion - Convert Images to Animated ASCII Art",
    description: "Transform any image into stunning animated ASCII art. Upload photos and create unique ASCII animations with customizable density, speed, and colors.",
    type: "website",
    url: "https://ascii-motion.com",
    siteName: "ASCII Motion",
  },
  twitter: {
    card: "summary_large_image",
    title: "ASCII Motion - Convert Images to Animated ASCII Art",
    description: "Transform any image into stunning animated ASCII art. Upload photos and create unique ASCII animations.",
  },
  alternates: {
    canonical: "https://ascii-motion.com",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
