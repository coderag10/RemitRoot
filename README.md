# RemitRoot

*Every transfer splits. Part takes root.*

> **Educational prototype · Solana test network · No real money**

RemitRoot puts saving inside the remittance. A worker sets a rule once; every transfer after that splits in a single transaction: most goes to the family, a chosen share (0–50%) buys a savings bond held on-chain.

## Layout

```
programs/remitroot/        Anchor program (Rust)
programs/remitroot/tests/  Program tests (Rust, LiteSVM)
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

## Disclaimer

This is an educational prototype for a hackathon. It runs only on Solana devnet and local test validators, with a test token that has no value. It is not a financial product and must not be used with real funds.
