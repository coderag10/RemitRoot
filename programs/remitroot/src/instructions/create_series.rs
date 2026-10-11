use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

use crate::{
    constants::*,
    error::ErrorCode,
    events::SeriesCreated,
    state::{BondSeries, Config},
};

#[derive(Accounts)]
pub struct CreateSeries<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump = config.bump,
        has_one = admin @ ErrorCode::NotAdmin,
        has_one = usd_mint,
    )]
    pub config: Account<'info, Config>,
    /// CHECK: only stored as the series issuer; it signs nothing here.
    pub issuer: UncheckedAccount<'info>,
    #[account(
        init,
        payer = admin,
        space = 8 + BondSeries::INIT_SPACE,
        seeds = [SERIES_SEED, config.series_count.to_le_bytes().as_ref()],
        bump
    )]
    pub series: Account<'info, BondSeries>,
    #[account(
        init,
        payer = admin,
        seeds = [VAULT_SEED, series.key().as_ref()],
        bump,
        token::mint = usd_mint,
        token::authority = series,
        token::token_program = token_program,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    pub usd_mint: InterfaceAccount<'info, Mint>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn handle_create_series(
    ctx: Context<CreateSeries>,
    name: String,
    coupon_bps: u16,
    maturity_ts: i64,
    cap: u64,
) -> Result<()> {
    require!(
        !name.is_empty() && name.len() <= MAX_NAME_LEN,
        ErrorCode::InvalidName
    );
    require!(coupon_bps <= MAX_COUPON_BPS, ErrorCode::CouponTooHigh);
    require!(cap > 0, ErrorCode::ZeroAmount);
    let now = Clock::get()?.unix_timestamp;
    require!(maturity_ts > now, ErrorCode::InvalidMaturity);

    let config = &mut ctx.accounts.config;
    let id = config.series_count;
    config.series_count = id.checked_add(1).ok_or(ErrorCode::MathOverflow)?;

    let series = &mut ctx.accounts.series;
    series.id = id;
    series.issuer = ctx.accounts.issuer.key();
    series.name = name;
    series.coupon_bps = coupon_bps;
    series.start_ts = now;
    series.maturity_ts = maturity_ts;
    series.cap = cap;
    series.total_principal = 0;
    series.total_redeemed = 0;
    series.interest_paid = 0;
    series.total_withdrawn = 0;
    series.saver_count = 0;
    series.proceeds_count = 0;
    series.vault = ctx.accounts.vault.key();
    series.bump = ctx.bumps.series;

    emit!(SeriesCreated {
        series: series.key(),
        id,
        issuer: series.issuer,
        coupon_bps,
        maturity_ts,
        cap,
    });
    Ok(())
}
