import type { Metadata } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Vivaah AI",
  description: "Your Premium Indian Wedding Planning Assistant",
  openGraph: {
    title: "Vivaah AI",
    description: "Your Premium Indian Wedding Planning Assistant",
    // url, images, etc — add when available
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="rose-gold">
      <body className={`${inter.variable} ${cormorant.variable} antialiased`}>
        {/* Accessibility: skip link */}
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:bg-white focus:py-2 focus:px-3 focus:rounded-md focus:shadow"
        >
          Skip to content
        </a>

        <div className="relative min-h-screen flex flex-col">
          <main id="content" role="main" className="flex-1">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
