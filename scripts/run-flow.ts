// One full run of the core flow with a fresh worker: fund, set rule, send, claim interest, redeem.
//   yarn flow [--series <id>] [--amount 200] [--save-bps 1500] [--redeem true]
import { getAccount } from "@solana/spl-token";
import { Keypair, SYSVAR_CLOCK_PUBKEY } from "@solana/web3.js";
import {
  connect,
  explorerTx,
  formatUsd,
  fund,
  loadConfig,
  loadSeries,
  optionalNumber,
  parseArgs,
  positionPda,
  run,
  sendRemittance,
  tokenAccount,
  TOKEN_PROGRAM_ID,
  usd,
} from "./lib";

run(async () => {
  const { flags } = parseArgs();
  const amount = Number(flags["amount"] ?? 200);
  const saveBps = Number(flags["save-bps"] ?? 1500);

  const client = connect();
  const { admin, connection, program } = client;
  const { usdMint } = await loadConfig(client);
  const series = await loadSeries(client, optionalNumber(flags["series"]));
  const worker = Keypair.generate();
  const recipient = Keypair.generate().publicKey;
  const position = positionPda(program.programId, worker.publicKey, series.address);
  console.log(`Series ${series.id} "${series.name}"\nWorker ${worker.publicKey}\nFamily ${recipient}`);

  await fund(connection, admin, usdMint, worker.publicKey, amount, 0.02);
  const sent = await sendRemittance(client, {
    worker,
    recipient,
    series: series.address,
    vault: series.vault,
    usdMint,
    amount,
    saveBps,
  });
  const family = (await getAccount(connection, sent.recipientToken)).amount;
  console.log(`1. Sent $${amount} at ${saveBps / 100}%: family got ${formatUsd(family)}`);
  console.log(`   ${explorerTx(sent.signature)}`);
  if (saveBps === 0) return;

  const accounts = {
    worker: worker.publicKey,
    series: series.address,
    position,
    usdMint,
    workerToken: sent.workerToken,
    vault: series.vault,
    tokenProgram: TOKEN_PROGRAM_ID,
  };
  // The issuer funds a little interest so claims and redemption can be paid.
  if (series.issuer.equals(admin.publicKey)) {
    const issuerToken = await tokenAccount(connection, admin, usdMint, admin.publicKey);
    await fund(connection, admin, usdMint, admin.publicKey, 1);
    await program.methods
      .repay(usd(1))
      .accountsPartial({ issuer: admin.publicKey, series: series.address, usdMint, issuerToken, vault: series.vault, tokenProgram: TOKEN_PROGRAM_ID })
      .rpc();
  }
  // Simple interest on a small saving is below one cent for a while; claim only once there is some.
  await new Promise((resolve) => setTimeout(resolve, 3_000));
  const held = await program.account.position.fetch(position);
  const elapsed = Math.min(Date.now() / 1000, series.maturityTs.toNumber()) - held.lastAccrualTs.toNumber();
  const owed = held.principal.muln(series.couponBps).muln(Math.max(0, Math.floor(elapsed))).divn(10_000).divn(31_536_000);
  if (owed.gtn(0)) {
    const claimSig = await program.methods.claimInterest().accountsPartial(accounts).signers([worker]).rpc();
    console.log(`2. Claimed ${formatUsd(owed)} of interest: ${explorerTx(claimSig)}`);
  } else {
    console.log("2. No interest to claim yet (it accrues per second and is under one cent so far).");
  }

  if (flags["redeem"] !== "true") return;
  // The program checks maturity against the chain clock, which can trail wall time on devnet.
  const chainNow = async () => Number((await connection.getAccountInfo(SYSVAR_CLOCK_PUBKEY))!.data.readBigInt64LE(32));
  const maturity = series.maturityTs.toNumber();
  if (maturity - (await chainNow()) > 15 * 60) throw new Error("Series matures more than 15 minutes from now; not waiting.");
  console.log(`3. Waiting for maturity on the chain clock...`);
  while ((await chainNow()) < maturity) await new Promise((resolve) => setTimeout(resolve, 5_000));
  const redeemSig = await program.methods.redeem().accountsPartial(accounts).signers([worker]).rpc();
  const back = (await getAccount(connection, sent.workerToken)).amount;
  console.log(`3. Redeemed: worker now holds ${formatUsd(back)}: ${explorerTx(redeemSig)}`);
});
