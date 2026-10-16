"use client";

// English and Nepali text. Every key exists in both files (a unit test checks this), and the
// visitor's choice is remembered on this device.
import { useCallback, useEffect, useSyncExternalStore } from "react";
import en from "./en.json";
import ne from "./ne.json";

export type Locale = "en" | "ne";
export type TextKey = keyof typeof en;
export type TextValues = Record<string, string | number>;

const nepali: Record<TextKey, string> = ne;
export const messages: Record<Locale, Record<TextKey, string>> = { en, ne: nepali };
export const LOCALES: Locale[] = ["en", "ne"];

export const isTextKey = (key: string): key is TextKey => key in en;

/** Looks up text and fills `{name}` placeholders. */
export function translate(locale: Locale, key: TextKey, values: TextValues = {}): string {
  return messages[locale][key].replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ""));
}

const STORAGE_KEY = "remitroot-locale";
const listeners = new Set<() => void>();
let current: Locale | null = null;

function read(): Locale {
  if (current) return current;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    current = stored === "ne" ? "ne" : "en";
  } catch {
    current = "en";
  }
  return current;
}

function write(locale: Locale) {
  current = locale;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Without storage the choice lasts until the page is reloaded.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useI18n() {
  // The server always renders English; the stored choice applies once the page is running.
  const locale = useSyncExternalStore(subscribe, read, () => "en" as Locale);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const t = useCallback((key: TextKey, values?: TextValues) => translate(locale, key, values), [locale]);
  return { locale, setLocale: write, t };
}
