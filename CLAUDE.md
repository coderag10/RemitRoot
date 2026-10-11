# RemitRoot: instructions for Claude Code

## What this project is

RemitRoot is an **educational prototype** for a hackathon. A migrant worker sends a remittance; an on-chain rule splits it: most goes to the family, a chosen share buys a tokenised savings bond. It runs on **Solana devnet with valueless test tokens**.

Tagline: *Every transfer splits. Part takes root.*

## Read before working

1. `essentials/04-product-spec.md`: scope
2. `essentials/05-architecture.md`: design
3. `essentials/06-build-plan.md`: the current phase and its acceptance criteria
4. `PROGRESS.md`: where the last session stopped

## Hard rules (never break)

1. **Devnet and localnet only.** Never configure, deploy to, or send transactions on public mainnet. Never add a public mainnet RPC URL to the app or scripts.
2. **No real assets.** Use only the project's own test mint (`tUSD`). Never integrate real exchanges, on-ramps or off-ramps.
   - **One exception, Phase 6b only:** a local Surfpool simulation may copy mainnet state, including the USDC mint, onto this machine. Balances there are simulated. Before every deploy or transaction in that phase, confirm the RPC URL is `127.0.0.1` or `localhost`. Keep `usd_mint` a configurable field so the same program works with `tUSD` on devnet and the USDC mint in simulation.
3. **Never read, print or commit private keys**, seed phrases or `.env` files.
4. **Every app screen shows the banner:** "Educational prototype · Solana test network · No real money".
5. **Do not invent facts or statistics.** Any number shown in the app, README or pitch must come from `essentials/09-facts-and-sources.md`.
6. **Stay in scope.** If something is not in the spec or the current phase, write it under "Ideas" in `PROGRESS.md` and do not build it.

## How to work

- Work on **one phase at a time**, and one task within it at a time.
- Before coding a task, state the plan in a few lines. For program changes, list the accounts and checks first.
- After each task: run the tests, commit, append an entry to `PROGRESS.md`.
- If a command fails twice the same way, stop and explain; do not loop.
- If the installed tool version differs from what you expect, trust the installed version. Run `anchor --version` and `solana --version`, and read the official docs (https://solana.com/llms.txt, https://www.anchor-lang.com) rather than relying on memory. Anchor is 1.x; the TypeScript package is no longer `@coral-xyz/anchor`.
- Ask the user before: deploying, airdropping, installing a new dependency, pushing to GitHub, or deleting files.

## Stack

- Program: Rust with Anchor 1.x, in `programs/remitroot`
- Tests: Rust with LiteSVM via `anchor test`, in `programs/remitroot/tests/`
- App: Next.js (App Router), TypeScript, Tailwind CSS, in `app/`
- Wallet: Solana wallet adapter, plus a "demo mode" using generated devnet keypairs
- Package manager: yarn

## Commands

```bash
anchor build                 # compile the program
anchor test                  # run program tests locally
cargo fmt && cargo clippy    # format and lint Rust
cd app && yarn dev           # run the web app
cd app && yarn build         # production build check
cd app && yarn lint
```

## Program security checklist (apply to every instruction)

- Every account is validated: owner, seeds and bump, mint, authority.
- Signers are checked for every privileged action.
- All arithmetic uses checked operations; no silent overflow or truncation.
- Basis points are bounded (`save_bps <= 5000`).
- Token accounts are verified to belong to the expected mint and owner.
- No instruction lets one user move another user's funds.
- Each instruction has a happy-path test and at least one failing test.

## Code style

- Small files: one instruction per file under `instructions/`.
- Custom errors with clear messages; no bare `unwrap()` in program code.
- Emit an event for every state change the app needs to display.
- App text goes through a translation file so English and Nepali stay in sync.
- Commit messages: `feat:`, `fix:`, `test:`, `docs:`, `chore:`.

## Definition of done for a task

Tests pass, lint passes, committed, `PROGRESS.md` updated, no hard rule broken.
