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

## App

## Ideas (out of scope for now)

- `claim_interest`, `repay`, `set_paused`, savings goal, early exit.
