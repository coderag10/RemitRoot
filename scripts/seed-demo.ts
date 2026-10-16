// Fills a series with sample savers, uses of funds and a repayment, so the public page is not empty.
// The amounts are sample data for a test bond, not real figures.
//   yarn seed [--series 0] [--savers 6]
import { getAccount } from "@solana/spl-token";
import { Keypair } from "@solana/web3.js";
import {
  connect,
  explorerTx,
  formatUsd,
  fund,
  loadConfig,
  loadSeries,
  optionalNumber,
  parseArgs,
  proceedsPda,
  run,
  sendRemittance,
  tokenAccount,
  TOKEN_PROGRAM_ID,
  usd,
} from "./lib";

// Each sample saver sends `send` test dollars at `saveBps`, some with a savings goal.
const SAVERS = [
  { send: 200, saveBps: 1500, goal: 1000, goalKind: 2 },
  { send: 350, saveBps: 2000, goal: 0, goalKind: 0 },
  { send: 120, saveBps: 1000, goal: 500, goalKind: 1 },
  { send: 500, saveBps: 3000, goal: 2000, goalKind: 3 },
  { send: 250, saveBps: 2500, goal: 0, goalKind: 0 },
  { send: 180, saveBps: 500, goal: 300, goalKind: 4 },
];
// Shares of the amount raised that the issuer withdraws, with the stated purpose.
const PROCEEDS = [
  { share: 0.4, purpose: "Hydropower project, tranche 1" },
  { share: 0.25, purpose: "School construction" },
];

run(async () => {
  const { flags } = parseArgs();
  const client = connect();
  const { admin, connection, program } = client;
  const { usdMint } = await loadConfig(client);
  let series = await loadSeries(client, optionalNumber(flags["series"]));
  const saverCount = Math.min(Number(flags["savers"] ?? SAVERS.length), SAVERS.length);
  console.log(`Seeding series ${series.id} "${series.name}"`);

  for (const { send, saveBps, goal, goalKind } of SAVERS.slice(0, saverCount)) {
    const worker = Keypair.generate();
    await fund(connection, admin, usdMint, worker.publicKey, send, 0.01);
    const { signature } = await sendRemittance(client, {
      worker,
      recipient: Keypair.generate().publicKey,
      series: series.address,
      vault: series.vault,
      usdMint,
      amount: send,
      saveBps,
      goalAmount: goal,
      goalKind,
    });
    console.log(`  saver sent $${send} at ${saveBps / 100}%: ${explorerTx(signature)}`);
  }

  if (!series.issuer.equals(admin.publicKey)) {
    console.log(`Series ${series.id} has another issuer; skipping withdrawals and repayment.`);
    return;
  }
  const issuerToken = await tokenAccount(connection, admin, usdMint, admin.publicKey);
  const raised = Number((await getAccount(connection, series.vault)).amount) / 1e6;
  for (const { share, purpose } of PROCEEDS) {
    series = await loadSeries(client, series.id);
    const amount = Math.floor(raised * share * 100) / 100;
    const signature = await program.methods
      .withdrawProceeds(usd(amount), purpose)
      .accountsPartial({
        issuer: admin.publicKey,
        series: series.address,
        record: proceedsPda(program.programId, series.address, series.proceedsCount),
        usdMint,
        issuerToken,
        vault: series.vault,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
    console.log(`  issuer withdrew ${formatUsd(usd(amount))} for "${purpose}": ${explorerTx(signature)}`);
  }

  // The issuer pays part back, as it would ahead of interest falling due.
  const repay = Number(flags["repay"] ?? 50);
  await fund(connection, admin, usdMint, admin.publicKey, repay);
  const signature = await program.methods
    .repay(usd(repay))
    .accountsPartial({ issuer: admin.publicKey, series: series.address, usdMint, issuerToken, vault: series.vault, tokenProgram: TOKEN_PROGRAM_ID })
    .rpc();
  const vault = await getAccount(connection, series.vault);
  console.log(`  issuer repaid $${repay}: ${explorerTx(signature)}`);
  console.log(`Vault now holds ${formatUsd(vault.amount)}`);
});
