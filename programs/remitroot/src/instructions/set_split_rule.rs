use anchor_lang::prelude::*;

use crate::{
    constants::*,
    error::ErrorCode,
    events::RuleSet,
    state::{BondSeries, SplitRule},
};

#[derive(Accounts)]
pub struct SetSplitRule<'info> {
    #[account(mut)]
    pub worker: Signer<'info>,
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
) -> Result<()> {
    require!(save_bps <= MAX_SAVE_BPS, ErrorCode::SaveShareTooHigh);

    // Lifetime totals are left untouched on update; a fresh account starts them at zero.
    let rule = &mut ctx.accounts.rule;
    rule.worker = ctx.accounts.worker.key();
    rule.recipient = recipient;
    rule.save_bps = save_bps;
    rule.series = ctx.accounts.series.key();
    rule.bump = ctx.bumps.rule;

    emit!(RuleSet {
        worker: rule.worker,
        recipient,
        save_bps,
        series: rule.series,
    });
    Ok(())
}
