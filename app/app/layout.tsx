import type { Metadata } from "next";
import { Mukta } from "next/font/google";
import { Banner } from "@/components/Banner";
import { Header } from "@/components/Header";
import { Providers } from "@/components/Providers";
import { t } from "@/lib/i18n";
import "./globals.css";

const mukta = Mukta({
  variable: "--font-mukta",
  subsets: ["latin", "devanagari"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "RemitRoot",
  description: `${t("tagline")} ${t("banner")}`,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${mukta.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <Banner />
        <Providers>
          <div className="mx-auto flex w-full max-w-[480px] flex-col gap-6 px-4 pb-12 pt-4">
            <Header />
            <main className="flex flex-col gap-6">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
