// Admin switch for the emergency pause. While paused, rules, sends and interest claims are refused;
// redeeming after maturity still works.
//   yarn admin pause | unpause | status
import { connect, configPda, explorerTx, loadConfig, parseArgs, run } from "./lib";

run(async () => {
  const action = parseArgs().positional[0];
  const client = connect();
  const config = await loadConfig(client);
  if (action === "status" || action === undefined) {
    console.log(`Admin ${config.admin}\nDollar mint ${config.usdMint}\nSeries ${config.seriesCount}\nPaused: ${config.paused}`);
    return;
  }
  if (action !== "pause" && action !== "unpause") throw new Error("Usage: yarn admin <pause|unpause|status>");
  const signature = await client.program.methods
    .setPaused(action === "pause")
    .accountsPartial({ admin: client.admin.publicKey, config: configPda(client.program.programId) })
    .rpc();
  console.log(`${action === "pause" ? "Paused" : "Unpaused"}: ${explorerTx(signature)}`);
});
