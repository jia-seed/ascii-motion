import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ASCII Motion - Convert Images to Animated ASCII Art Online",
  description: "Free online ASCII art generator. Convert any image into animated ASCII art with customizable density, speed, and colors. Upload PNG, JPG, GIF or WebP files.",
  keywords: "ascii art generator, convert image to ascii, animated ascii art, text art creator, online ascii converter, free ascii generator, image to text converter",
  authors: [{ name: "ASCII Motion" }],
  creator: "ASCII Motion",
  openGraph: {
    title: "ASCII Motion - Convert Images to Animated ASCII Art",
    description: "Transform your images into living ASCII art. Free online tool with real-time preview and customization options.",
    url: "https://www.jorianhoover.com",
    siteName: "ASCII Motion",
    type: "website",
    images: [{
      url: "https://www.jorianhoover.com/ascii-hero.svg",
      width: 996,
      height: 990,
      alt: "ASCII Motion - Animated ASCII Art Generator"
    }]
  },
  twitter: {
    card: "summary_large_image",
    title: "ASCII Motion - Convert Images to Animated ASCII Art",
    description: "Transform your images into living ASCII art. Free online tool with real-time preview.",
    images: ["https://www.jorianhoover.com/ascii-hero.svg"]
  },
  alternates: {
    canonical: "https://www.jorianhoover.com"
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
        <link rel="canonical" href="https://www.jorianhoover.com" />
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@1&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "ASCII Motion",
              "description": "Free online ASCII art generator that converts images into animated ASCII art",
              "url": "https://www.jorianhoover.com",
              "applicationCategory": "MultimediaApplication",
              "operatingSystem": "Any",
              "permissions": "browser",
              "isAccessibleForFree": true,
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "featureList": [
                "Convert images to ASCII art",
                "Animate ASCII characters", 
                "Customize density and speed",
                "Download as SVG",
                "Support for PNG, JPG, GIF, WebP"
              ]
            })
          }}
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
