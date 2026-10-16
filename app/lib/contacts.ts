"use client";

// Names people give wallet addresses ("Sita"), kept on this device only and never sent anywhere.
import { useCallback, useSyncExternalStore } from "react";
import type { PublicKey } from "@solana/web3.js";

const STORAGE_KEY = "remitroot-contacts";
const listeners = new Set<() => void>();
let cache: Record<string, string> | null = null;
const EMPTY: Record<string, string> = {};

function read(): Record<string, string> {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") ?? {};
  } catch {
    cache = {};
  }
  return cache!;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setContactName(address: PublicKey | string, name: string) {
  const next = { ...read() };
  const trimmed = name.trim().slice(0, 32);
  if (trimmed) next[address.toString()] = trimmed;
  else delete next[address.toString()];
  cache = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Names then last until the page is reloaded.
  }
  listeners.forEach((listener) => listener());
}

/** The saved name for an address, if any. */
export function useContacts() {
  const contacts = useSyncExternalStore(subscribe, read, () => EMPTY);
  const nameOf = useCallback(
    (address: PublicKey | string | null | undefined) => (address ? contacts[address.toString()] : undefined),
    [contacts],
  );
  return { nameOf, setName: setContactName };
}
