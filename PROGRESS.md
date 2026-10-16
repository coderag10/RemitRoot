# Progress log

One entry per finished task: date, phase, what was done, what is next, any open problem.

## Program (Rust)

### 2026-10-11 · Phases 0–3, cut scope
Deadline is about a day away, so the program was built to a reduced scope.

- Anchor 1.1.2 workspace; `anchor-lang` and `anchor-spl` pinned to the CLI version.
- Instructions: `initialize`, `create_series`, `set_split_rule`, `send_remittance`, `redeem`, `withdraw_proceeds`.
- Tests are Rust + LiteSVM in `programs/remitroot/tests/flow.rs` (the default for this Anchor version), not TypeScript.

Changes from `05-architecture.md`:
- Cut: `claim_interest` (interest is paid inside `redeem`), `set_paused` and `Config.paused`, `repay`, `SplitRule.goal_amount`.
- No `repay` instruction: the issuer funds interest with a plain token transfer into the vault. `BondSeries.total_repaid` is replaced by `total_redeemed`.
- Added `BondSeries.proceeds_count`; vault is a PDA token account, seeds `["vault", series]`.
- `send_remittance` always creates the `Position` account, even at a 0% share (principal stays 0, saver count is not increased).
- Token accounts use the token interface, so `usd_mint` can be a classic SPL or Token-2022 mint.

Next: deploy to devnet, `scripts/` for setup, faucet and seed data.

### 2026-10-11 · Tests green, scripts written (Phase 4, before deploy)
- All 11 tests pass. First run failed 9 of 11 with a stack overflow in `send_remittance`; fixed by boxing the accounts.
- IDL and TypeScript types are committed in `idl/` for the app.
- `scripts/`: `setup-devnet.ts`, `faucet.ts`, `seed-demo.ts`, `run-flow.ts`. Run end to end on a local validator (set rule, send, withdraw, redeem).
- The JS client does not auto-fill `tokenProgram`; every call must pass it.

Next: deploy to devnet, run setup and seed, record addresses in the README.
Open problem: interest on a bond that matures in minutes is a fraction of a cent, so a live redemption shows about $0.00 interest.

### 2026-10-11 · Deployed to devnet (Phase 4)
- Program `4diHFDJAtmQXPvi7ePbozYJ7De76ChL3cGiBqWwcv2gT`, IDL uploaded on-chain. Upgrade authority and admin/issuer/mint authority: `ChD4iSPnY6y46zLwHhY3iZSUW1tAE3FortGnXjhTbfPy`.
- Setup, seed and one full flow run on devnet; addresses in `idl/devnet.json` and the README.
- Series 0 matures 2026-11-10. Create a short series before recording a live redemption.

Next: faucet route for demo mode once `app/` exists. Admin wallet is low on SOL (about 0.56).
Open problem: public devnet RPC returns 429s under script load; the app may want a Helius RPC.

### 2026-10-11 · Short demo series recorded
- Series 1 "Savings Bond Demo" (`2ndXf3Z2d2DcdpvDg9Hb4vWkhTKGGSZvPTKHtwmQQtGs`) added to `idl/devnet.json`. It has already matured (2026-10-11), so it takes no new savings.
- Its vault holds 30 tUSD from one send; no redemption was recorded. The flow script's worker key is generated in memory, so that position cannot be redeemed now.
- 11 tests still pass.

Next: Phase 5 app. Create a fresh short series (`yarn setup:devnet --maturity-minutes N`) right before recording a live redemption.

### 2026-10-11 · Redemption proven on devnet
- Series 2 (3-minute bond): set rule, send $200 at 15%, redeem after maturity all succeeded.
- First attempt on series 1 was refused with `VaultInsufficient`, as designed: the vault held principal only. `run-flow.ts` now pays $1 of interest into the vault before redeeming. One $30 test position is stranded in series 1.
- Scripts now default to the newest series that has not matured (series 0). The app should use series 0.

### 2026-10-16 · Program v2: full instruction set (rebuild)
The user asked for a proper rebuild of what had been cut for time. Branch `program/v2`.

- All nine instructions from `05-architecture.md`: `initialize`, `set_paused`, `create_series`, `set_split_rule`, `send_remittance`, `claim_interest`, `redeem`, `withdraw_proceeds`, `repay`.
- Added back: `Config.paused`, `BondSeries.total_repaid`, `Position.interest_claimed`, `SplitRule.goal_amount` plus `goal_kind` (0 none, 1 land, 2 school fees, 3 house, 4 other).
- A 0% transfer now creates no `Position`: the account is optional and must be passed only when something is saved (`PositionRequired`, `PositionNotNeeded`).
- New program id `GHmZ7YCiQNHJQZHTGZfK3oJBfjRWFspKU47HcWaGTiKj` (account layouts changed). The old keypair is kept as `target/deploy/remitroot-v1-keypair.json`.
- 34 tests in four files (`split`, `interest`, `issuer`, `access`) with a shared harness in `tests/common`. Every instruction has a happy path and at least one failure.

Changes from `05-architecture.md`:
- Pause blocks `set_split_rule`, `send_remittance` and `claim_interest`; `redeem` always works, so savers can exit after maturity.
- A matured series refuses savings, but a 0% family-only transfer still goes through.
- The family wallet must not be the default key or the worker.
- `BondSeries.saver_count` counts workers who ever saved (it does not drop at redemption). `total_redeemed` is kept beside `total_repaid`.
- `SplitRule.goal_kind` added so the app can label the goal.

Security checklist: every account checked by seeds, `has_one` or token mint/authority/program; signers on every privileged action; checked arithmetic; `save_bps <= 5000`; tests cover spending another user's token account, a fake vault, and claiming or redeeming someone else's position.

Next: scripts for v2, then the app rebuild on `app/v2`.

## App

### 2026-10-11 · Phase 5, reduced scope: core flow
Scope agreed with the user for the one-day deadline: landing, `/send` and `/bond/[id]`, English only.

- Next.js 16.4 (Turbopack, Cache Components on), Tailwind 4, wallet adapter, `@anchor-lang/core` 1.1.2.
- `/send`: split slider with live amounts and 12-month illustration, send, success panel with explorer link, savings card with redeem, family wallet card. The split rule is set in the same transaction as the send when it is new or changed.
- `/bond/[id]`: raised against cap, savers, vault against what is owed, use-of-funds list.
- Demo mode: practice keys generated in the browser. `/api/faucet` signs with a dedicated faucet key from `FAUCET_SECRET_KEY` and tops a wallet up to 1,000 test dollars and 0.006 SOL.
- All text is in `app/i18n/en.json`; the banner is in the root layout.
- Checked: `yarn lint` and `yarn build` clean. On a local validator, a script drove the app's own client code and the faucet route through faucet, three sends, early and unfunded redeem errors, and redeem; client interest matched the program to the unit. Bond reads checked against devnet.
- Not checked: the pages in a real browser, a connected wallet, and the faucet on devnet (no faucet key there yet).

Cut from Phase 5: `/family` and `/issuer` pages (family balance is on `/send`; issuer uses scripts), Nepali toggle, transaction history.

Open problems:
- Redeem fails with `VaultInsufficient` until interest is paid into the vault. Before a recorded redemption, create a short series, open `/send?series=N`, and pay interest in (as `run-flow.ts` does).
- A demo visitor costs the faucet about 0.01 SOL, so 0.3 SOL covers roughly 30 visitors.
- A local validator plus a Next build runs this 4 GB machine out of memory; run one at a time.

### 2026-10-11 · Phase 5 finished for the reduced scope
- Faucet wallet `GTinnxeun8bWNJq7UETrHa4fDmJu4p7VMXZqWrEaBfta` funded on devnet with 100,000 test dollars and 0.5 SOL. Its key is in `~/.config/solana/remitroot-faucet.json` and `app/.env.local` (git-ignored). Vercel will need `FAUCET_SECRET_KEY` set by hand.
- Browser check at 375px with Playwright (headless Chromium) against devnet: landing to a confirmed send in 4.5 s with no wallet; no console errors, no horizontal overflow. Then on series 3 (2.5-minute bond): send, wait for maturity, redeem refused while the vault held principal only, `yarn pay-interest`, redeem paid out.
- Fixes from the screenshots: balances refresh before the "Sent" panel shows; starting the demo on `/send?series=N` keeps the series; wallet button restyled; explorer link added for redemptions.
- New `scripts/pay-interest.ts` (`yarn pay-interest --series N --usd 1`).
- `playwright` is a dev dependency at the repo root (it landed there, not in `app/`). Chromium's missing system libraries are unpacked in `~/.cache/remitroot-chromium-libs`; run with `LD_LIBRARY_PATH` pointing at its `usr/lib/x86_64-linux-gnu`.

Not checked: a connected wallet (Phantom or similar) in a real browser; only demo mode was driven.

Recording a live redemption: `yarn setup:devnet --maturity-minutes 3 --name "..."`, open `/send?series=N`, "Try the demo", send, `yarn pay-interest --series N`, wait, redeem. Interest on a bond that short shows as $0.00.

Next: Phase 6 (ten clean runs, failure handling, Vercel deploy on approval).

### 2026-10-11 · Phase 6, local part: hardening and ten clean runs
- Ten full runs in a row (practice wallet, send, redeem) through the app at 375px against devnet, on series 5: all clean, 3 to 6 s from page load to confirmed send. Amounts covered 0%, 5% to 50% and odd cents; every figure on screen matched the split.
- First attempt (series 4) worked but was slowed to 8 to 13 s by 429s from the public devnet RPC. Fix: each page now reads its accounts in one batched request (was seven), and the faucet route in one (was five).
- Refresh mid-flow: the practice wallet is now kept in `sessionStorage` for the tab, so a refresh keeps the wallet and its savings. **Change from `05-architecture.md`**, which said memory only. It is cleared by "Leave demo" and when the tab closes.
- Faucet: 20 requests per 10 minutes per network address (best effort, per server instance), `maxDuration` 30 s.
- Messages checked: wallet with no SOL, rejected signature, expired transaction, faucet limit.
- `cargo fmt --check`, `cargo clippy --all-targets`, `yarn lint`, `yarn build`: zero warnings. The lockfile warning is gone (`turbopack.root` set to the repo root).
- Faucet wallet is at 0.30 SOL, about 30 more visitors. Top up with `yarn faucet GTinnxeun8bWNJq7UETrHa4fDmJu4p7VMXZqWrEaBfta --usd 0 --sol 0.5`. Admin has 2.99 SOL.

Not checked: connected-wallet mode in a real wallet.
Next: deploy to Vercel (needs approval), set `FAUCET_SECRET_KEY` there, repeat the ten runs on the public URL.

### 2026-10-11 · Phase 6 done: ten clean runs on the public URL
- App is live at https://remit-root-mocha.vercel.app (Vercel, root directory `app`, `FAUCET_SECRET_KEY` set there).
- Ten full runs in a row (practice wallet, send, redeem) at 375px against the public URL on series 6: all clean, 3.3 to 6.8 s from page load to confirmed send, no rate-limit messages. Refresh mid-flow kept the wallet in both runs that tried it.
- Faucet wallet is at 0.20 SOL, about 20 more visitors. Top up before judging: `yarn faucet GTinnxeun8bWNJq7UETrHa4fDmJu4p7VMXZqWrEaBfta --usd 0 --sol 0.5`.

Not checked: connected-wallet mode in a real wallet extension.
Next: Phase 7 (final README, pitch script, demo script). Phase 6b (Surfpool) is optional.

### 2026-10-11 · Phase 7: final README
- README rewritten: problem, solution, how it works, architecture diagram (Mermaid), accounts, instructions, rules, how to run, devnet addresses, limits of the prototype, path to real use, disclaimer, numbered sources. Every figure is from `09-facts-and-sources.md`; 2015 and 2016 figures carry their year.
- Added `LICENSE` (MIT, "RemitRoot contributors"); change the holder name if the team wants another.

Next: pitch script and technical demo script. Before submitting, open each source link and confirm it, as file 09 asks.

### 2026-10-13 · Phase 7: pitch deck and demo script
- `pitch/pitch-deck.md`: eight slides with on-screen text and the three-minute spoken script, demo shot list, words to avoid, judge questions.
- `pitch/demo-script.md`: technical demo in five parts with setup, commands, lines to show and a what-to-do table for failures.
- `pitch/` is git-ignored at the user's request, so these stay local.
- Faucet wallet is at 0.17 SOL; top it up before recording (command is in the demo script).

Next: user fills in team name on slide 8, confirms the source links, records and submits.

### 2026-10-16 · App v2: full Phase 5 on program v2 (rebuild)
Branch `app/v2` (on top of `program/v2`). Replaces the reduced app from 2026-10-11.

- Pages: `/`, `/send`, `/history`, `/family`, `/bond`, `/bond/[id]`, `/issuer` (withdraw with purpose, repay, admin pause). Bottom tab bar on phones, header links on wider screens.
- Nothing about the deployment is hard-coded: program id from the IDL; mint, token program and decimals from `Config`; series listed from chain, default is the newest open one. Faucet amounts are environment settings.
- Savings goal (kind and amount, stored in the rule) with progress and a transfers-to-goal estimate; claim interest; redeem; live interest ticking each second.
- History, family incoming transfers and bond activity are decoded from program events in recent transactions (no indexer).
- English and Nepali: 256 keys each; Nepali digits, month names and relative times are produced in code because browser locale data for Nepali is uneven.
- Data: TanStack Query with retries and back-off for public RPC rate limits; transaction status toasts with explorer links.
- New dependencies (approved): `@tanstack/react-query`, `vitest` (with its `vite` peer), `@playwright/test`. Playwright moved out of the root `package.json`.
- Tests: 27 unit tests (maths mirrors the program, formats, key and placeholder parity, error mapping, event decoding). Playwright in `app/e2e`: 8 tests passed against a local validator at 375px, including the full demo flow, refresh mid-flow, family view, 0% transfer, input problems, savings goal, the Nepali toggle and no sideways scrolling on any page. The redemption test needs a short series and has not been run yet.

Nepali strings to check with a native speaker (my choices; please confirm or correct):
- `tagline`: "हरेक पठाइ बाँडिन्छ। एक भाग जरा गाड्छ।" ("takes root" as जरा गाड्छ)
- "बचतपत्र" for savings bond (the word in the official वैदेशिक रोजगार बचतपत्र), "कोष" for the vault, "जारीकर्ता" for issuer
- "बाँडफाँड" for the split, "पठाइ" for one transfer, "परिपक्व" for matured
- "फसेट" (faucet, transliterated), "अभ्यास वालेट" (practice wallet)
- `landing.why.2`: the 2015 bond fact; please check it reads naturally and keeps the meaning exactly
- `savings.claimNothing` uses "लिनलायक"

Open problems:
- The local validator, the app server and a browser together exhaust this 4 GB machine; browser tests now run against devnet instead.
- Connected-wallet mode still untested in a real wallet extension.

Next: deploy program v2 to devnet (needs about 1.4 more devnet SOL; airdrops were rate-limited), initialise with the existing test mint, seed, run the browser tests against devnet, update the README.

### 2026-10-16 · Program v2 on devnet; app v2 tested against it
- Old program `4diHF…v2gT` closed with the user's approval to reclaim 1.84 SOL (devnet airdrops were rate-limited). The old live site stops working until `app/v2` is merged and Vercel redeploys.
- v2 deployed as `GHmZ7YCiQNHJQZHTGZfK3oJBfjRWFspKU47HcWaGTiKj`, IDL uploaded on-chain. Config uses the existing test mint `6KXv…7Rku`, so the faucet wallet's stock still works. Series 0 "Savings Bond 2026-A" (30 days) seeded with six savers, two uses of funds and one repayment. Faucet wallet topped up by 0.5 SOL.
- Browser tests against devnet at 375px: all 9 pass, including redemption (send into a 4-minute bond, refusal while the vault holds principal only, issuer `repay`, redeem).
- Fixes found by those runs: the header overflowed narrow phones once a wallet was open; the app judged maturity by the device clock, but devnet's chain clock trails wall time, so Redeem was offered early. The app now runs its clock at chain time (Clock sysvar), and `yarn flow` waits on the chain clock.
- Admin wallet: about 2.0 devnet SOL left.

Next: user pushes `app/v2`, merges `program/v2` then `app/v2` into `main`, Vercel redeploys; then ten runs on the public URL (`BASE_URL=<url> yarn e2e`).

## Ideas (out of scope for now)

- Early exit: list and buy a position before maturity (stretch).
