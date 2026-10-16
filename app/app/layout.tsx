import type { Metadata, Viewport } from "next";
import { Mukta } from "next/font/google";
import { Banner } from "@/components/Banner";
import { BottomNav, Footer, Header } from "@/components/Navigation";
import { Providers } from "@/components/Providers";
import { Toasts } from "@/components/Toasts";
import en from "@/lib/i18n/en.json";
import "./globals.css";

const mukta = Mukta({
  variable: "--font-mukta",
  subsets: ["latin", "devanagari"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: { default: "RemitRoot", template: "%s · RemitRoot" },
  description: en["meta.description"],
};

export const viewport: Viewport = { themeColor: "#1F5C4A", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${mukta.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <Providers>
          <Banner />
          <Header />
          <main className="mx-auto flex w-full max-w-[480px] flex-col gap-5 px-4 pt-5">{children}</main>
          <Footer />
          <BottomNav />
          <Toasts />
        </Providers>
      </body>
    </html>
  );
}
