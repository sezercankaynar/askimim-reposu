import type { Metadata, Viewport } from "next";
import { Fraunces, Caveat, Nunito } from "next/font/google";
import PwaRegister from "@/components/PwaRegister";
import "@/styles/globals.css";

const fraunces = Fraunces({
  subsets: ["latin", "latin-ext"],
  variable: "--font-fraunces",
  display: "swap",
});
const caveat = Caveat({
  subsets: ["latin", "latin-ext"],
  variable: "--font-caveat",
  display: "swap",
});
const nunito = Nunito({
  subsets: ["latin", "latin-ext"],
  variable: "--font-nunito",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tarif Defterim",
  description: "Linki yapıştır, tarif deftere otomatik eklensin.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Tarif Defterim", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#7a3b2e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${fraunces.variable} ${caveat.variable} ${nunito.variable}`}>
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
