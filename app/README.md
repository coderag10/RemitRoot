# RemitRoot web app

> **Educational prototype · Solana test network · No real money**

Next.js 16 (App Router), TypeScript, Tailwind 4 and TanStack Query. See the main [README](../README.md) for the project.

```bash
yarn install
yarn dev        # http://localhost:3000
yarn lint
yarn test       # unit tests (vitest)
yarn build
yarn e2e        # browser tests (Playwright) against a running app; BASE_URL=... to choose which
```

## Pages

| Route | Who | What it shows |
|---|---|---|
| `/` | everyone | What RemitRoot is, "Try the demo", live totals from chain, sourced facts |
| `/send` | worker | Balance and faucet, split slider with a 12-month illustration, family wallet, bond choice, savings goal, savings with live interest, claim and redeem, recent activity |
| `/history` | worker | Every transfer, interest payment and redemption, with explorer links |
| `/family` | family | Money received this month, the family's savings, who sends and their goals. `?wallet=<address>` picks the family. |
| `/bond` | public | Every bond series with status and how much it raised |
| `/bond/[id]` | public | Raised against cap, savers, vault against what is owed, use of funds, repayments |
| `/issuer` | issuer, admin | Withdraw with a stated purpose, repay the vault; the admin can pause |
| `/api/faucet` | demo | Tops a wallet up to a fixed level of test dollars and a little devnet SOL |

## How it reads the chain

Nothing about a deployment is hard-coded. The program id comes from the IDL in `lib/chain/`. The test-dollar mint, its token program and decimals come from the program's `Config` account. The bond series come from the program's accounts, and the default series is the newest one still open. Activity is decoded from the program's events in recent transactions.

| Folder | Contents |
|---|---|
| `lib/chain/` | IDL, account reads, transaction builders, event history, error mapping, and the program's arithmetic mirrored for previews |
| `lib/i18n/` | `en.json` and `ne.json` (same keys; a unit test checks), and the language switch |
| `lib/` | Network settings, number and date formats, the session (demo or wallet), cached queries, transaction toasts |
| `components/` | The design system from `essentials/11-visual-design.md` and the feature components |

## Environment

Set these in `.env.local` (never committed) or in the host's settings.

| Variable | Needed | Meaning |
|---|---|---|
| `FAUCET_SECRET_KEY` | for demo mode | Secret key (JSON byte array) of a dedicated faucet wallet. Not the admin key. |
| `NEXT_PUBLIC_RPC_URL` | no | Devnet or local RPC. Defaults to the public devnet RPC. A mainnet URL is refused. |
| `FAUCET_USD` | no | Test dollars a demo wallet is topped up to. Default 1000. |
| `FAUCET_SOL` | no | Devnet SOL a demo wallet is topped up to. Default 0.01. |
| `FAUCET_MAX_REQUESTS` | no | Faucet requests per network address per 10 minutes. Default 20. |

The practice wallet made by "Try the demo" is kept in the tab's `sessionStorage`, so a refresh does not lose it. It holds test tokens only. Names given to wallets ("Sita") stay in this browser's `localStorage`.

The faucet wallet holds its own stock of test dollars and SOL. Fund it from the repo root:

```bash
yarn faucet <faucet address> --usd 100000 --sol 0.5
```

After a program change, run `yarn sync-idl` to copy the IDL from `../idl`.

## Browser tests

`yarn e2e` runs `e2e/` at a 375px phone size: every page shows the banner and fits the screen, the Nepali toggle, the demo flow (send, refresh mid-flow, history, family view), a 0% transfer, input problems, and a savings goal. The redemption test needs a series that matures within minutes:

```bash
yarn setup:devnet --maturity-minutes 4 --name "E2E Short"     # from the repo root
E2E_SHORT_SERIES=<id> E2E_SHORT_NAME="E2E Short" BASE_URL=http://localhost:3000 yarn e2e redeem
```
