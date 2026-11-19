import { Inter, Shippori_Mincho_B1 } from "next/font/google";
import "./globals.css";
import Dock from "@/components/Dock";
import LoadingBar from "@/components/LoadingBar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const shippori = Shippori_Mincho_B1({ subsets: ["latin"], weight: ["600", "800"], variable: "--font-shippori", display: "swap" });

export const metadata = {
  title: "Akari — Read Manga Beautifully",
  description: "Akari is a clean, minimalist manga reader. Trending series, top-rated picks, instant search and a distraction-free reader.",
  icons: { icon: "/icon.svg" },
};

export const viewport = {
  themeColor: "#0e0e10",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${shippori.variable}`}>
      <body>
        <LoadingBar />
        {children}
        <Dock />
      </body>
    </html>
  );
}
