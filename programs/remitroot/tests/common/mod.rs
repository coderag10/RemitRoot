//! Shared LiteSVM harness: a deployed program, a config, one series, and helpers that build
//! each instruction the way a client would.
#![allow(dead_code, clippy::result_large_err)]

use {
    anchor_lang::{
        prelude::Pubkey,
        solana_program::{instruction::Instruction, system_program},
        AccountDeserialize, InstructionData, ToAccountMetas,
    },
    anchor_spl::token::ID as TOKEN_PROGRAM_ID,
    litesvm::{types::FailedTransactionMetadata, LiteSVM},
    remitroot::{constants::*, state::*},
    solana_account::Account,
    solana_clock::Clock,
    solana_keypair::Keypair,
    solana_message::{Message, VersionedMessage},
    solana_signer::Signer,
    solana_transaction::versioned::VersionedTransaction,
};

#[allow(unused_imports)]
pub use {anchor_lang::prelude::Pubkey as Key, solana_keypair::Keypair as Kp};

pub const START_TS: i64 = 1_800_000_000;
pub const YEAR: i64 = 31_536_000;
/// One test dollar (6 decimals).
pub const USD: u64 = 1_000_000;
/// The default series: 9% a year, one year to maturity.
pub const COUPON_BPS: u16 = 900;

pub type TxResult = Result<(), FailedTransactionMetadata>;

pub struct Env {
    pub svm: LiteSVM,
    pub admin: Keypair,
    pub issuer: Keypair,
    pub issuer_token: Pubkey,
    pub mint: Pubkey,
    pub config: Pubkey,
    pub series: Pubkey,
    pub vault: Pubkey,
}

pub struct Worker {
    pub kp: Keypair,
    pub token: Pubkey,
    pub recipient: Pubkey,
    pub recipient_token: Pubkey,
    pub rule: Pubkey,
    pub position: Pubkey,
}

pub fn pda(seeds: &[&[u8]]) -> Pubkey {
    Pubkey::find_program_address(seeds, &remitroot::id()).0
}

pub fn series_pda(id: u64) -> Pubkey {
    pda(&[SERIES_SEED, &id.to_le_bytes()])
}

pub fn vault_pda(series: Pubkey) -> Pubkey {
    pda(&[VAULT_SEED, series.as_ref()])
}

fn set_mint(svm: &mut LiteSVM, mint: Pubkey) {
    let mut data = vec![0u8; 82];
    data[44] = 6; // decimals
    data[45] = 1; // is_initialized
    svm.set_account(
        mint,
        Account {
            lamports: svm.minimum_balance_for_rent_exemption(82),
            data,
            owner: TOKEN_PROGRAM_ID,
            executable: false,
            rent_epoch: 0,
        },
    )
    .unwrap();
}

/// Writes an initialised SPL token account holding `amount`.
pub fn set_token_account(
    svm: &mut LiteSVM,
    address: Pubkey,
    mint: Pubkey,
    owner: Pubkey,
    amount: u64,
) {
    let mut data = vec![0u8; 165];
    data[0..32].copy_from_slice(mint.as_ref());
    data[32..64].copy_from_slice(owner.as_ref());
    data[64..72].copy_from_slice(&amount.to_le_bytes());
    data[108] = 1; // state: initialized
    svm.set_account(
        address,
        Account {
            lamports: svm.minimum_balance_for_rent_exemption(165),
            data,
            owner: TOKEN_PROGRAM_ID,
            executable: false,
            rent_epoch: 0,
        },
    )
    .unwrap();
}

pub fn balance(svm: &LiteSVM, token_account: Pubkey) -> u64 {
    let data = svm.get_account(&token_account).unwrap().data;
    u64::from_le_bytes(data[64..72].try_into().unwrap())
}

pub fn load<T: AccountDeserialize>(svm: &LiteSVM, address: Pubkey) -> T {
    let account = svm.get_account(&address).unwrap();
    T::try_deserialize(&mut account.data.as_slice()).unwrap()
}

/// True when the account does not exist or was closed.
pub fn is_gone(svm: &LiteSVM, address: Pubkey) -> bool {
    svm.get_account(&address)
        .is_none_or(|account| account.lamports == 0 && account.data.is_empty())
}

pub fn warp(svm: &mut LiteSVM, ts: i64) {
    let mut clock = svm.get_sysvar::<Clock>();
    clock.unix_timestamp = ts;
    svm.set_sysvar(&clock);
}

pub fn send(svm: &mut LiteSVM, ix: Instruction, signer: &Keypair) -> TxResult {
    svm.expire_blockhash();
    let msg = Message::new_with_blockhash(&[ix], Some(&signer.pubkey()), &svm.latest_blockhash());
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[signer]).unwrap();
    svm.send_transaction(tx).map(|_| ())
}

/// Asserts the transaction failed and its logs name `name` (an error code or constraint).
pub fn assert_err(res: TxResult, name: &str) {
    let failure = res.expect_err("transaction should have failed");
    let logs = failure.meta.logs.join("\n");
    assert!(logs.contains(name), "expected {name}, got:\n{logs}");
}

fn ix(data: impl InstructionData, accounts: impl ToAccountMetas) -> Instruction {
    Instruction::new_with_bytes(
        remitroot::id(),
        &data.data(),
        accounts.to_account_metas(None),
    )
}

/// Interest the program books for `principal` held `seconds`, rounded down.
pub fn interest(principal: u64, seconds: i64) -> u64 {
    (u128::from(principal) * u128::from(COUPON_BPS) * seconds as u128 / (10_000 * YEAR as u128))
        as u64
}

impl Env {
    /// Program deployed and config initialised, no series yet.
    pub fn bare() -> Env {
        let mut svm = LiteSVM::new();
        let bytes = include_bytes!(concat!(
            env!("CARGO_TARGET_TMPDIR"),
            "/../deploy/remitroot.so"
        ));
        svm.add_program(remitroot::id(), bytes).unwrap();
        warp(&mut svm, START_TS);

        let admin = Keypair::new();
        let issuer = Keypair::new();
        svm.airdrop(&admin.pubkey(), 10_000_000_000).unwrap();
        svm.airdrop(&issuer.pubkey(), 10_000_000_000).unwrap();
        let mint = Pubkey::new_unique();
        set_mint(&mut svm, mint);
        let issuer_token = Pubkey::new_unique();
        set_token_account(&mut svm, issuer_token, mint, issuer.pubkey(), 0);

        let series = series_pda(0);
        let mut env = Env {
            svm,
            admin,
            issuer,
            issuer_token,
            mint,
            config: pda(&[CONFIG_SEED]),
            series,
            vault: vault_pda(series),
        };
        let admin = env.admin.insecure_clone();
        env.initialize(&admin).unwrap();
        env
    }

    /// Config plus series 0: 9% a year, one year to maturity, the given cap.
    pub fn new(cap: u64) -> Env {
        let mut env = Env::bare();
        let admin = env.admin.insecure_clone();
        env.create_series(
            &admin,
            "Savings Bond 2026-A",
            COUPON_BPS,
            START_TS + YEAR,
            cap,
        )
        .unwrap();
        env
    }

    pub fn initialize(&mut self, admin: &Keypair) -> TxResult {
        let ix = ix(
            remitroot::instruction::Initialize {},
            remitroot::accounts::Initialize {
                admin: admin.pubkey(),
                config: self.config,
                usd_mint: self.mint,
                system_program: system_program::ID,
            },
        );
        send(&mut self.svm, ix, admin)
    }

    pub fn config(&self) -> Config {
        load(&self.svm, self.config)
    }

    pub fn series(&self) -> BondSeries {
        load(&self.svm, self.series)
    }

    pub fn create_series(
        &mut self,
        admin: &Keypair,
        name: &str,
        coupon_bps: u16,
        maturity_ts: i64,
        cap: u64,
    ) -> TxResult {
        let id = self.config().series_count;
        let series = series_pda(id);
        let ix = ix(
            remitroot::instruction::CreateSeries {
                name: name.to_string(),
                coupon_bps,
                maturity_ts,
                cap,
            },
            remitroot::accounts::CreateSeries {
                admin: admin.pubkey(),
                config: self.config,
                issuer: self.issuer.pubkey(),
                series,
                vault: vault_pda(series),
                usd_mint: self.mint,
                token_program: TOKEN_PROGRAM_ID,
                system_program: system_program::ID,
            },
        );
        send(&mut self.svm, ix, admin)
    }

    pub fn set_paused(&mut self, admin: &Keypair, paused: bool) -> TxResult {
        let ix = ix(
            remitroot::instruction::SetPaused { paused },
            remitroot::accounts::SetPaused {
                admin: admin.pubkey(),
                config: self.config,
            },
        );
        send(&mut self.svm, ix, admin)
    }

    /// A worker with `funds` test dollars and a family wallet that already has a token account.
    pub fn worker(&mut self, funds: u64) -> Worker {
        let kp = Keypair::new();
        self.svm.airdrop(&kp.pubkey(), 10_000_000_000).unwrap();
        let token = Pubkey::new_unique();
        let recipient = Pubkey::new_unique();
        let recipient_token = Pubkey::new_unique();
        set_token_account(&mut self.svm, token, self.mint, kp.pubkey(), funds);
        set_token_account(&mut self.svm, recipient_token, self.mint, recipient, 0);
        Worker {
            rule: pda(&[RULE_SEED, kp.pubkey().as_ref()]),
            position: pda(&[POSITION_SEED, kp.pubkey().as_ref(), self.series.as_ref()]),
            kp,
            token,
            recipient,
            recipient_token,
        }
    }

    pub fn set_rule_full(
        &mut self,
        w: &Worker,
        recipient: Pubkey,
        save_bps: u16,
        series: Pubkey,
        goal_amount: u64,
        goal_kind: u8,
    ) -> TxResult {
        let ix = ix(
            remitroot::instruction::SetSplitRule {
                recipient,
                save_bps,
                goal_amount,
                goal_kind,
            },
            remitroot::accounts::SetSplitRule {
                worker: w.kp.pubkey(),
                config: self.config,
                rule: w.rule,
                series,
                system_program: system_program::ID,
            },
        );
        send(&mut self.svm, ix, &w.kp)
    }

    pub fn set_rule(&mut self, w: &Worker, save_bps: u16) -> TxResult {
        self.set_rule_full(w, w.recipient, save_bps, self.series, 0, 0)
    }

    /// `send_remittance` with every account chosen by the caller.
    pub fn remit_with(
        &mut self,
        w: &Worker,
        amount: u64,
        position: Option<Pubkey>,
        worker_token: Pubkey,
        recipient_token: Pubkey,
        vault: Pubkey,
    ) -> TxResult {
        let ix = ix(
            remitroot::instruction::SendRemittance { amount },
            remitroot::accounts::SendRemittance {
                worker: w.kp.pubkey(),
                config: self.config,
                rule: w.rule,
                series: self.series,
                position,
                usd_mint: self.mint,
                worker_token,
                recipient_token,
                vault,
                token_program: TOKEN_PROGRAM_ID,
                system_program: system_program::ID,
            },
        );
        send(&mut self.svm, ix, &w.kp)
    }

    /// Sends the way the app does: the position is passed only when something is saved.
    pub fn remit(&mut self, w: &Worker, amount: u64) -> TxResult {
        let rule: SplitRule = load(&self.svm, w.rule);
        let saves = u128::from(amount) * u128::from(rule.save_bps) / 10_000 > 0;
        let position = saves.then_some(w.position);
        self.remit_with(w, amount, position, w.token, w.recipient_token, self.vault)
    }

    pub fn claim(&mut self, w: &Worker) -> TxResult {
        self.claim_as(w, &w.kp.insecure_clone(), w.token)
    }

    /// `claim_interest` signed by `signer` against `w`'s position.
    pub fn claim_as(&mut self, w: &Worker, signer: &Keypair, to: Pubkey) -> TxResult {
        let ix = ix(
            remitroot::instruction::ClaimInterest {},
            remitroot::accounts::ClaimInterest {
                worker: signer.pubkey(),
                config: self.config,
                series: self.series,
                position: w.position,
                usd_mint: self.mint,
                worker_token: to,
                vault: self.vault,
                token_program: TOKEN_PROGRAM_ID,
            },
        );
        send(&mut self.svm, ix, signer)
    }

    pub fn redeem(&mut self, w: &Worker) -> TxResult {
        self.redeem_as(w, &w.kp.insecure_clone(), w.token)
    }

    pub fn redeem_as(&mut self, w: &Worker, signer: &Keypair, to: Pubkey) -> TxResult {
        let ix = ix(
            remitroot::instruction::Redeem {},
            remitroot::accounts::Redeem {
                worker: signer.pubkey(),
                config: self.config,
                series: self.series,
                position: w.position,
                usd_mint: self.mint,
                worker_token: to,
                vault: self.vault,
                token_program: TOKEN_PROGRAM_ID,
            },
        );
        send(&mut self.svm, ix, signer)
    }

    pub fn withdraw(
        &mut self,
        signer: &Keypair,
        to: Pubkey,
        amount: u64,
        purpose: &str,
    ) -> TxResult {
        let index = self.series().proceeds_count;
        let ix = ix(
            remitroot::instruction::WithdrawProceeds {
                amount,
                purpose: purpose.to_string(),
            },
            remitroot::accounts::WithdrawProceeds {
                issuer: signer.pubkey(),
                config: self.config,
                series: self.series,
                record: self.record(index),
                usd_mint: self.mint,
                issuer_token: to,
                vault: self.vault,
                token_program: TOKEN_PROGRAM_ID,
                system_program: system_program::ID,
            },
        );
        send(&mut self.svm, ix, signer)
    }

    pub fn issuer_withdraw(&mut self, amount: u64, purpose: &str) -> TxResult {
        let issuer = self.issuer.insecure_clone();
        let to = self.issuer_token;
        self.withdraw(&issuer, to, amount, purpose)
    }

    pub fn repay(&mut self, signer: &Keypair, from: Pubkey, amount: u64) -> TxResult {
        let ix = ix(
            remitroot::instruction::Repay { amount },
            remitroot::accounts::Repay {
                issuer: signer.pubkey(),
                config: self.config,
                series: self.series,
                usd_mint: self.mint,
                issuer_token: from,
                vault: self.vault,
                token_program: TOKEN_PROGRAM_ID,
            },
        );
        send(&mut self.svm, ix, signer)
    }

    /// The issuer tops up its own token account, then repays `amount` into the vault.
    pub fn issuer_repay(&mut self, amount: u64) -> TxResult {
        let held = balance(&self.svm, self.issuer_token);
        let (to, mint, owner) = (self.issuer_token, self.mint, self.issuer.pubkey());
        set_token_account(&mut self.svm, to, mint, owner, held + amount);
        let issuer = self.issuer.insecure_clone();
        self.repay(&issuer, to, amount)
    }

    pub fn record(&self, index: u32) -> Pubkey {
        pda(&[PROCEEDS_SEED, self.series.as_ref(), &index.to_le_bytes()])
    }

    /// A token account of the test dollar for a fresh owner, holding `amount`.
    pub fn token_for(&mut self, owner: Pubkey, amount: u64) -> Pubkey {
        let address = Pubkey::new_unique();
        let mint = self.mint;
        set_token_account(&mut self.svm, address, mint, owner, amount);
        address
    }
}
