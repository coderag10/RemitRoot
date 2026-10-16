use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

use crate::{
    constants::*,
    error::ErrorCode,
    events::Redeemed,
    state::{BondSeries, Config, Position},
};

/// Not blocked by the pause: savers can always take their money back after maturity.
#[derive(Accounts)]
pub struct Redeem<'info> {
    #[account(mut)]
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
        close = worker,
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

pub fn handle_redeem(ctx: Context<Redeem>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let series = &mut ctx.accounts.series;
    require!(now >= series.maturity_ts, ErrorCode::NotMatured);

    let position = &mut ctx.accounts.position;
    position.accrue(series.coupon_bps, series.maturity_ts, now)?;
    let principal = position.principal;
    let interest = position.accrued_interest;
    let payout = principal
        .checked_add(interest)
        .ok_or(ErrorCode::MathOverflow)?;
    require!(
        ctx.accounts.vault.amount >= payout,
        ErrorCode::VaultInsufficient
    );

    series.total_redeemed = series
        .total_redeemed
        .checked_add(principal)
        .ok_or(ErrorCode::MathOverflow)?;
    series.interest_paid = series
        .interest_paid
        .checked_add(interest)
        .ok_or(ErrorCode::MathOverflow)?;
    position.principal = 0;
    position.accrued_interest = 0;

    if payout > 0 {
        series.transfer_out(
            ctx.accounts.token_program.key(),
            ctx.accounts.vault.to_account_info(),
            ctx.accounts.usd_mint.to_account_info(),
            ctx.accounts.worker_token.to_account_info(),
            series.to_account_info(),
            payout,
            ctx.accounts.usd_mint.decimals,
        )?;
    }

    emit!(Redeemed {
        worker: ctx.accounts.worker.key(),
        series: series.key(),
        principal,
        interest,
    });
    Ok(())
}
