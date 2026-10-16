use anchor_lang::prelude::*;

use crate::{
    constants::*,
    error::ErrorCode,
    events::RuleSet,
    state::{BondSeries, Config, SplitRule},
};

#[derive(Accounts)]
pub struct SetSplitRule<'info> {
    #[account(mut)]
    pub worker: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(
        init_if_needed,
        payer = worker,
        space = 8 + SplitRule::INIT_SPACE,
        seeds = [RULE_SEED, worker.key().as_ref()],
        bump
    )]
    pub rule: Account<'info, SplitRule>,
    #[account(seeds = [SERIES_SEED, series.id.to_le_bytes().as_ref()], bump = series.bump)]
    pub series: Account<'info, BondSeries>,
    pub system_program: Program<'info, System>,
}

pub fn handle_set_split_rule(
    ctx: Context<SetSplitRule>,
    recipient: Pubkey,
    save_bps: u16,
    goal_amount: u64,
    goal_kind: u8,
) -> Result<()> {
    require!(!ctx.accounts.config.paused, ErrorCode::Paused);
    require!(save_bps <= MAX_SAVE_BPS, ErrorCode::SaveShareTooHigh);
    require!(
        recipient != Pubkey::default() && recipient != ctx.accounts.worker.key(),
        ErrorCode::InvalidRecipient
    );
    require!(
        goal_kind <= MAX_GOAL_KIND && (goal_amount == 0) == (goal_kind == 0),
        ErrorCode::InvalidGoal
    );

    // Lifetime totals are left untouched on update; a fresh account starts them at zero.
    let rule = &mut ctx.accounts.rule;
    rule.worker = ctx.accounts.worker.key();
    rule.recipient = recipient;
    rule.save_bps = save_bps;
    rule.series = ctx.accounts.series.key();
    rule.goal_amount = goal_amount;
    rule.goal_kind = goal_kind;
    rule.bump = ctx.bumps.rule;

    emit!(RuleSet {
        worker: rule.worker,
        recipient,
        save_bps,
        series: rule.series,
        goal_amount,
        goal_kind,
    });
    Ok(())
}
