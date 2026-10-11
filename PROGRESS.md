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

## App

## Ideas (out of scope for now)

- `claim_interest`, `repay`, `set_paused`, savings goal, early exit.
