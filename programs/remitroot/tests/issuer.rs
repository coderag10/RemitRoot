//! `create_series`, `withdraw_proceeds` and `repay`.
mod common;

use common::*;
use remitroot::state::*;
use solana_signer::Signer;

#[test]
fn create_series_stores_its_terms_and_vault() {
    let env = Env::new(50_000 * USD);
    let series = env.series();
    assert_eq!(series.id, 0);
    assert_eq!(series.issuer, env.issuer.pubkey());
    assert_eq!(series.name, "Savings Bond 2026-A");
    assert_eq!((series.coupon_bps, series.cap), (COUPON_BPS, 50_000 * USD));
    assert_eq!(
        (series.start_ts, series.maturity_ts),
        (START_TS, START_TS + YEAR)
    );
    assert_eq!(series.vault, env.vault);
    assert_eq!(env.config().series_count, 1);
}

#[test]
fn create_series_validates_its_terms() {
    let mut env = Env::bare();
    let admin = env.admin.insecure_clone();
    let later = START_TS + YEAR;
    assert_err(
        env.create_series(&admin, "", 900, later, USD),
        "InvalidName",
    );
    assert_err(
        env.create_series(&admin, "   ", 900, later, USD),
        "InvalidName",
    );
    let long = "x".repeat(33);
    assert_err(
        env.create_series(&admin, &long, 900, later, USD),
        "InvalidName",
    );
    assert_err(
        env.create_series(&admin, "Bond", 10_001, later, USD),
        "CouponTooHigh",
    );
    assert_err(
        env.create_series(&admin, "Bond", 900, START_TS, USD),
        "InvalidMaturity",
    );
    assert_err(
        env.create_series(&admin, "Bond", 900, later, 0),
        "ZeroAmount",
    );
    assert_eq!(env.config().series_count, 0);
}

#[test]
fn only_admin_creates_series() {
    let mut env = Env::bare();
    let stranger = Kp::new();
    env.svm.airdrop(&stranger.pubkey(), 1_000_000_000).unwrap();
    assert_err(
        env.create_series(&stranger, "Fake", 900, START_TS + YEAR, USD),
        "NotAdmin",
    );
}

#[test]
fn withdraw_records_amount_and_purpose() {
    let mut env = Env::new(1_000_000 * USD);
    let w = env.worker(200 * USD);
    env.set_rule(&w, 5_000).unwrap();
    env.remit(&w, 200 * USD).unwrap();

    warp(&mut env.svm, START_TS + 100);
    env.issuer_withdraw(60 * USD, "Hydropower project, tranche 1")
        .unwrap();
    env.issuer_withdraw(15 * USD, "School construction")
        .unwrap();

    assert_eq!(balance(&env.svm, env.issuer_token), 75 * USD);
    assert_eq!(balance(&env.svm, env.vault), 25 * USD);
    let series = env.series();
    assert_eq!(
        (series.total_withdrawn, series.proceeds_count),
        (75 * USD, 2)
    );
    let first: ProceedsRecord = load(&env.svm, env.record(0));
    assert_eq!(first.index, 0);
    assert_eq!(first.amount, 60 * USD);
    assert_eq!(first.purpose, "Hydropower project, tranche 1");
    assert_eq!(first.ts, START_TS + 100);
    assert_eq!(first.series, env.series);
}

#[test]
fn only_issuer_withdraws_and_never_more_than_the_vault() {
    let mut env = Env::new(1_000_000 * USD);
    let w = env.worker(200 * USD);
    env.set_rule(&w, 5_000).unwrap();
    env.remit(&w, 200 * USD).unwrap();

    let stranger = Kp::new();
    env.svm.airdrop(&stranger.pubkey(), 1_000_000_000).unwrap();
    let stranger_token = env.token_for(stranger.pubkey(), 0);
    assert_err(
        env.withdraw(&stranger, stranger_token, USD, "Theft"),
        "NotIssuer",
    );
    assert_err(
        env.issuer_withdraw(100 * USD + 1, "Too much"),
        "VaultInsufficient",
    );
    assert_err(env.issuer_withdraw(0, "Nothing"), "ZeroAmount");
    assert_err(env.issuer_withdraw(USD, ""), "InvalidPurpose");
    assert_err(env.issuer_withdraw(USD, &"x".repeat(65)), "InvalidPurpose");
    // The issuer cannot route the money to someone else's account either.
    let issuer = env.issuer.insecure_clone();
    assert_err(
        env.withdraw(&issuer, stranger_token, USD, "Elsewhere"),
        "ConstraintTokenOwner",
    );
    assert_eq!(balance(&env.svm, env.vault), 100 * USD);
}

#[test]
fn repay_restores_the_vault_and_is_counted() {
    let mut env = Env::new(1_000_000 * USD);
    env.issuer_repay(40 * USD).unwrap();
    env.issuer_repay(2 * USD).unwrap();
    assert_eq!(balance(&env.svm, env.vault), 42 * USD);
    assert_eq!(env.series().total_repaid, 42 * USD);
}

#[test]
fn only_issuer_repays_and_never_zero() {
    let mut env = Env::new(1_000_000 * USD);
    assert_err(env.issuer_repay(0), "ZeroAmount");

    let stranger = Kp::new();
    env.svm.airdrop(&stranger.pubkey(), 1_000_000_000).unwrap();
    let stranger_token = env.token_for(stranger.pubkey(), 10 * USD);
    assert_err(env.repay(&stranger, stranger_token, 10 * USD), "NotIssuer");
    assert_eq!(env.series().total_repaid, 0);
}
