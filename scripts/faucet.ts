// Mints test dollars (and optionally sends SOL for fees) to an address. The admin is the mint authority.
//   yarn faucet <address> [--usd 1000] [--sol 0.05]
import { PublicKey } from "@solana/web3.js";
import { connect, fund, loadConfig, parseArgs, run } from "./lib";

run(async () => {
  const { flags, positional } = parseArgs();
  if (!positional[0]) throw new Error("Usage: yarn faucet <address> [--usd 1000] [--sol 0.05]");
  const recipient = new PublicKey(positional[0]);
  const usdAmount = Number(flags["usd"] ?? 1000);
  const solAmount = Number(flags["sol"] ?? 0);

  const client = connect();
  const { usdMint } = await loadConfig(client);
  const account = await fund(client.connection, client.admin, usdMint, recipient, usdAmount, solAmount);
  console.log(`Sent ${usdAmount} test dollars and ${solAmount} SOL to ${recipient}`);
  console.log(`Test dollar account: ${account}`);
});
