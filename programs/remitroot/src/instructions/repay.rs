use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked,
};

use crate::{
    constants::*,
    error::ErrorCode,
    events::Repaid,
    state::{BondSeries, Config},
};

/// The issuer returns funds to the vault: principal it used, and the interest savers earn.
#[derive(Accounts)]
pub struct Repay<'info> {
    pub issuer: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump, has_one = usd_mint)]
    pub config: Box<Account<'info, Config>>,
    #[account(
        mut,
        seeds = [SERIES_SEED, series.id.to_le_bytes().as_ref()],
        bump = series.bump,
        has_one = issuer @ ErrorCode::NotIssuer,
        has_one = vault,
    )]
    pub series: Box<Account<'info, BondSeries>>,
    pub usd_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(
        mut,
        token::mint = usd_mint,
        token::authority = issuer,
        token::token_program = token_program,
    )]
    pub issuer_token: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut, token::token_program = token_program)]
    pub vault: Box<InterfaceAccount<'info, TokenAccount>>,
    pub token_program: Interface<'info, TokenInterface>,
}

pub fn handle_repay(ctx: Context<Repay>, amount: u64) -> Result<()> {
    require!(amount > 0, ErrorCode::ZeroAmount);

    let series = &mut ctx.accounts.series;
    series.total_repaid = series
        .total_repaid
        .checked_add(amount)
        .ok_or(ErrorCode::MathOverflow)?;

    transfer_checked(
        CpiContext::new(
            ctx.accounts.token_program.key(),
            TransferChecked {
                from: ctx.accounts.issuer_token.to_account_info(),
                mint: ctx.accounts.usd_mint.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
                authority: ctx.accounts.issuer.to_account_info(),
            },
        ),
        amount,
        ctx.accounts.usd_mint.decimals,
    )?;

    emit!(Repaid {
        series: series.key(),
        amount,
        total_repaid: series.total_repaid,
    });
    Ok(())
}
