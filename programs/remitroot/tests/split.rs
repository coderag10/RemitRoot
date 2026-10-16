//! `set_split_rule` and `send_remittance`: the split, its rounding, and every account check.
mod common;

use common::*;
use remitroot::state::*;
use solana_signer::Signer;

/// Sends `amount` at `save_bps` and checks every balance and counter.
fn check_split(save_bps: u16, amount: u64, expected_saved: u64) {
    let mut env = Env::new(1_000_000 * USD);
    let w = env.worker(amount);
    env.set_rule(&w, save_bps).unwrap();
    env.remit(&w, amount).unwrap();

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
    let series = env.series();
    assert_eq!(series.total_principal, saved);
    assert_eq!(series.saver_count, u32::from(saved > 0));
    if saved > 0 {
        let position: Position = load(&env.svm, w.position);
        assert_eq!(position.principal, saved);
        assert_eq!(position.worker, w.kp.pubkey());
    } else {
        assert!(
            is_gone(&env.svm, w.position),
            "0% must not create a position"
        );
    }
}

#[test]
fn split_15_percent() {
    check_split(1_500, 200 * USD, 30 * USD);
}

#[test]
fn split_zero_percent_sends_everything_to_family_and_creates_no_position() {
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
    // A share too small to save anything still sends everything to the family.
    check_split(1, 9_999, 0);
}

#[test]
fn save_share_over_50_percent_rejected() {
    let mut env = Env::new(1_000_000 * USD);
    let w = env.worker(0);
    assert_err(env.set_rule(&w, 5_001), "SaveShareTooHigh");
}

#[test]
fn rule_update_keeps_lifetime_totals() {
    let mut env = Env::new(1_000_000 * USD);
    let w = env.worker(300 * USD);
    env.set_rule(&w, 1_000).unwrap();
    env.remit(&w, 100 * USD).unwrap();
    env.set_rule(&w, 2_000).unwrap();
    env.remit(&w, 100 * USD).unwrap();

    let rule: SplitRule = load(&env.svm, w.rule);
    assert_eq!(rule.save_bps, 2_000);
    assert_eq!(
        (rule.total_sent, rule.total_saved, rule.transfer_count),
        (200 * USD, 30 * USD, 2)
    );
    // Saving twice still counts one saver.
    assert_eq!(env.series().saver_count, 1);
}

#[test]
fn recipient_must_be_a_real_wallet_other_than_the_worker() {
    let mut env = Env::new(1_000_000 * USD);
    let w = env.worker(0);
    let series = env.series;
    assert_err(
        env.set_rule_full(&w, Key::default(), 1_500, series, 0, 0),
        "InvalidRecipient",
    );
    let me = w.kp.pubkey();
    assert_err(
        env.set_rule_full(&w, me, 1_500, series, 0, 0),
        "InvalidRecipient",
    );
}

#[test]
fn savings_goal_is_stored_and_validated() {
    let mut env = Env::new(1_000_000 * USD);
    let w = env.worker(0);
    let (recipient, series) = (w.recipient, env.series);
    env.set_rule_full(&w, recipient, 1_500, series, 500 * USD, 2)
        .unwrap();
    let rule: SplitRule = load(&env.svm, w.rule);
    assert_eq!((rule.goal_amount, rule.goal_kind), (500 * USD, 2));

    // A goal needs both an amount and a kind, and the kind must be known.
    assert_err(
        env.set_rule_full(&w, recipient, 1_500, series, 500 * USD, 0),
        "InvalidGoal",
    );
    assert_err(
        env.set_rule_full(&w, recipient, 1_500, series, 0, 1),
        "InvalidGoal",
    );
    assert_err(
        env.set_rule_full(&w, recipient, 1_500, series, 500 * USD, 5),
        "InvalidGoal",
    );
    // Clearing the goal works.
    env.set_rule_full(&w, recipient, 1_500, series, 0, 0)
        .unwrap();
    assert_eq!(load::<SplitRule>(&env.svm, w.rule).goal_amount, 0);
}

#[test]
fn wrong_recipient_token_account_rejected() {
    let mut env = Env::new(1_000_000 * USD);
    let w = env.worker(200 * USD);
    env.set_rule(&w, 1_500).unwrap();
    let stranger_token = env.token_for(Key::new_unique(), 0);
    let (position, token, vault) = (Some(w.position), w.token, env.vault);
    assert_err(
        env.remit_with(&w, 200 * USD, position, token, stranger_token, vault),
        "ConstraintTokenOwner",
    );
    assert_eq!(balance(&env.svm, w.token), 200 * USD);
}

#[test]
fn cannot_spend_another_users_token_account() {
    let mut env = Env::new(1_000_000 * USD);
    let w = env.worker(0);
    env.set_rule(&w, 1_500).unwrap();
    let victim_token = env.token_for(Key::new_unique(), 500 * USD);
    let (position, recipient_token, vault) = (Some(w.position), w.recipient_token, env.vault);
    assert_err(
        env.remit_with(
            &w,
            100 * USD,
            position,
            victim_token,
            recipient_token,
            vault,
        ),
        "ConstraintTokenOwner",
    );
    assert_eq!(balance(&env.svm, victim_token), 500 * USD);
}

#[test]
fn savings_cannot_be_sent_to_a_fake_vault() {
    let mut env = Env::new(1_000_000 * USD);
    let w = env.worker(200 * USD);
    env.set_rule(&w, 1_500).unwrap();
    let fake_vault = env.token_for(w.kp.pubkey(), 0);
    let (position, token, recipient_token) = (Some(w.position), w.token, w.recipient_token);
    assert_err(
        env.remit_with(&w, 200 * USD, position, token, recipient_token, fake_vault),
        "ConstraintHasOne",
    );
}

#[test]
fn position_is_required_when_saving_and_refused_when_not() {
    let mut env = Env::new(1_000_000 * USD);
    let w = env.worker(400 * USD);
    let (token, recipient_token, vault) = (w.token, w.recipient_token, env.vault);

    env.set_rule(&w, 1_500).unwrap();
    assert_err(
        env.remit_with(&w, 100 * USD, None, token, recipient_token, vault),
        "PositionRequired",
    );

    env.set_rule(&w, 0).unwrap();
    assert_err(
        env.remit_with(
            &w,
            100 * USD,
            Some(w.position),
            token,
            recipient_token,
            vault,
        ),
        "PositionNotNeeded",
    );
    assert!(is_gone(&env.svm, w.position));
}

#[test]
fn cap_and_zero_amount_enforced() {
    let mut env = Env::new(50 * USD);
    let w = env.worker(1_000 * USD);
    env.set_rule(&w, 5_000).unwrap();
    assert_err(env.remit(&w, 0), "ZeroAmount");
    env.remit(&w, 100 * USD).unwrap(); // saves exactly the cap
    assert_err(env.remit(&w, 2), "CapExceeded");
    // The family share alone still goes through once nothing would be saved.
    env.set_rule(&w, 0).unwrap();
    env.remit(&w, 10 * USD).unwrap();
}

#[test]
fn matured_series_takes_no_new_savings_but_family_transfers_still_work() {
    let mut env = Env::new(1_000_000 * USD);
    let w = env.worker(300 * USD);
    env.set_rule(&w, 1_500).unwrap();
    warp(&mut env.svm, START_TS + YEAR);
    assert_err(env.remit(&w, 100 * USD), "SeriesMatured");

    env.set_rule(&w, 0).unwrap();
    env.remit(&w, 100 * USD).unwrap();
    assert_eq!(balance(&env.svm, w.recipient_token), 100 * USD);
}

#[test]
fn rule_pointing_at_another_series_rejected() {
    let mut env = Env::new(1_000_000 * USD);
    let admin = env.admin.insecure_clone();
    env.create_series(&admin, "Second", COUPON_BPS, START_TS + YEAR, 1_000 * USD)
        .unwrap();
    let w = env.worker(100 * USD);
    let recipient = w.recipient;
    env.set_rule_full(&w, recipient, 1_500, series_pda(1), 0, 0)
        .unwrap();
    // The send names series 0, but the rule saves into series 1.
    assert_err(env.remit(&w, 100 * USD), "WrongSeries");
}
