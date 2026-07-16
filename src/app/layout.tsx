import type { Metadata, Viewport } from "next";
import { Lato } from "next/font/google";
import "./globals.css";

const sans = Lato({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
});

export const metadata: Metadata = {
  title: "Warm Home Grant Check",
  description:
    "30-second check: see if your NZ home may qualify for a Warmer Kiwi Homes insulation grant — and how much government funding you could get.",
  openGraph: {
    title: "Check your Warmer Kiwi Homes grant",
    description: "Find out in under a minute if your home may qualify — and by how much.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#03005c",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-NZ" className={`${sans.variable} h-full`}>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
