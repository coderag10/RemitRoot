import type { Metadata } from "next";
import en from "@/lib/i18n/en.json";

export const metadata: Metadata = { title: en["nav.send"] };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
