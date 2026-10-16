// Issuer actions on a series. Signs with the admin key, or the issuer's own key with --keypair.
//   yarn issuer withdraw --series 0 --usd 100 --purpose "Hydropower project, tranche 1"
//   yarn issuer repay    --series 0 --usd 25
import {
  connect,
  explorerTx,
  formatUsd,
  loadConfig,
  loadSeries,
  loadSigner,
  optionalNumber,
  parseArgs,
  proceedsPda,
  run,
  tokenAccount,
  TOKEN_PROGRAM_ID,
  usd,
} from "./lib";

const USAGE = 'Usage: yarn issuer <withdraw|repay> --series <id> --usd <amount> [--purpose "..."] [--keypair <file>]';

run(async () => {
  const { flags, positional } = parseArgs();
  const action = positional[0];
  const amount = Number(flags["usd"]);
  if (!["withdraw", "repay"].includes(action) || !(amount > 0)) throw new Error(USAGE);

  const client = connect(loadSigner(flags["keypair"]));
  const { program, connection, signer } = client;
  const { usdMint } = await loadConfig(client);
  const series = await loadSeries(client, optionalNumber(flags["series"]));
  if (!series.issuer.equals(signer.publicKey)) {
    throw new Error(`Series ${series.id} is issued by ${series.issuer}; pass that key with --keypair.`);
  }
  const issuerToken = await tokenAccount(connection, signer, usdMint, signer.publicKey);

  if (action === "withdraw") {
    const purpose = flags["purpose"];
    if (!purpose) throw new Error(USAGE);
    const signature = await program.methods
      .withdrawProceeds(usd(amount), purpose)
      .accountsPartial({
        issuer: signer.publicKey,
        series: series.address,
        record: proceedsPda(program.programId, series.address, series.proceedsCount),
        usdMint,
        issuerToken,
        vault: series.vault,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
    console.log(`Withdrew ${formatUsd(usd(amount))} from series ${series.id} for "${purpose}": ${explorerTx(signature)}`);
  } else {
    const signature = await program.methods
      .repay(usd(amount))
      .accountsPartial({
        issuer: signer.publicKey,
        series: series.address,
        usdMint,
        issuerToken,
        vault: series.vault,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
    console.log(`Repaid ${formatUsd(usd(amount))} into series ${series.id}: ${explorerTx(signature)}`);
  }
});
