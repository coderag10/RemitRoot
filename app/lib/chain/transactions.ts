// Transaction builders. Each returns an unsigned transaction for the visitor's wallet to sign.
import { BN } from "@anchor-lang/core";
import { createAssociatedTokenAccountIdempotentInstruction } from "@solana/spl-token";
import { PublicKey, Transaction } from "@solana/web3.js";
import { split } from "./math";
import {
  configPda,
  positionPda,
  proceedsPda,
  program,
  rulePda,
  usdAccount,
  type Config,
  type Rule,
  type Series,
} from "./program";

const bn = (value: bigint) => new BN(value.toString());

export type Goal = { amount: bigint; kind: number };

/** Does the saved rule already say exactly this? Then no `set_split_rule` is needed. */
export function ruleMatches(rule: Rule | null, recipient: PublicKey, saveBps: number, series: PublicKey, goal: Goal) {
  return (
    rule !== null &&
    rule.recipient.equals(recipient) &&
    rule.saveBps === saveBps &&
    rule.series.equals(series) &&
    rule.goalAmount === goal.amount &&
    rule.goalKind === goal.kind
  );
}

/**
 * One transaction that pays the family and buys the bond. The split rule is set in the same
 * transaction when it is new or changed, and the family's token account is created if missing.
 */
export async function buildSend(args: {
  config: Config;
  worker: PublicKey;
  recipient: PublicKey;
  series: Series;
  amount: bigint;
  saveBps: number;
  goal: Goal;
  rule: Rule | null;
}): Promise<Transaction> {
  const { config, worker, recipient, series, amount, saveBps, goal, rule } = args;
  const tx = new Transaction();
  const recipientToken = usdAccount(config, recipient);
  tx.add(
    createAssociatedTokenAccountIdempotentInstruction(
      worker,
      recipientToken,
      recipient,
      config.usdMint,
      config.tokenProgram,
    ),
  );
  if (!ruleMatches(rule, recipient, saveBps, series.address, goal)) {
    tx.add(
      await program.methods
        .setSplitRule(recipient, saveBps, bn(goal.amount), goal.kind)
        .accountsPartial({ worker, config: configPda(), rule: rulePda(worker), series: series.address })
        .instruction(),
    );
  }
  // The position is passed only when something is saved; a 0% transfer creates none.
  const saves = split(amount, saveBps).saved > BigInt(0);
  tx.add(
    await program.methods
      .sendRemittance(bn(amount))
      .accountsPartial({
        worker,
        config: configPda(),
        rule: rulePda(worker),
        series: series.address,
        position: saves ? positionPda(worker, series.address) : null,
        usdMint: config.usdMint,
        workerToken: usdAccount(config, worker),
        recipientToken,
        vault: series.vault,
        tokenProgram: config.tokenProgram,
      })
      .instruction(),
  );
  return tx;
}

/** Accounts shared by claim and redeem: the worker's position and the series vault. */
function positionAccounts(config: Config, worker: PublicKey, series: Series) {
  return {
    worker,
    config: configPda(),
    series: series.address,
    position: positionPda(worker, series.address),
    usdMint: config.usdMint,
    workerToken: usdAccount(config, worker),
    vault: series.vault,
    tokenProgram: config.tokenProgram,
  };
}

/** Prepends creating the worker's token account, in case it was closed or never made. */
function withOwnAccount(config: Config, owner: PublicKey, tx: Transaction) {
  return new Transaction()
    .add(
      createAssociatedTokenAccountIdempotentInstruction(
        owner,
        usdAccount(config, owner),
        owner,
        config.usdMint,
        config.tokenProgram,
      ),
    )
    .add(...tx.instructions);
}

export async function buildClaim(config: Config, worker: PublicKey, series: Series) {
  const tx = await program.methods.claimInterest().accountsPartial(positionAccounts(config, worker, series)).transaction();
  return withOwnAccount(config, worker, tx);
}

export async function buildRedeem(config: Config, worker: PublicKey, series: Series) {
  const tx = await program.methods.redeem().accountsPartial(positionAccounts(config, worker, series)).transaction();
  return withOwnAccount(config, worker, tx);
}

export async function buildWithdraw(config: Config, issuer: PublicKey, series: Series, amount: bigint, purpose: string) {
  const tx = await program.methods
    .withdrawProceeds(bn(amount), purpose)
    .accountsPartial({
      issuer,
      config: configPda(),
      series: series.address,
      record: proceedsPda(series.address, series.proceedsCount),
      usdMint: config.usdMint,
      issuerToken: usdAccount(config, issuer),
      vault: series.vault,
      tokenProgram: config.tokenProgram,
    })
    .transaction();
  return withOwnAccount(config, issuer, tx);
}

export async function buildRepay(config: Config, issuer: PublicKey, series: Series, amount: bigint) {
  return program.methods
    .repay(bn(amount))
    .accountsPartial({
      issuer,
      config: configPda(),
      series: series.address,
      usdMint: config.usdMint,
      issuerToken: usdAccount(config, issuer),
      vault: series.vault,
      tokenProgram: config.tokenProgram,
    })
    .transaction();
}

export async function buildSetPaused(admin: PublicKey, paused: boolean) {
  return program.methods.setPaused(paused).accountsPartial({ admin, config: configPda() }).transaction();
}
