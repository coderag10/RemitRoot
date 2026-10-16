# RemitRoot

*Every transfer splits. Part takes root.*

> **Educational prototype · Solana test network · No real money**

RemitRoot puts saving inside the remittance. A migrant worker sets a rule once. Every transfer after that splits in a single transaction: most goes to the family, and a chosen share (0–50%) buys a savings bond held on-chain.

**Try it:** https://remit-root-mocha.vercel.app. Click "Try the demo"; no wallet or install is needed.

## The problem

Nepal received Rs 2.36 trillion (about $16.19 billion) in remittances in fiscal year 2025/26, more than the national budget for the same year [1]. The Economic Survey put that at around a third of GDP [2]. About one in three households receives remittances, and most of the money goes to consumption and repaying debt [3].

The government already has a tool for turning remittances into investment. Foreign Employment Savings Bonds have been issued by Nepal Rastra Bank since July 2010, only for migrant workers, non-resident Nepalis and recent returnees [4]. They have struggled to sell:

- In 2015, of Rs 250 million offered, Rs 83.71 million was bought, about a third [5].
- In 2015, a central bank official said the 9% yield was offset by about 6% rupee depreciation against the dollar that year [5].
- In 2016, officials cited lack of awareness among workers [4].
- Other reasons given are that the bonds are issued in rupees and the subscription period is short [3].

The gap is that investing is a separate, difficult step, far from the moment the worker handles the money. A Solana Foundation report from September 2026 makes the same point about remittances in general: they come with no attached savings, credit or investment service [6].

## The solution

Put the investment inside the transfer. The worker chooses a savings share once. From then on, saving needs no extra step: it happens every time money is sent home.

RemitRoot does not claim to make transfers cheaper. It changes what a transfer does.

## How it works

1. **Set the split.** The worker picks the family's wallet, a savings share from 0% to 50%, and optionally a savings goal (land, school fees, a house).
2. **Send.** One transaction pays the family and moves the savings share into the bond's vault. The worker's bond position grows by that amount.
3. **Watch it grow.** The worker sees total saved, interest building every second, goal progress and the maturity date, and can claim interest along the way. The family sees what it received and the savings being built for it. Anyone can open the public bond page: how much was raised, how many savers there are, what the vault holds against what is owed, and every use of funds and repayment the issuer recorded.
4. **Redeem.** After maturity the worker takes back the savings plus any unpaid simple interest. The issuer repays the vault first; until then a redemption is refused with a plain explanation.

On devnet, $200 sent at a 15% share looks like this:

| Step | Result | Transaction |
|---|---|---|
| Send $200 | $170 to the family, $30 into the bond, in one transaction | [explorer](https://explorer.solana.com/tx/2gFpu5UsvbZ7S4tHKyYUEDmcdzJVu7ypNqupRLD2EEgz9hjGFVtwDNYw5zGkQrKk3bagzTifbT54dfVogULHvUu7?cluster=devnet) |
| Redeem after maturity | Savings plus interest returned to the worker | [explorer](https://explorer.solana.com/tx/8e91ntT5sbQRZriWGmrFgrTw1YudfExzKKYMhKBsKhhhCaWfXZ5YhPx4AEAufhS2GYgd7ypy9hiJytkPHcxJ8Tu?cluster=devnet) |

### Why Solana

- The transfer and the investment settle together in one transaction, so there is no state where the family is paid and the savings are not.
- Fees are small enough that a $30 bond purchase is practical.
- The bond's funds and their use are public, so savers can check where the money went without trusting the operator.

## Architecture

```mermaid
flowchart LR
    W[Worker, family or public browser] --> A[Next.js app]
    A -->|reads accounts and events, sends transactions| P[remitroot program on Solana devnet]
    A -->|practice wallet top-up| F[Faucet route]
    F -->|test dollars and SOL| W
    P --> C[Config]
    P --> S[BondSeries and its vault]
    P --> R[SplitRule, one per worker]
    P --> O[Position, one per worker and series]
    P --> U[ProceedsRecord, one per withdrawal]
```

There is no database and nothing about the deployment is hard-coded in the app. The program id comes from the IDL; the dollar mint, its token program and every bond series are read from the program's accounts; history comes from the program's events. The one server-side piece is the faucet route, which gives a demo visitor test dollars and a little devnet SOL.

### Accounts

| Account | Seeds | Holds |
|---|---|---|
| `Config` | `"config"` | Admin, the dollar mint, pause switch, series count |
| `BondSeries` | `"series", id` | Issuer, name, rate, start and maturity, cap, totals sold, redeemed, withdrawn and repaid, interest paid, saver count |
| Vault | `"vault", series` | The series' test dollars, owned by the series |
| `SplitRule` | `"rule", worker` | Family wallet, savings share, series, lifetime totals, savings goal |
| `Position` | `"position", worker, series` | Principal, interest booked and claimed, last accrual time |
| `ProceedsRecord` | `"proceeds", series, index` | Amount, stated purpose, time |

### Instructions

| Instruction | Signer | What it does |
|---|---|---|
| `initialize` | admin | Creates the config and fixes the dollar mint |
| `set_paused` | admin | Emergency stop for setting rules, sending and claiming |
| `create_series` | admin | Creates a bond series, its issuer and its vault |
| `set_split_rule` | worker | Sets the family wallet, the savings share and an optional goal |
| `send_remittance` | worker | Splits the transfer between the family and the bond vault |
| `claim_interest` | worker | Pays the interest earned so far |
| `redeem` | worker | After maturity, pays principal plus unpaid interest and closes the position |
| `withdraw_proceeds` | issuer | Takes funds from the vault with a public, stated purpose |
| `repay` | issuer | Pays funds back into the vault |

### Rules the program enforces

- **Split:** `saved = amount × share / 10,000`, rounded down; `family = amount − saved`. Nothing is lost to rounding.
- **Share limit:** the savings share cannot exceed 50%. The family wallet must be a real address other than the worker's.
- **Interest:** simple, not compound, rounded in the vault's favour. It is booked before any change to the principal and stops at maturity.
- **Caps and maturity:** saving fails if it would exceed the series cap or the series has matured. A 0% family-only transfer still works, and creates no bond position.
- **Solvency:** claims and redemptions fail with a clear error if the vault cannot cover them; the issuer must repay first. The public page shows the vault against what is owed.
- **Pause:** the admin can stop new rules, sends and claims. Redeeming after maturity always works.
- **Access:** only the admin creates series and pauses, only the issuer withdraws and repays, and no instruction lets one user move another user's funds.

All arithmetic is checked. Every account is checked by seeds, owner or token mint and authority. Events are emitted for every change the app shows.

## Run it

Needs Rust, the Solana CLI, Anchor 1.1.x, Node and yarn.

```bash
# Program: build and run the 34 tests (Rust, LiteSVM)
anchor build
anchor test

# Web app
cd app && yarn install
yarn dev        # http://localhost:3000
yarn test       # 27 unit tests
yarn e2e        # browser tests against a running app, at phone size
```

The app talks to devnet out of the box. Demo mode needs a faucet key; setup and environment variables are in [`app/README.md`](app/README.md).

### Devnet scripts

```bash
yarn install
yarn setup:devnet [--mint <address>]                   # config (first run) and a 30-day bond series
yarn setup:devnet --maturity-minutes 5 --name "Demo"   # add a short series for a live redemption
yarn seed                                              # sample savers, uses of funds and a repayment
yarn faucet <address> --usd 1000 --sol 0.05            # test dollars and SOL for an address
yarn flow --redeem true                                # one full run with explorer links
yarn issuer withdraw --series 0 --usd 100 --purpose "Hydropower project, tranche 1"
yarn issuer repay --series 0 --usd 25
yarn admin pause | unpause | status
```

The scripts read config and series from chain, record what they create in `idl/devnet.json`, and refuse to run against mainnet.

### Repo layout

```
programs/remitroot/        Anchor program (Rust), one instruction per file
programs/remitroot/tests/  Program tests (Rust, LiteSVM): split, interest, issuer, access
idl/                       IDL, TypeScript types and a record of devnet addresses
app/                       Web app (Next.js): worker, family, public bond and issuer pages
app/e2e/                   Browser tests (Playwright)
scripts/                   Devnet setup, faucet, seed data, issuer and admin actions, full-flow run
```

## Devnet addresses

| What | Address |
|---|---|
| Program | [`GHmZ7YCiQNHJQZHTGZfK3oJBfjRWFspKU47HcWaGTiKj`](https://explorer.solana.com/address/GHmZ7YCiQNHJQZHTGZfK3oJBfjRWFspKU47HcWaGTiKj?cluster=devnet) |
| Test dollar mint (6 decimals, no value) | [`6KXvkDwG51KtsvMGLhWp1R5EYjx3BemGrhqQ1ZuF7Rku`](https://explorer.solana.com/address/6KXvkDwG51KtsvMGLhWp1R5EYjx3BemGrhqQ1ZuF7Rku?cluster=devnet) |
| Config | [`3ousykorW11yrKjFh5o5zv5v3ukWxCfqzskJAKgNLCwN`](https://explorer.solana.com/address/3ousykorW11yrKjFh5o5zv5v3ukWxCfqzskJAKgNLCwN?cluster=devnet) |
| Bond series 0, "Savings Bond 2026-A" | [`BXXw6N8Gc6xQMNA4yhh9EMUTsAWVcrynSpP8V2BjxQQm`](https://explorer.solana.com/address/BXXw6N8Gc6xQMNA4yhh9EMUTsAWVcrynSpP8V2BjxQQm?cluster=devnet) |
| Series 0 vault | [`3C2mF1aBxCJ2GD7smWAzRGakzo3PHeaF66Boh1aonSKq`](https://explorer.solana.com/address/3C2mF1aBxCJ2GD7smWAzRGakzo3PHeaF66Boh1aonSKq?cluster=devnet) |

The full list, including the short series used for redemption tests, is in [`idl/devnet.json`](idl/devnet.json).

## What the prototype does not do

- **No early exit.** A position cannot be sold before maturity.
- **No indexer.** History is read from recent transactions, so very old activity may not be listed.
- **Rupee depreciation is not solved.** The test bond is in test dollars. What currency a real bond uses is a decision for its issuer.
- **The Nepali text needs a native speaker's review** before it is shown to real users.

## How a real version would work

A licensed remittance company or the central bank would operate it. Workers would pay in local currency abroad and families would receive rupees as they do today; the blockchain would be the record-keeping and settlement layer behind the scenes.

Nepal Rastra Bank states that virtual currency, including stablecoins, is illegal in Nepal [7]. A real version would need regulatory approval. RemitRoot is offered as a model for regulators and licensed remittance operators to evaluate.

## Disclaimer

This is an educational prototype for a hackathon. It runs only on Solana devnet and local test validators, with a test token that has no value. It is not a financial product, not an offer, and not a promise of any return. It must not be used with real funds.

## Sources

Figures were checked on 9 October 2026. Figures from 2015 and 2016 are old and are labelled with their year.

1. Onlinekhabar, citing Nepal Rastra Bank: [remittances in 2025/26](https://english.onlinekhabar.com/remittances-nepal-2026.html)
2. ShareSansar: [Economic Survey estimate of remittances as a share of GDP](https://www.sharesansar.com/newsdetail/international-day-of-family-remittances-observed-spotlighting-migrant-workers-contribution-to-global-and-nepals-economy-2026-06-17); see also [Rising Nepal](https://risingnepaldaily.com/news/73512)
3. Nepal Economic Forum: [household use of remittances and the savings bonds](https://nepaleconomicforum.org/14261-2/)
4. The Himalayan Times: [Foreign employment savings bonds remain undersubscribed](https://thehimalayantimes.com/business/foreign-employment-savings-bonds-remain-undersubscribed)
5. The Himalayan Times: [Demand for FESBs subdued](https://thehimalayantimes.com/business/demand-for-fesbs-subdued)
6. Solana Foundation: [Stablecoins are reshaping remittances](https://solana.com/news/report-stablecoins-are-reshaping-remittances)
7. B360 Nepal: [Nepal Rastra Bank on virtual currency](https://b360nepal.com/cryptocurrency-networking-businesses-illegal-nrb/)

## Licence

MIT. See [`LICENSE`](LICENSE).
