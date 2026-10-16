// Initialises the program config (first run only), then adds a bond series.
//   yarn setup:devnet [--mint <address>] [--name "Savings Bond 2026-A"] [--coupon-bps 900]
//                     [--cap 50000] [--maturity-minutes 43200] [--issuer <address>]
// Run it again to add another series, e.g. a short one before recording a live redemption:
//   yarn setup:devnet --maturity-minutes 5 --name "Savings Bond Demo"
import { BN } from "@anchor-lang/core";
import { createMint } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import path from "node:path";
import {
  configPda,
  connect,
  explorerAddress,
  explorerTx,
  loadDeployment,
  parseArgs,
  DEPLOYMENT_FILE,
  rpcUrl,
  run,
  saveDeployment,
  seriesPda,
  TOKEN_PROGRAM_ID,
  usd,
  USD_DECIMALS,
  vaultPda,
} from "./lib";

run(async () => {
  const { flags } = parseArgs();
  const maturityMinutes = Number(flags["maturity-minutes"] ?? 30 * 24 * 60);
  const name = flags["name"] ?? "Savings Bond 2026-A";
  const couponBps = Number(flags["coupon-bps"] ?? 900);
  const cap = Number(flags["cap"] ?? 50_000);

  const client = connect();
  const { admin, connection, program } = client;
  const programId = program.programId;
  const issuer = flags["issuer"] ? new PublicKey(flags["issuer"]) : admin.publicKey;
  console.log(`RPC:     ${rpcUrl()}`);
  console.log(`Admin:   ${admin.publicKey}`);
  console.log(`Program: ${programId}`);

  const config = configPda(programId);
  const existing = await program.account.config.fetchNullable(config);
  let usdMint: PublicKey;
  if (existing) {
    usdMint = existing.usdMint;
    console.log(`Config exists; dollar mint ${usdMint}`);
  } else {
    // Reuse a mint the admin already controls (--mint), or make a new 6-decimal test dollar.
    usdMint = flags["mint"]
      ? new PublicKey(flags["mint"])
      : await createMint(connection, admin, admin.publicKey, null, USD_DECIMALS);
    console.log(`${flags["mint"] ? "Using" : "Created"} test dollar mint ${usdMint}`);
    const signature = await program.methods.initialize().accountsPartial({ admin: admin.publicKey, usdMint }).rpc();
    console.log(`Initialized config: ${explorerTx(signature)}`);
  }

  const id = (await program.account.config.fetch(config)).seriesCount;
  const series = seriesPda(programId, id);
  const vault = vaultPda(programId, series);
  const maturityTs = Math.floor(Date.now() / 1000) + Math.round(maturityMinutes * 60);
  const signature = await program.methods
    .createSeries(name, couponBps, new BN(maturityTs), usd(cap))
    .accountsPartial({ admin: admin.publicKey, issuer, series, vault, usdMint, tokenProgram: TOKEN_PROGRAM_ID })
    .rpc();
  console.log(`Created series ${id} "${name}" (issuer ${issuer}): ${explorerTx(signature)}`);
  console.log(`  matures ${new Date(maturityTs * 1000).toISOString()}`);

  const deployment = loadDeployment() ?? {
    programId: programId.toString(),
    usdMint: usdMint.toString(),
    config: config.toString(),
    series: [],
  };
  deployment.series.push({ id: id.toNumber(), address: series.toString(), vault: vault.toString(), name, maturityTs });
  saveDeployment(deployment);
  console.log(`\nRecorded in ${path.relative(process.cwd(), DEPLOYMENT_FILE)}`);
  console.log(`Series: ${explorerAddress(series)}`);
});
