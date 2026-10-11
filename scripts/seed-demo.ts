// Fills a series with sample savers and use-of-funds records so the public page is not empty.
//   yarn seed [--series 0] [--savers 4]
import { getAccount, mintTo } from "@solana/spl-token";
import { Keypair, PublicKey } from "@solana/web3.js";
import {
  connect,
  explorerTx,
  formatUsd,
  fund,
  parseArgs,
  pickSeries,
  positionPda,
  proceedsPda,
  requireAddresses,
  rulePda,
  run,
  tokenAccount,
  TOKEN_PROGRAM_ID,
  usd,
} from "./lib";

// Each saver sends `send` test dollars at `saveBps`.
const SAVERS = [
  { send: 200, saveBps: 1500 },
  { send: 350, saveBps: 2000 },
  { send: 120, saveBps: 1000 },
  { send: 500, saveBps: 3000 },
  { send: 250, saveBps: 2500 },
  { send: 180, saveBps: 500 },
];
// Shares of the amount raised that the issuer withdraws, with the stated purpose.
const PROCEEDS = [
  { share: 0.4, purpose: "Hydropower project, tranche 1" },
  { share: 0.25, purpose: "School construction" },
];

run(async () => {
  const { flags } = parseArgs();
  const addresses = requireAddresses();
  const series = pickSeries(addresses, flags["series"] === undefined ? undefined : Number(flags["series"]));
  const saverCount = Math.min(Number(flags["savers"] ?? 4), SAVERS.length);

  const { admin, connection, program } = connect();
  const programId = program.programId;
  const usdMint = new PublicKey(addresses.usdMint);
  console.log(`Seeding series ${series.id} "${series.name}"`);

  for (const { send, saveBps } of SAVERS.slice(0, saverCount)) {
    const worker = Keypair.generate();
    const recipient = Keypair.generate().publicKey;
    const workerToken = await fund(connection, admin, usdMint, worker.publicKey, send, 0.01);
    const recipientToken = await tokenAccount(connection, admin, usdMint, recipient);
    await program.methods
      .setSplitRule(recipient, saveBps)
      .accountsPartial({ worker: worker.publicKey, series: series.address })
      .signers([worker])
      .rpc();
    const signature = await program.methods
      .sendRemittance(usd(send))
      .accountsPartial({
        worker: worker.publicKey,
        rule: rulePda(programId, worker.publicKey),
        series: series.address,
        position: positionPda(programId, worker.publicKey, series.address),
        usdMint,
        workerToken,
        recipientToken,
        vault: series.vault,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([worker])
      .rpc();
    console.log(`  saver sent $${send} at ${saveBps / 100}%: ${explorerTx(signature)}`);
  }

  const issuerToken = await tokenAccount(connection, admin, usdMint, admin.publicKey);
  const raised = Number((await getAccount(connection, series.vault)).amount);
  for (const { share, purpose } of PROCEEDS) {
    const index = (await program.account.bondSeries.fetch(series.address)).proceedsCount;
    const amount = Math.floor(raised * share);
    const signature = await program.methods
      .withdrawProceeds(usd(amount / 1e6), purpose)
      .accountsPartial({
        issuer: admin.publicKey,
        series: series.address,
        record: proceedsPda(programId, series.address, index),
        usdMint,
        issuerToken,
        vault: series.vault,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
    console.log(`  issuer withdrew ${formatUsd(amount)} for "${purpose}": ${explorerTx(signature)}`);
  }

  // There is no repay instruction: the issuer funds interest by paying into the vault directly.
  const reserve = Number(flags["interest-reserve"] ?? 50);
  await mintTo(connection, admin, usdMint, series.vault, admin, BigInt(usd(reserve).toString()));
  const vault = await getAccount(connection, series.vault);
  console.log(`Added $${reserve} interest reserve. Vault now holds ${formatUsd(vault.amount)}`);
});
