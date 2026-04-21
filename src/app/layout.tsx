import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/nav";

export const metadata: Metadata = {
  title: "Maître d'",
  description: "Automated Resy reservation booking — never miss a table again",
  icons: { icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🍽️</text></svg>" },
  openGraph: {
    title: "Maître d'",
    description: "Automated Resy reservation booking — never miss a table again",
    siteName: "Maître d'",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Maître d'",
    description: "Automated Resy reservation booking — never miss a table again",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="text-zinc-100 min-h-screen antialiased">
        <Nav />
        <main className="max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-8">{children}</main>
      </body>
    </html>
  );
}
