// One full run of the core flow with a fresh worker: fund, set rule, send, and optionally redeem.
//   yarn flow [--series 0] [--amount 200] [--save-bps 1500] [--redeem true]
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
  requireAddresses,
  rulePda,
  run,
  tokenAccount,
  TOKEN_PROGRAM_ID,
  usd,
} from "./lib";

run(async () => {
  const { flags } = parseArgs();
  const addresses = requireAddresses();
  const series = pickSeries(addresses, flags["series"] === undefined ? undefined : Number(flags["series"]));
  const amount = Number(flags["amount"] ?? 200);
  const saveBps = Number(flags["save-bps"] ?? 1500);

  const { admin, connection, program } = connect();
  const programId = program.programId;
  const usdMint = new PublicKey(addresses.usdMint);
  const worker = Keypair.generate();
  const recipient = Keypair.generate().publicKey;
  const position = positionPda(programId, worker.publicKey, series.address);
  console.log(`Series ${series.id} "${series.name}"\nWorker ${worker.publicKey}\nFamily ${recipient}`);

  const workerToken = await fund(connection, admin, usdMint, worker.publicKey, amount, 0.02);
  const recipientToken = await tokenAccount(connection, admin, usdMint, recipient);

  const ruleSig = await program.methods
    .setSplitRule(recipient, saveBps)
    .accountsPartial({ worker: worker.publicKey, series: series.address })
    .signers([worker])
    .rpc();
  console.log(`1. Rule set at ${saveBps / 100}%: ${explorerTx(ruleSig)}`);

  const sendSig = await program.methods
    .sendRemittance(usd(amount))
    .accountsPartial({
      worker: worker.publicKey,
      rule: rulePda(programId, worker.publicKey),
      series: series.address,
      position,
      usdMint,
      workerToken,
      recipientToken,
      vault: series.vault,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers([worker])
    .rpc();
  const family = (await getAccount(connection, recipientToken)).amount;
  const saved = (await program.account.position.fetch(position)).principal;
  console.log(`2. Sent $${amount}: family got ${formatUsd(family)}, saved ${formatUsd(saved)}`);
  console.log(`   ${explorerTx(sendSig)}`);

  if (flags["redeem"] !== "true") return;
  const waitMs = series.maturityTs * 1000 - Date.now() + 5_000;
  if (waitMs > 15 * 60_000) throw new Error("Series matures more than 15 minutes from now; not waiting.");
  if (waitMs > 0) {
    console.log(`3. Waiting ${Math.ceil(waitMs / 1000)}s for maturity...`);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  // The vault holds principal only; the issuer pays in the interest before savers can redeem.
  await mintTo(connection, admin, usdMint, series.vault, admin, BigInt(usd(1).toString()));
  const redeemSig = await program.methods
    .redeem()
    .accountsPartial({
      worker: worker.publicKey,
      series: series.address,
      position,
      usdMint,
      workerToken,
      vault: series.vault,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers([worker])
    .rpc();
  const back = (await getAccount(connection, workerToken)).amount;
  console.log(`3. Redeemed ${formatUsd(back)} (savings plus interest): ${explorerTx(redeemSig)}`);
});
