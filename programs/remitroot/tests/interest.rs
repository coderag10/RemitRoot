//! Interest accrual, `claim_interest` and `redeem`.
mod common;

use common::*;
use remitroot::state::*;
use solana_signer::Signer;

/// A worker who saved 100 test dollars at the start of the series.
fn saver(env: &mut Env) -> Worker {
    let w = env.worker(200 * USD);
    env.set_rule(&w, 5_000).unwrap();
    env.remit(&w, 200 * USD).unwrap();
    w
}

#[test]
fn interest_accrues_before_a_top_up() {
    let mut env = Env::new(1_000_000 * USD);
    let w = env.worker(400 * USD);
    env.set_rule(&w, 5_000).unwrap();
    env.remit(&w, 200 * USD).unwrap(); // 100 saved

    let half = YEAR / 2;
    warp(&mut env.svm, START_TS + half);
    env.remit(&w, 200 * USD).unwrap(); // another 100 saved

    let position: Position = load(&env.svm, w.position);
    assert_eq!(position.principal, 200 * USD);
    // Booked on the first 100 only, for half a year.
    assert_eq!(position.accrued_interest, interest(100 * USD, half));
    assert_eq!(position.last_accrual_ts, START_TS + half);
}

#[test]
fn claim_pays_accrued_interest_and_resets_it() {
    let mut env = Env::new(1_000_000 * USD);
    let w = saver(&mut env);
    env.issuer_repay(10 * USD).unwrap(); // the issuer funds interest

    let quarter = YEAR / 4;
    warp(&mut env.svm, START_TS + quarter);
    env.claim(&w).unwrap();

    let expected = interest(100 * USD, quarter);
    assert_eq!(balance(&env.svm, w.token), expected);
    let position: Position = load(&env.svm, w.position);
    assert_eq!(
        (position.accrued_interest, position.interest_claimed),
        (0, expected)
    );
    assert_eq!(env.series().interest_paid, expected);

    // Nothing more has accrued in the same second.
    assert_err(env.claim(&w), "NothingToClaim");
}

#[test]
fn claim_fails_while_the_vault_cannot_pay() {
    let mut env = Env::new(1_000_000 * USD);
    let w = saver(&mut env);
    env.issuer_withdraw(100 * USD, "Hydropower project, tranche 1")
        .unwrap();
    warp(&mut env.svm, START_TS + YEAR / 2);
    assert_err(env.claim(&w), "VaultInsufficient");

    // Repaying restores solvency.
    env.issuer_repay(100 * USD).unwrap();
    env.claim(&w).unwrap();
}

#[test]
fn only_the_owner_can_claim_or_redeem_a_position() {
    let mut env = Env::new(1_000_000 * USD);
    let w = saver(&mut env);
    env.issuer_repay(10 * USD).unwrap();
    warp(&mut env.svm, START_TS + YEAR);

    let thief = Kp::new();
    env.svm.airdrop(&thief.pubkey(), 1_000_000_000).unwrap();
    let thief_token = env.token_for(thief.pubkey(), 0);
    // The position's seeds are derived from the signer, so another signer cannot reach it.
    assert_err(env.claim_as(&w, &thief, thief_token), "ConstraintSeeds");
    assert_err(env.redeem_as(&w, &thief, thief_token), "ConstraintSeeds");
    // And the owner cannot pay out to someone else's token account.
    let owner = w.kp.insecure_clone();
    assert_err(
        env.redeem_as(&w, &owner, thief_token),
        "ConstraintTokenOwner",
    );
    assert_eq!(balance(&env.svm, thief_token), 0);
}

#[test]
fn interest_stops_at_maturity() {
    let mut env = Env::new(1_000_000 * USD);
    let w = saver(&mut env);
    env.issuer_repay(20 * USD).unwrap();
    warp(&mut env.svm, START_TS + 3 * YEAR);
    env.redeem(&w).unwrap();
    // One year of interest, not three.
    assert_eq!(
        balance(&env.svm, w.token),
        100 * USD + interest(100 * USD, YEAR)
    );
}

#[test]
fn redeem_before_maturity_rejected() {
    let mut env = Env::new(1_000_000 * USD);
    let w = saver(&mut env);
    warp(&mut env.svm, START_TS + YEAR - 1);
    assert_err(env.redeem(&w), "NotMatured");
}

#[test]
fn redeem_pays_principal_plus_unclaimed_interest_and_closes_the_position() {
    let mut env = Env::new(1_000_000 * USD);
    let w = saver(&mut env);
    env.issuer_repay(20 * USD).unwrap();

    // Claim part of the interest halfway, then redeem at maturity.
    warp(&mut env.svm, START_TS + YEAR / 2);
    env.claim(&w).unwrap();
    let claimed = balance(&env.svm, w.token);
    warp(&mut env.svm, START_TS + YEAR);
    env.redeem(&w).unwrap();

    let total_interest = interest(100 * USD, YEAR);
    let paid = balance(&env.svm, w.token);
    assert_eq!(
        paid,
        100 * USD + claimed + interest(100 * USD, YEAR - YEAR / 2)
    );
    assert!(
        paid <= 100 * USD + total_interest,
        "never more than a year's interest"
    );
    assert!(is_gone(&env.svm, w.position));

    let series = env.series();
    assert_eq!(series.total_redeemed, 100 * USD);
    assert_eq!(series.interest_paid, paid - 100 * USD);
}

#[test]
fn double_redeem_rejected() {
    let mut env = Env::new(1_000_000 * USD);
    let w = saver(&mut env);
    env.issuer_repay(20 * USD).unwrap();
    warp(&mut env.svm, START_TS + YEAR);
    env.redeem(&w).unwrap();
    let after = balance(&env.svm, w.token);
    assert_err(env.redeem(&w), "AccountNotInitialized");
    assert_eq!(balance(&env.svm, w.token), after);
}

#[test]
fn redeem_waits_for_the_issuer_to_fund_interest() {
    let mut env = Env::new(1_000_000 * USD);
    let w = saver(&mut env);
    warp(&mut env.svm, START_TS + YEAR);
    // The vault holds the principal only.
    assert_err(env.redeem(&w), "VaultInsufficient");
    env.issuer_repay(interest(100 * USD, YEAR)).unwrap();
    env.redeem(&w).unwrap();
    assert_eq!(balance(&env.svm, env.vault), 0);
}
