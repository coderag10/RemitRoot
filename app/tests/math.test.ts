import { describe, expect, it } from "vitest";
import { monthsToGoal, projection, simpleInterest, split, unpaidInterest } from "@/lib/chain/math";

const USD = BigInt(1_000_000);
const YEAR = 31_536_000;

describe("split", () => {
  it("matches the program at 0%, 15% and 50%", () => {
    expect(split(BigInt(200) * USD, 0)).toEqual({ saved: BigInt(0), family: BigInt(200) * USD });
    expect(split(BigInt(200) * USD, 1500)).toEqual({ saved: BigInt(30) * USD, family: BigInt(170) * USD });
    expect(split(BigInt(200) * USD, 5000)).toEqual({ saved: BigInt(100) * USD, family: BigInt(100) * USD });
  });

  it("rounds the saved share down and loses nothing", () => {
    const { saved, family } = split(BigInt(333_333), 1500);
    expect(saved).toBe(BigInt(49_999));
    expect(saved + family).toBe(BigInt(333_333));
    expect(split(BigInt(9_999), 1).saved).toBe(BigInt(0));
  });
});

describe("interest", () => {
  it("is simple interest, rounded down", () => {
    expect(simpleInterest(BigInt(100) * USD, 900, YEAR)).toBe(BigInt(9) * USD);
    expect(simpleInterest(BigInt(100) * USD, 900, YEAR / 2)).toBe(BigInt(4_500_000));
    expect(simpleInterest(BigInt(1), 900, 10)).toBe(BigInt(0));
    expect(simpleInterest(BigInt(100) * USD, 900, -5)).toBe(BigInt(0));
  });

  it("adds what accrued since the last booking and stops at maturity", () => {
    const position = { principal: BigInt(100) * USD, accruedInterest: BigInt(1_000), lastAccrualTs: 0 };
    expect(unpaidInterest(position, 900, YEAR, YEAR / 2)).toBe(BigInt(1_000) + BigInt(4_500_000));
    expect(unpaidInterest(position, 900, YEAR, 3 * YEAR)).toBe(BigInt(1_000) + BigInt(9) * USD);
  });
});

describe("projection", () => {
  it("saves twelve shares and earns less than a full year of interest on them", () => {
    const year = projection(BigInt(200) * USD, 1500, 900);
    expect(year.saved).toBe(BigInt(360) * USD);
    expect(year.interest).toBeGreaterThan(BigInt(0));
    expect(year.interest).toBeLessThan(simpleInterest(BigInt(360) * USD, 900, YEAR));
  });

  it("is zero at a 0% share", () => {
    expect(projection(BigInt(200) * USD, 0, 900)).toEqual({ saved: BigInt(0), interest: BigInt(0) });
  });
});

describe("monthsToGoal", () => {
  it("rounds up to whole transfers", () => {
    expect(monthsToGoal(BigInt(0), BigInt(100), BigInt(30))).toBe(4);
    expect(monthsToGoal(BigInt(90), BigInt(100), BigInt(30))).toBe(1);
    expect(monthsToGoal(BigInt(100), BigInt(100), BigInt(30))).toBe(0);
    expect(monthsToGoal(BigInt(0), BigInt(100), BigInt(0))).toBeNull();
  });
});
