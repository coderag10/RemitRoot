#![allow(clippy::result_large_err)]

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

const START_TS: i64 = 1_800_000_000;
const YEAR: i64 = 31_536_000;
/// One test dollar (6 decimals).
const USD: u64 = 1_000_000;

struct Env {
    svm: LiteSVM,
    admin: Keypair,
    issuer: Keypair,
    mint: Pubkey,
    config: Pubkey,
    series: Pubkey,
    vault: Pubkey,
}

struct Worker {
    kp: Keypair,
    token: Pubkey,
    recipient: Pubkey,
    recipient_token: Pubkey,
    rule: Pubkey,
    position: Pubkey,
}

fn pda(seeds: &[&[u8]]) -> Pubkey {
    Pubkey::find_program_address(seeds, &remitroot::id()).0
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

fn set_token_account(svm: &mut LiteSVM, address: Pubkey, mint: Pubkey, owner: Pubkey, amount: u64) {
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

fn balance(svm: &LiteSVM, token_account: Pubkey) -> u64 {
    let data = svm.get_account(&token_account).unwrap().data;
    u64::from_le_bytes(data[64..72].try_into().unwrap())
}

fn load<T: AccountDeserialize>(svm: &LiteSVM, address: Pubkey) -> T {
    let account = svm.get_account(&address).unwrap();
    T::try_deserialize(&mut account.data.as_slice()).unwrap()
}

fn warp(svm: &mut LiteSVM, ts: i64) {
    let mut clock = svm.get_sysvar::<Clock>();
    clock.unix_timestamp = ts;
    svm.set_sysvar(&clock);
}

fn send(
    svm: &mut LiteSVM,
    ix: Instruction,
    signer: &Keypair,
) -> Result<(), FailedTransactionMetadata> {
    svm.expire_blockhash();
    let msg = Message::new_with_blockhash(&[ix], Some(&signer.pubkey()), &svm.latest_blockhash());
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[signer]).unwrap();
    svm.send_transaction(tx).map(|_| ())
}

fn assert_err(res: Result<(), FailedTransactionMetadata>, name: &str) {
    let failure = res.expect_err("transaction should have failed");
    let logs = failure.meta.logs.join("\n");
    assert!(logs.contains(name), "expected {name}, got:\n{logs}");
}

fn create_series_ix(
    env: &Env,
    admin: Pubkey,
    id: u64,
    coupon_bps: u16,
    maturity_ts: i64,
    cap: u64,
) -> Instruction {
    let series = pda(&[SERIES_SEED, &id.to_le_bytes()]);
    Instruction::new_with_bytes(
        remitroot::id(),
        &remitroot::instruction::CreateSeries {
            name: "Savings Bond 2026-A".to_string(),
            coupon_bps,
            maturity_ts,
            cap,
        }
        .data(),
        remitroot::accounts::CreateSeries {
            admin,
            config: env.config,
            issuer: env.issuer.pubkey(),
            series,
            vault: pda(&[VAULT_SEED, series.as_ref()]),
            usd_mint: env.mint,
            token_program: TOKEN_PROGRAM_ID,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    )
}

/// Program deployed, config initialised, one series: 9% a year, one year to maturity.
fn setup(cap: u64) -> Env {
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

    let config = pda(&[CONFIG_SEED]);
    let series = pda(&[SERIES_SEED, &0u64.to_le_bytes()]);
    let vault = pda(&[VAULT_SEED, series.as_ref()]);
    let mut env = Env {
        svm,
        admin,
        issuer,
        mint,
        config,
        series,
        vault,
    };

    let ix = Instruction::new_with_bytes(
        remitroot::id(),
        &remitroot::instruction::Initialize {}.data(),
        remitroot::accounts::Initialize {
            admin: env.admin.pubkey(),
            config,
            usd_mint: mint,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    );
    let admin = env.admin.insecure_clone();
    send(&mut env.svm, ix, &admin).unwrap();
    let ix = create_series_ix(&env, admin.pubkey(), 0, 900, START_TS + YEAR, cap);
    send(&mut env.svm, ix, &admin).unwrap();
    env
}

fn new_worker(env: &mut Env, funds: u64) -> Worker {
    let kp = Keypair::new();
    env.svm.airdrop(&kp.pubkey(), 10_000_000_000).unwrap();
    let token = Pubkey::new_unique();
    let recipient = Pubkey::new_unique();
    let recipient_token = Pubkey::new_unique();
    set_token_account(&mut env.svm, token, env.mint, kp.pubkey(), funds);
    set_token_account(&mut env.svm, recipient_token, env.mint, recipient, 0);
    Worker {
        rule: pda(&[RULE_SEED, kp.pubkey().as_ref()]),
        position: pda(&[POSITION_SEED, kp.pubkey().as_ref(), env.series.as_ref()]),
        kp,
        token,
        recipient,
        recipient_token,
    }
}

fn set_rule(env: &mut Env, w: &Worker, save_bps: u16) -> Result<(), FailedTransactionMetadata> {
    let ix = Instruction::new_with_bytes(
        remitroot::id(),
        &remitroot::instruction::SetSplitRule {
            recipient: w.recipient,
            save_bps,
        }
        .data(),
        remitroot::accounts::SetSplitRule {
            worker: w.kp.pubkey(),
            rule: w.rule,
            series: env.series,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    );
    send(&mut env.svm, ix, &w.kp)
}

fn remit_to(
    env: &mut Env,
    w: &Worker,
    amount: u64,
    recipient_token: Pubkey,
) -> Result<(), FailedTransactionMetadata> {
    let ix = Instruction::new_with_bytes(
        remitroot::id(),
        &remitroot::instruction::SendRemittance { amount }.data(),
        remitroot::accounts::SendRemittance {
            worker: w.kp.pubkey(),
            config: env.config,
            rule: w.rule,
            series: env.series,
            position: w.position,
            usd_mint: env.mint,
            worker_token: w.token,
            recipient_token,
            vault: env.vault,
            token_program: TOKEN_PROGRAM_ID,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    );
    send(&mut env.svm, ix, &w.kp)
}

fn remit(env: &mut Env, w: &Worker, amount: u64) -> Result<(), FailedTransactionMetadata> {
    remit_to(env, w, amount, w.recipient_token)
}

fn redeem(env: &mut Env, w: &Worker) -> Result<(), FailedTransactionMetadata> {
    let ix = Instruction::new_with_bytes(
        remitroot::id(),
        &remitroot::instruction::Redeem {}.data(),
        remitroot::accounts::Redeem {
            worker: w.kp.pubkey(),
            config: env.config,
            series: env.series,
            position: w.position,
            usd_mint: env.mint,
            worker_token: w.token,
            vault: env.vault,
            token_program: TOKEN_PROGRAM_ID,
        }
        .to_account_metas(None),
    );
    send(&mut env.svm, ix, &w.kp)
}

fn withdraw(
    env: &mut Env,
    signer: &Keypair,
    signer_token: Pubkey,
    amount: u64,
    purpose: &str,
) -> Result<(), FailedTransactionMetadata> {
    let index = load::<BondSeries>(&env.svm, env.series).proceeds_count;
    let ix = Instruction::new_with_bytes(
        remitroot::id(),
        &remitroot::instruction::WithdrawProceeds {
            amount,
            purpose: purpose.to_string(),
        }
        .data(),
        remitroot::accounts::WithdrawProceeds {
            issuer: signer.pubkey(),
            config: env.config,
            series: env.series,
            record: pda(&[PROCEEDS_SEED, env.series.as_ref(), &index.to_le_bytes()]),
            usd_mint: env.mint,
            issuer_token: signer_token,
            vault: env.vault,
            token_program: TOKEN_PROGRAM_ID,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    );
    send(&mut env.svm, ix, signer)
}

/// Sends `amount` at `save_bps` and checks every balance and counter.
fn check_split(save_bps: u16, amount: u64, expected_saved: u64) {
    let mut env = setup(1_000_000 * USD);
    let w = new_worker(&mut env, amount);
    set_rule(&mut env, &w, save_bps).unwrap();
    remit(&mut env, &w, amount).unwrap();

    let family = balance(&env.svm, w.recipient_token);
    let saved = balance(&env.svm, env.vault);
    assert_eq!(saved, expected_saved);
    assert_eq!(family + saved, amount, "nothing may be lost to rounding");
    assert_eq!(balance(&env.svm, w.token), 0);

    let rule: SplitRule = load(&env.svm, w.rule);
    assert_eq!(
        (rule.total_sent, rule.total_saved, rule.transfer_count),
        (amount, saved, 1)
    );
    let position: Position = load(&env.svm, w.position);
    assert_eq!(position.principal, saved);
    let series: BondSeries = load(&env.svm, env.series);
    assert_eq!(series.total_principal, saved);
    assert_eq!(series.saver_count, u32::from(saved > 0));
}

#[test]
fn split_15_percent() {
    check_split(1_500, 200 * USD, 30 * USD);
}

#[test]
fn split_zero_percent_sends_everything_to_family() {
    check_split(0, 200 * USD, 0);
}

#[test]
fn split_50_percent() {
    check_split(5_000, 200 * USD, 100 * USD);
}

#[test]
fn split_rounds_down_on_odd_amounts() {
    // 333_333 * 15% = 49_999.95
    check_split(1_500, 333_333, 49_999);
    check_split(1, 9_999, 0);
}

#[test]
fn save_share_over_50_percent_rejected() {
    let mut env = setup(1_000_000 * USD);
    let w = new_worker(&mut env, 0);
    assert_err(set_rule(&mut env, &w, 5_001), "SaveShareTooHigh");
}

#[test]
fn wrong_recipient_token_account_rejected() {
    let mut env = setup(1_000_000 * USD);
    let w = new_worker(&mut env, 200 * USD);
    set_rule(&mut env, &w, 1_500).unwrap();
    let stranger_token = Pubkey::new_unique();
    set_token_account(
        &mut env.svm,
        stranger_token,
        env.mint,
        Pubkey::new_unique(),
        0,
    );
    assert_err(
        remit_to(&mut env, &w, 200 * USD, stranger_token),
        "ConstraintTokenOwner",
    );
    assert_eq!(balance(&env.svm, w.token), 200 * USD);
}

#[test]
fn cap_and_zero_amount_enforced() {
    let mut env = setup(50 * USD);
    let w = new_worker(&mut env, 1_000 * USD);
    set_rule(&mut env, &w, 5_000).unwrap();
    assert_err(remit(&mut env, &w, 0), "ZeroAmount");
    remit(&mut env, &w, 100 * USD).unwrap(); // saves exactly the cap
    assert_err(remit(&mut env, &w, 2), "CapExceeded");
}

#[test]
fn matured_series_takes_no_new_savings() {
    let mut env = setup(1_000_000 * USD);
    let w = new_worker(&mut env, 200 * USD);
    set_rule(&mut env, &w, 1_500).unwrap();
    warp(&mut env.svm, START_TS + YEAR);
    assert_err(remit(&mut env, &w, 200 * USD), "SeriesMatured");
}

#[test]
fn interest_accrues_before_top_up_stops_at_maturity_and_redeems() {
    let mut env = setup(1_000_000 * USD);
    let w = new_worker(&mut env, 400 * USD);
    set_rule(&mut env, &w, 5_000).unwrap();

    remit(&mut env, &w, 200 * USD).unwrap(); // principal 100
    warp(&mut env.svm, START_TS + YEAR / 2);
    remit(&mut env, &w, 200 * USD).unwrap(); // principal 200
    let position: Position = load(&env.svm, w.position);
    // Half a year at 9% on the old principal of 100, not on 200.
    assert_eq!(position.accrued_interest, 4_500_000);
    assert_eq!(position.principal, 200 * USD);

    assert_err(redeem(&mut env, &w), "NotMatured");

    // Far past maturity: only the second half-year counts, on 200.
    warp(&mut env.svm, START_TS + 5 * YEAR);
    let interest = 4_500_000 + 9_000_000;
    // The vault holds principal only until the issuer funds the interest.
    assert_err(redeem(&mut env, &w), "VaultInsufficient");
    let vault = env.vault;
    set_token_account(
        &mut env.svm,
        vault,
        env.mint,
        env.series,
        200 * USD + interest,
    );

    redeem(&mut env, &w).unwrap();
    assert_eq!(balance(&env.svm, w.token), 200 * USD + interest);
    assert_eq!(balance(&env.svm, env.vault), 0);
    let series: BondSeries = load(&env.svm, env.series);
    assert_eq!(
        (series.total_redeemed, series.interest_paid),
        (200 * USD, interest)
    );

    // Position is closed, so a second redeem cannot pay again.
    assert_err(redeem(&mut env, &w), "AccountNotInitialized");
}

#[test]
fn only_issuer_withdraws_and_never_more_than_the_vault() {
    let mut env = setup(1_000_000 * USD);
    let w = new_worker(&mut env, 200 * USD);
    set_rule(&mut env, &w, 5_000).unwrap();
    remit(&mut env, &w, 200 * USD).unwrap();

    let issuer = env.issuer.insecure_clone();
    let issuer_token = Pubkey::new_unique();
    set_token_account(&mut env.svm, issuer_token, env.mint, issuer.pubkey(), 0);

    // The worker tries to take the vault into their own account.
    assert_err(
        withdraw(&mut env, &w.kp, w.token, 10 * USD, "theft"),
        "NotIssuer",
    );
    assert_err(
        withdraw(&mut env, &issuer, issuer_token, 101 * USD, "too much"),
        "VaultInsufficient",
    );
    assert_err(
        withdraw(&mut env, &issuer, issuer_token, 10 * USD, ""),
        "InvalidPurpose",
    );

    withdraw(
        &mut env,
        &issuer,
        issuer_token,
        60 * USD,
        "Hydropower project, tranche 1",
    )
    .unwrap();
    assert_eq!(balance(&env.svm, issuer_token), 60 * USD);
    assert_eq!(balance(&env.svm, env.vault), 40 * USD);
    let record: ProceedsRecord = load(
        &env.svm,
        pda(&[PROCEEDS_SEED, env.series.as_ref(), &0u32.to_le_bytes()]),
    );
    assert_eq!(
        (record.amount, record.purpose.as_str()),
        (60 * USD, "Hydropower project, tranche 1")
    );
    let series: BondSeries = load(&env.svm, env.series);
    assert_eq!(
        (series.total_withdrawn, series.proceeds_count),
        (60 * USD, 1)
    );
}

#[test]
fn only_admin_creates_series() {
    let mut env = setup(1_000_000 * USD);
    let stranger = Keypair::new();
    env.svm.airdrop(&stranger.pubkey(), 10_000_000_000).unwrap();
    let ix = create_series_ix(&env, stranger.pubkey(), 1, 900, START_TS + YEAR, USD);
    assert_err(send(&mut env.svm, ix, &stranger), "NotAdmin");
}
