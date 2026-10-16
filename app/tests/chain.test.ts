import { Keypair } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import { errorKey } from "@/lib/chain/errors";
import { toActivity } from "@/lib/chain/history";
import { defaultSeries, isOpen, LIMITS, type Series } from "@/lib/chain/program";
import { ruleMatches } from "@/lib/chain/transactions";

const key = () => Keypair.generate().publicKey;

function series(id: number, maturityTs: number, totalPrincipal = BigInt(0), cap = BigInt(100)): Series {
  return {
    id,
    address: key(),
    issuer: key(),
    name: `S${id}`,
    couponBps: 900,
    startTs: 0,
    maturityTs,
    cap,
    totalPrincipal,
    totalRedeemed: BigInt(0),
    interestPaid: BigInt(0),
    totalWithdrawn: BigInt(0),
    totalRepaid: BigInt(0),
    saverCount: 0,
    proceedsCount: 0,
    vault: key(),
  };
}

describe("program limits", () => {
  it("come from the IDL", () => {
    expect(LIMITS).toEqual({ maxSaveBps: 5000, maxGoalKind: 4, maxNameLength: 32, maxPurposeLength: 64 });
  });
});

describe("series choice", () => {
  it("picks the newest series that is still open", () => {
    const all = [series(0, 1_000), series(1, 50), series(2, 2_000, BigInt(100))];
    expect(isOpen(all[0], 100)).toBe(true);
    expect(isOpen(all[1], 100)).toBe(false); // matured
    expect(isOpen(all[2], 100)).toBe(false); // full
    expect(defaultSeries(all, 100)?.id).toBe(0);
    expect(defaultSeries(all, 5_000)).toBeNull();
  });
});

describe("ruleMatches", () => {
  it("skips set_split_rule only when nothing changed", () => {
    const recipient = key();
    const s = key();
    const rule = {
      worker: key(),
      recipient,
      saveBps: 1500,
      series: s,
      totalSent: BigInt(0),
      totalSaved: BigInt(0),
      transferCount: 0,
      goalAmount: BigInt(0),
      goalKind: 0,
    };
    const none = { amount: BigInt(0), kind: 0 };
    expect(ruleMatches(rule, recipient, 1500, s, none)).toBe(true);
    expect(ruleMatches(rule, recipient, 2000, s, none)).toBe(false);
    expect(ruleMatches(rule, key(), 1500, s, none)).toBe(false);
    expect(ruleMatches(rule, recipient, 1500, key(), none)).toBe(false);
    expect(ruleMatches(rule, recipient, 1500, s, { amount: BigInt(5), kind: 1 })).toBe(false);
    expect(ruleMatches(null, recipient, 1500, s, none)).toBe(false);
  });
});

describe("errorKey", () => {
  it("maps program errors by name and by code", () => {
    expect(errorKey(new Error("AnchorError ... Error Code: VaultInsufficient. Error Number: 6018."))).toBe("error.VaultInsufficient");
    const failed = Object.assign(new Error("Transaction failed"), { logs: ["Program log: AnchorError occurred. Error Code: Paused."] });
    expect(errorKey(failed)).toBe("error.Paused");
    expect(errorKey(new Error('{"InstructionError":[2,{"Custom":6003}]}'))).toBe("error.SaveShareTooHigh");
  });

  it("explains wallet and network failures", () => {
    expect(errorKey(new Error("User rejected the request."))).toBe("error.rejected");
    expect(errorKey(new Error("Attempt to debit an account but found no record of a prior credit."))).toBe("error.noSol");
    expect(errorKey(new Error("Signature abc has expired: block height exceeded."))).toBe("error.expired");
    expect(errorKey(new Error("error.faucetLimit"))).toBe("error.faucetLimit");
    expect(errorKey(new Error("fetch failed"))).toBe("error.busy");
  });
});

describe("toActivity", () => {
  it("reads events whatever case Anchor gives the name", () => {
    const worker = key();
    const recipient = key();
    const s = key();
    const data = { worker, recipient, amount: "200", familyAmount: "170", savedAmount: "30", series: s };
    for (const name of ["RemittanceSent", "remittanceSent"]) {
      expect(toActivity(name, data)).toEqual({
        kind: "sent",
        worker,
        recipient,
        amount: BigInt(200),
        family: BigInt(170),
        saved: BigInt(30),
        series: s,
      });
    }
    expect(toActivity("Repaid", { series: s, amount: "5", totalRepaid: "5" })).toEqual({ kind: "repaid", series: s, amount: BigInt(5) });
    expect(toActivity("SeriesCreated", {})).toBeNull();
  });
});
