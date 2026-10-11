# RemitRoot web app

> **Educational prototype · Solana test network · No real money**

Next.js (App Router), TypeScript and Tailwind. See the main [README](../README.md) for the project.

```bash
yarn install
yarn dev      # http://localhost:3000
yarn lint
yarn build
```

| Route | What it shows |
|---|---|
| `/` | Landing, "Try the demo", wallet connection |
| `/send` | Split slider, send, savings summary, redeem, family wallet. `?series=N` picks a bond series. |
| `/bond/[id]` | Public bond page: raised, savers, vault against what is owed, use of funds |
| `/api/faucet` | Tops a wallet up to 1,000 test dollars and a little devnet SOL |

## Environment

Set these in `.env.local` (never committed) or in the host's settings.

| Variable | Needed | Meaning |
|---|---|---|
| `FAUCET_SECRET_KEY` | for demo mode | Secret key (JSON byte array) of a dedicated faucet wallet. Not the admin key. |
| `NEXT_PUBLIC_RPC_URL` | no | Devnet or local RPC. Defaults to the public devnet RPC. A mainnet URL is refused. |
| `RPC_URL` | no | Server-side RPC for the faucet, if different. |
| `NEXT_PUBLIC_SERIES_ID` | no | Default bond series. Defaults to 0. |
| `NEXT_PUBLIC_USD_MINT` | no | Test dollar mint, for a local validator. |

The faucet wallet holds its own stock of test dollars and SOL. Fund it from the repo root:

```bash
yarn faucet <faucet address> --usd 100000 --sol 0.3
```

After a program change, run `yarn sync-idl` to copy the IDL from `../idl`.
