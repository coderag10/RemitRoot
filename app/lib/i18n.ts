import en from "@/i18n/en.json";

export type TextKey = keyof typeof en;

// One locale for now. A Nepali file with the same keys goes next to en.json.
const messages: Record<string, string> = en;

/** Looks up app text and fills `{name}` placeholders. */
export function t(key: TextKey, values: Record<string, string | number> = {}): string {
  return messages[key].replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ""));
}

export const hasText = (key: string): key is TextKey => key in messages;
