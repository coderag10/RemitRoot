//! `initialize`, `set_paused` and what the pause blocks.
mod common;

use common::*;
use solana_signer::Signer;

#[test]
fn initialize_sets_the_admin_and_mint_once() {
    let mut env = Env::bare();
    let config = env.config();
    assert_eq!(config.admin, env.admin.pubkey());
    assert_eq!(config.usd_mint, env.mint);
    assert!(!config.paused);
    assert_eq!(config.series_count, 0);

    let stranger = Kp::new();
    env.svm.airdrop(&stranger.pubkey(), 1_000_000_000).unwrap();
    assert_err(env.initialize(&stranger), "already in use");
}

#[test]
fn only_admin_pauses() {
    let mut env = Env::new(1_000_000 * USD);
    let stranger = Kp::new();
    env.svm.airdrop(&stranger.pubkey(), 1_000_000_000).unwrap();
    assert_err(env.set_paused(&stranger, true), "NotAdmin");
    assert!(!env.config().paused);

    let admin = env.admin.insecure_clone();
    env.set_paused(&admin, true).unwrap();
    assert!(env.config().paused);
    env.set_paused(&admin, false).unwrap();
    assert!(!env.config().paused);
}

#[test]
fn pause_blocks_rules_sends_and_claims_but_never_redeem() {
    let mut env = Env::new(1_000_000 * USD);
    let w = env.worker(400 * USD);
    env.set_rule(&w, 5_000).unwrap();
    env.remit(&w, 200 * USD).unwrap();
    env.issuer_repay(20 * USD).unwrap();

    let admin = env.admin.insecure_clone();
    env.set_paused(&admin, true).unwrap();
    warp(&mut env.svm, START_TS + YEAR / 2);
    assert_err(env.set_rule(&w, 1_000), "Paused");
    assert_err(env.remit(&w, 100 * USD), "Paused");
    assert_err(env.claim(&w), "Paused");

    // Savers can always take their money back after maturity.
    warp(&mut env.svm, START_TS + YEAR);
    env.redeem(&w).unwrap();

    env.set_paused(&admin, false).unwrap();
    env.set_rule(&w, 0).unwrap();
    env.remit(&w, 100 * USD).unwrap();
}
