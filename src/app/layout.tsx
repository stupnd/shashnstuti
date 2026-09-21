import type { Metadata, Viewport } from "next";
import { Caveat, DM_Sans, Homemade_Apple } from "next/font/google";
import { RoughFilter } from "@/components/icons";
import { ServiceWorkerRegister } from "@/components/sw-register";
import "./globals.css";

const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"], display: "swap" });
const caveat = Caveat({ variable: "--font-caveat", subsets: ["latin"], display: "swap" });
const script = Homemade_Apple({ variable: "--font-homemade-apple", subsets: ["latin"], weight: "400", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Our Scrapbook", template: "%s · Our Scrapbook" },
  description: "Our little scrapbook.",
  applicationName: "Our Scrapbook",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Scrapbook" },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }, { url: "/icons/icon-192.png", sizes: "192x192" }],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#faf8f4",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${dmSans.variable} ${caveat.variable} ${script.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">
        <RoughFilter />
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
