// Creates the test dollar and the program config (first run only), then a bond series.
// Run again to add another series, e.g. a short one right before recording the demo:
//   yarn setup:devnet --maturity-minutes 5 --name "Savings Bond Demo"
import { BN } from "@anchor-lang/core";
import { createMint } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import {
  configPda,
  connect,
  explorerAddress,
  explorerTx,
  loadAddresses,
  parseArgs,
  rpcUrl,
  run,
  saveAddresses,
  TOKEN_PROGRAM_ID,
  seriesPda,
  usd,
  USD_DECIMALS,
  vaultPda,
  type Addresses,
} from "./lib";

run(async () => {
  const { flags } = parseArgs();
  const maturityMinutes = Number(flags["maturity-minutes"] ?? 30 * 24 * 60);
  const name = flags["name"] ?? "Savings Bond 2026-A";
  const couponBps = Number(flags["coupon-bps"] ?? 900);
  const cap = Number(flags["cap"] ?? 50_000);

  const { admin, connection, program } = connect();
  const programId = program.programId;
  console.log(`RPC:     ${rpcUrl()}`);
  console.log(`Admin:   ${admin.publicKey}`);
  console.log(`Program: ${programId}`);

  const config = configPda(programId);
  const existing = await program.account.config.fetchNullable(config);
  let usdMint: PublicKey;
  if (existing) {
    usdMint = existing.usdMint;
    console.log(`Config already exists; test dollar mint ${usdMint}`);
  } else {
    usdMint = await createMint(connection, admin, admin.publicKey, null, USD_DECIMALS);
    console.log(`Created test dollar mint ${usdMint}`);
    const signature = await program.methods
      .initialize()
      .accountsPartial({ admin: admin.publicKey, usdMint })
      .rpc();
    console.log(`Initialized config: ${explorerTx(signature)}`);
  }

  const id = (await program.account.config.fetch(config)).seriesCount;
  const series = seriesPda(programId, id);
  const vault = vaultPda(programId, series);
  const maturityTs = Math.floor(Date.now() / 1000) + Math.round(maturityMinutes * 60);
  const signature = await program.methods
    .createSeries(name, couponBps, new BN(maturityTs), usd(cap))
    .accountsPartial({ admin: admin.publicKey, issuer: admin.publicKey, series, vault, usdMint, tokenProgram: TOKEN_PROGRAM_ID })
    .rpc();
  console.log(`Created series ${id} "${name}": ${explorerTx(signature)}`);
  console.log(`  matures ${new Date(maturityTs * 1000).toISOString()}`);

  const addresses: Addresses = loadAddresses() ?? {
    programId: programId.toString(),
    usdMint: usdMint.toString(),
    config: config.toString(),
    series: [],
  };
  if (addresses.programId !== programId.toString() || addresses.usdMint !== usdMint.toString()) {
    // A redeploy under a new program id starts from a clean list.
    addresses.programId = programId.toString();
    addresses.usdMint = usdMint.toString();
    addresses.config = config.toString();
    addresses.series = [];
  }
  addresses.series.push({
    id: id.toNumber(),
    address: series.toString(),
    vault: vault.toString(),
    name,
    maturityTs,
  });
  saveAddresses(addresses);
  console.log(`\nSaved to idl/devnet.json`);
  console.log(`Series: ${explorerAddress(series)}`);
});
