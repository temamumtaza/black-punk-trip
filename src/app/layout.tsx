import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://black-punk-trip.vercel.app"),
  title: {
    default: "Black Punk Trip",
    template: "%s · Black Punk Trip",
  },
  description: "Catat talangan, bagi pengeluaran, dan bereskan settlement trip bersama.",
  applicationName: "Black Punk Trip",
  authors: [{ name: "temamumtaza", url: "https://github.com/temamumtaza" }],
  creator: "temamumtaza",
  publisher: "Black Punk Trip",
  category: "Finance",
  keywords: ["trip", "patungan", "talangan", "pembagian pengeluaran", "settlement", "PWA"],
  alternates: { canonical: "/" },
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "/",
    siteName: "Black Punk Trip",
    title: "Black Punk Trip",
    description: "Catat talangan, bagi pengeluaran, dan bereskan settlement trip bersama.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Black Punk Trip",
    description: "Catat talangan, bagi pengeluaran, dan bereskan settlement trip bersama.",
  },
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
  appleWebApp: { capable: true, title: "Black Punk Trip", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#f7f4ed",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="id"><body>{children}<PwaRegister /></body></html>;
}
