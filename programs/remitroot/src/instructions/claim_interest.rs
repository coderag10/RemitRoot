use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

use crate::{
    constants::*,
    error::ErrorCode,
    events::InterestClaimed,
    state::{BondSeries, Config, Position},
};

#[derive(Accounts)]
pub struct ClaimInterest<'info> {
    pub worker: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump, has_one = usd_mint)]
    pub config: Box<Account<'info, Config>>,
    #[account(
        mut,
        seeds = [SERIES_SEED, series.id.to_le_bytes().as_ref()],
        bump = series.bump,
        has_one = vault,
    )]
    pub series: Box<Account<'info, BondSeries>>,
    #[account(
        mut,
        seeds = [POSITION_SEED, worker.key().as_ref(), series.key().as_ref()],
        bump = position.bump,
        has_one = worker,
        has_one = series,
    )]
    pub position: Box<Account<'info, Position>>,
    pub usd_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(
        mut,
        token::mint = usd_mint,
        token::authority = worker,
        token::token_program = token_program,
    )]
    pub worker_token: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut, token::token_program = token_program)]
    pub vault: Box<InterfaceAccount<'info, TokenAccount>>,
    pub token_program: Interface<'info, TokenInterface>,
}

pub fn handle_claim_interest(ctx: Context<ClaimInterest>) -> Result<()> {
    require!(!ctx.accounts.config.paused, ErrorCode::Paused);
    let now = Clock::get()?.unix_timestamp;
    let series = &mut ctx.accounts.series;
    let position = &mut ctx.accounts.position;
    position.accrue(series.coupon_bps, series.maturity_ts, now)?;

    let amount = position.accrued_interest;
    require!(amount > 0, ErrorCode::NothingToClaim);
    require!(
        ctx.accounts.vault.amount >= amount,
        ErrorCode::VaultInsufficient
    );

    position.accrued_interest = 0;
    position.interest_claimed = position
        .interest_claimed
        .checked_add(amount)
        .ok_or(ErrorCode::MathOverflow)?;
    series.interest_paid = series
        .interest_paid
        .checked_add(amount)
        .ok_or(ErrorCode::MathOverflow)?;

    series.transfer_out(
        ctx.accounts.token_program.key(),
        ctx.accounts.vault.to_account_info(),
        ctx.accounts.usd_mint.to_account_info(),
        ctx.accounts.worker_token.to_account_info(),
        series.to_account_info(),
        amount,
        ctx.accounts.usd_mint.decimals,
    )?;

    emit!(InterestClaimed {
        worker: ctx.accounts.worker.key(),
        series: series.key(),
        amount,
    });
    Ok(())
}
