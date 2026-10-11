// Sends test dollars (and optionally SOL for fees) to an address.
//   yarn faucet <address> [--usd 1000] [--sol 0.05]
import { PublicKey } from "@solana/web3.js";
import { connect, fund, parseArgs, requireAddresses, run } from "./lib";

run(async () => {
  const { flags, positional } = parseArgs();
  if (!positional[0]) throw new Error("Usage: yarn faucet <address> [--usd 1000] [--sol 0.05]");
  const recipient = new PublicKey(positional[0]);
  const usdAmount = Number(flags["usd"] ?? 1000);
  const solAmount = Number(flags["sol"] ?? 0);

  const { admin, connection } = connect();
  const usdMint = new PublicKey(requireAddresses().usdMint);
  const account = await fund(connection, admin, usdMint, recipient, usdAmount, solAmount);
  console.log(`Sent ${usdAmount} test dollars and ${solAmount} SOL to ${recipient}`);
  console.log(`Test dollar account: ${account}`);
});
