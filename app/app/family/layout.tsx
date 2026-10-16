import type { Metadata } from "next";
import en from "@/lib/i18n/en.json";

export const metadata: Metadata = { title: en["family.title"] };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
