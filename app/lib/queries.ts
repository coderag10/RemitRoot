"use client";

// Chain reads as cached queries. Every page shares these, and they refresh after each
// transaction and in the background, retrying when the public RPC limits requests.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SYSVAR_CLOCK_PUBKEY, type PublicKey } from "@solana/web3.js";
import { useCallback, useSyncExternalStore } from "react";
import { fetchActivity } from "./chain/history";
import {
  connection,
  fetchAllSeries,
  fetchConfig,
  fetchPositionsIn,
  fetchPositionsOf,
  fetchProceeds,
  fetchRule,
  fetchRulesForFamily,
  fetchSeries,
  fetchSolBalance,
  fetchTokenBalance,
  usdAccount,
} from "./chain/program";
import { unpaidInterest } from "./chain/math";

export const queryKeys = {
  config: ["config"] as const,
  series: ["series"] as const,
  worker: (address: string) => ["worker", address] as const,
  family: (address: string) => ["family", address] as const,
  bond: (id: number) => ["bond", id] as const,
  activity: (address: string) => ["activity", address] as const,
};

export function useConfig() {
  return useQuery({ queryKey: queryKeys.config, queryFn: fetchConfig, staleTime: 60_000 });
}

export function useAllSeries() {
  return useQuery({ queryKey: queryKeys.series, queryFn: fetchAllSeries, staleTime: 30_000 });
}

/** Everything the send page shows for one worker. */
export function useWorker(worker: PublicKey | null) {
  const { data: config } = useConfig();
  return useQuery({
    queryKey: queryKeys.worker(worker?.toBase58() ?? ""),
    enabled: worker !== null && config != null,
    queryFn: async () => {
      const [rule, positions, balance, lamports] = await Promise.all([
        fetchRule(worker!),
        fetchPositionsOf(worker!),
        fetchTokenBalance(usdAccount(config!, worker!)),
        fetchSolBalance(worker!),
      ]);
      return { rule, positions, balance, lamports };
    },
  });
}

/** What a family wallet received and the savings of everyone who sends to it. */
export function useFamily(family: PublicKey | null) {
  const { data: config } = useConfig();
  return useQuery({
    queryKey: queryKeys.family(family?.toBase58() ?? ""),
    enabled: family !== null && config != null,
    queryFn: async () => {
      const [balance, rules] = await Promise.all([
        fetchTokenBalance(usdAccount(config!, family!)),
        fetchRulesForFamily(family!),
      ]);
      const positions = (await Promise.all(rules.map((rule) => fetchPositionsOf(rule.worker)))).flat();
      return { balance, rules, positions };
    },
  });
}

/** The public bond page: series, vault balance, uses of funds and what is owed to savers. */
export function useBond(id: number | null) {
  return useQuery({
    queryKey: queryKeys.bond(id ?? -1),
    enabled: id !== null,
    queryFn: async () => {
      const series = await fetchSeries(id!);
      if (!series) return null;
      const [vault, proceeds, positions] = await Promise.all([
        fetchTokenBalance(series.vault),
        fetchProceeds(series.address),
        fetchPositionsIn(series.address),
      ]);
      return { series, vault, proceeds, positions };
    },
  });
}

/** Savings not yet redeemed plus interest earned so far, for a set of positions in one series. */
export function owedNow(
  positions: { principal: bigint; accruedInterest: bigint; lastAccrualTs: number }[],
  series: { couponBps: number; maturityTs: number },
  now: number,
) {
  return positions.reduce(
    (sum, position) => sum + position.principal + unpaidInterest(position, series.couponBps, series.maturityTs, now),
    BigInt(0),
  );
}

export function useActivity(address: PublicKey | null, limit = 20) {
  return useQuery({
    queryKey: [...queryKeys.activity(address?.toBase58() ?? ""), limit],
    enabled: address !== null,
    queryFn: () => fetchActivity(address!, limit),
    staleTime: 15_000,
  });
}

/** Refreshes every chain read, after a transaction. */
export function useRefreshChain() {
  const client = useQueryClient();
  return useCallback(() => client.invalidateQueries(), [client]);
}

// One shared clock for every component that shows live interest or maturity. It runs at the
// chain's time, not the device's: on devnet the chain clock can trail wall time by a minute or
// more, and the program decides maturity by the chain clock. It only runs in the browser; during
// prerendering the time is 0 and nothing time-dependent has loaded yet.
const clockListeners = new Set<() => void>();
let clockNow = 0;
/** Chain time minus device time, in seconds, from the last read of the Clock sysvar. */
let chainOffset = 0;
let clockTimer: ReturnType<typeof setInterval> | null = null;
let offsetTimer: ReturnType<typeof setInterval> | null = null;

const deviceNow = () => Math.floor(Date.now() / 1000);

async function syncChainClock() {
  try {
    const clock = await connection.getAccountInfo(SYSVAR_CLOCK_PUBKEY);
    // Clock sysvar layout: slot, epoch_start_timestamp, epoch, leader_schedule_epoch, unix_timestamp.
    if (clock) chainOffset = Number(clock.data.readBigInt64LE(32)) - deviceNow();
  } catch {
    // Keep the last known offset; the device clock is a fair fallback.
  }
}

function tick() {
  clockNow = deviceNow() + chainOffset;
  clockListeners.forEach((notify) => notify());
}

function subscribeClock(listener: () => void) {
  clockListeners.add(listener);
  if (!clockTimer) {
    clockNow = deviceNow() + chainOffset;
    clockTimer = setInterval(tick, 1000);
    void syncChainClock().then(tick);
    offsetTimer = setInterval(() => void syncChainClock(), 60_000);
  }
  return () => {
    clockListeners.delete(listener);
    if (clockListeners.size === 0) {
      if (clockTimer) clearInterval(clockTimer);
      if (offsetTimer) clearInterval(offsetTimer);
      clockTimer = offsetTimer = null;
    }
  };
}

const readClock = () => clockNow || deviceNow() + chainOffset;

/** The chain's current time in unix seconds, ticking every second in the browser. */
export function useNow(): number {
  return useSyncExternalStore(subscribeClock, readClock, () => 0);
}
