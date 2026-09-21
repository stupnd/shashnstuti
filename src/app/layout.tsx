import type { Metadata, Viewport } from "next";
import { Caveat, Fredoka, Gochi_Hand } from "next/font/google";
import { RoughFilter } from "@/components/icons";
import { ServiceWorkerRegister } from "@/components/sw-register";
import "./globals.css";

const fredoka = Fredoka({ variable: "--font-fredoka", subsets: ["latin"], display: "swap" });
const caveat = Caveat({ variable: "--font-caveat", subsets: ["latin"], display: "swap" });
const gochi = Gochi_Hand({ variable: "--font-gochi", subsets: ["latin"], weight: "400", display: "swap" });

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
  themeColor: "#fff8ef",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fredoka.variable} ${caveat.variable} ${gochi.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">
        <RoughFilter />
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
