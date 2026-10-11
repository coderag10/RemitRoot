// The issuer pays interest into a series vault, so savers can redeem principal plus interest.
//   yarn pay-interest --series 3 [--usd 1]
import { mintTo } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { connect, explorerTx, parseArgs, pickSeries, requireAddresses, run, usd } from "./lib";

run(async () => {
  const { flags } = parseArgs();
  if (flags["series"] === undefined) throw new Error("Usage: yarn pay-interest --series <id> [--usd 1]");
  const addresses = requireAddresses();
  const series = pickSeries(addresses, Number(flags["series"]));
  const amount = Number(flags["usd"] ?? 1);

  const { admin, connection } = connect();
  const usdMint = new PublicKey(addresses.usdMint);
  const signature = await mintTo(connection, admin, usdMint, series.vault, admin, BigInt(usd(amount).toString()));
  console.log(`Paid ${amount} test dollars of interest into series ${series.id}: ${explorerTx(signature)}`);
});
