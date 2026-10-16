import { describe, expect, it } from "vitest";
import en from "@/lib/i18n/en.json";
import ne from "@/lib/i18n/ne.json";
import { translate } from "@/lib/i18n";
import idl from "@/lib/chain/remitroot.json";

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("translations", () => {
  it("English and Nepali have exactly the same keys", () => {
    expect(Object.keys(ne).sort()).toEqual(Object.keys(en).sort());
  });

  it("every Nepali string keeps the same placeholders and is not left in English", () => {
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(placeholders(ne[key]), key).toEqual(placeholders(en[key]));
    }
    const untranslated = (Object.keys(en) as (keyof typeof en)[]).filter(
      (key) => ne[key] === en[key] && /[a-z]{3,}/.test(en[key].replace(/\{\w+\}/g, "")) && !key.startsWith("brand."),
    );
    expect(untranslated).toEqual([]);
  });

  it("has a plain-words message for every program error", () => {
    for (const { name } of idl.errors) expect(Object.keys(en)).toContain(`error.${name}`);
  });

  it("fills placeholders", () => {
    expect(translate("en", "send.button", { amount: "$200.00" })).toBe("Send $200.00");
    expect(translate("ne", "send.button", { amount: "$200.00" })).toBe("$200.00 पठाउनुहोस्");
  });

  it("keeps the prototype banner in both languages", () => {
    expect(en.banner).toBe("Educational prototype · Solana test network · No real money");
    expect(ne.banner.length).toBeGreaterThan(10);
  });
});
