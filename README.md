# RemitRoot

*Every transfer splits. Part takes root.*

> **Educational prototype · Solana test network · No real money**

RemitRoot puts saving inside the remittance. A worker sets a rule once; every transfer after that splits in a single transaction: most goes to the family, a chosen share (0–50%) buys a savings bond held on-chain.

## Layout

```
programs/remitroot/        Anchor program (Rust)
programs/remitroot/tests/  Program tests (Rust, LiteSVM)
idl/                       IDL and TypeScript types for the app
app/                       Web app (Next.js): landing, send, public bond page
scripts/                   Devnet setup, faucet, seed data, full-flow run
essentials/                Planning documents (not committed)
```

## Program

| Instruction | Signer | What it does |
|---|---|---|
| `initialize` | admin | Creates the config and fixes the test-dollar mint |
| `create_series` | admin | Creates a bond series and its vault |
| `set_split_rule` | worker | Sets the recipient and the savings share |
| `send_remittance` | worker | Splits the transfer between the family and the bond vault |
| `redeem` | worker | After maturity, pays principal plus simple interest |
| `withdraw_proceeds` | issuer | Takes funds from the vault with a public, stated purpose |

## Run

Needs Rust, the Solana CLI and Anchor 1.1.x.

```bash
anchor build
anchor test
```

## Web app

```bash
cd app && yarn install && yarn dev
```

"Try the demo" makes a practice wallet in the browser and asks the app's faucet for test dollars, so no wallet is needed. Setup and environment variables are in [`app/README.md`](app/README.md).

## Devnet addresses

| What | Address |
|---|---|
| Program | [`4diHFDJAtmQXPvi7ePbozYJ7De76ChL3cGiBqWwcv2gT`](https://explorer.solana.com/address/4diHFDJAtmQXPvi7ePbozYJ7De76ChL3cGiBqWwcv2gT?cluster=devnet) |
| Test dollar mint (6 decimals, no value) | [`6KXvkDwG51KtsvMGLhWp1R5EYjx3BemGrhqQ1ZuF7Rku`](https://explorer.solana.com/address/6KXvkDwG51KtsvMGLhWp1R5EYjx3BemGrhqQ1ZuF7Rku?cluster=devnet) |
| Bond series 0, "Savings Bond 2026-A" | [`8smsSjTmYWExnjajvKj4xtxmNVe7UNYZaedbZeFC3LGW`](https://explorer.solana.com/address/8smsSjTmYWExnjajvKj4xtxmNVe7UNYZaedbZeFC3LGW?cluster=devnet) |

The same addresses are in `idl/devnet.json` for the app. Example split, $200 at 15% in one transaction: [explorer](https://explorer.solana.com/tx/2ZDmjsCmynFfhWinmKJnFLhWLiuCgK1wzDwBbzpkHME3bL1CbLWJ6znLqyKBbFC1zHgTueeVe4b8kSdNTHgTNTcg?cluster=devnet).

## Devnet scripts

```bash
yarn install
yarn setup:devnet                       # test dollar, config and a 30-day bond series
yarn setup:devnet --maturity-minutes 5  # add a short series for a live redemption
yarn seed                               # sample savers and use-of-funds records
yarn faucet <address> --usd 1000 --sol 0.05
yarn flow --redeem true                 # one full run with explorer links
```

Addresses are written to `idl/devnet.json`. The scripts refuse to run against mainnet.

## Disclaimer

This is an educational prototype for a hackathon. It runs only on Solana devnet and local test validators, with a test token that has no value. It is not a financial product and must not be used with real funds.
