use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked,
};

use crate::{
    constants::*,
    error::ErrorCode,
    events::RemittanceSent,
    state::{BondSeries, Config, Position, SplitRule},
};

#[derive(Accounts)]
pub struct SendRemittance<'info> {
    #[account(mut)]
    pub worker: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump, has_one = usd_mint)]
    pub config: Account<'info, Config>,
    #[account(
        mut,
        seeds = [RULE_SEED, worker.key().as_ref()],
        bump = rule.bump,
        has_one = worker,
        has_one = series @ ErrorCode::WrongSeries,
    )]
    pub rule: Account<'info, SplitRule>,
    #[account(
        mut,
        seeds = [SERIES_SEED, series.id.to_le_bytes().as_ref()],
        bump = series.bump,
        has_one = vault,
    )]
    pub series: Account<'info, BondSeries>,
    #[account(
        init_if_needed,
        payer = worker,
        space = 8 + Position::INIT_SPACE,
        seeds = [POSITION_SEED, worker.key().as_ref(), series.key().as_ref()],
        bump
    )]
    pub position: Account<'info, Position>,
    pub usd_mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        token::mint = usd_mint,
        token::authority = worker,
        token::token_program = token_program,
    )]
    pub worker_token: InterfaceAccount<'info, TokenAccount>,
    /// Must be a token account owned by the recipient named in the rule.
    #[account(
        mut,
        token::mint = usd_mint,
        token::authority = rule.recipient,
        token::token_program = token_program,
    )]
    pub recipient_token: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn handle_send_remittance(ctx: Context<SendRemittance>, amount: u64) -> Result<()> {
    require!(amount > 0, ErrorCode::ZeroAmount);
    let now = Clock::get()?.unix_timestamp;
    let series = &mut ctx.accounts.series;
    require!(now < series.maturity_ts, ErrorCode::SeriesMatured);

    let rule = &mut ctx.accounts.rule;
    // save rounds down; family gets the rest, so nothing is lost to rounding.
    let saved = u64::try_from(
        (amount as u128)
            .checked_mul(rule.save_bps as u128)
            .and_then(|v| v.checked_div(BPS_DENOMINATOR))
            .ok_or(ErrorCode::MathOverflow)?,
    )
    .map_err(|_| ErrorCode::MathOverflow)?;
    let family = amount.checked_sub(saved).ok_or(ErrorCode::MathOverflow)?;

    let new_total = series
        .total_principal
        .checked_add(saved)
        .ok_or(ErrorCode::MathOverflow)?;
    require!(new_total <= series.cap, ErrorCode::CapExceeded);

    let position = &mut ctx.accounts.position;
    if position.worker == Pubkey::default() {
        position.worker = ctx.accounts.worker.key();
        position.series = series.key();
        position.last_accrual_ts = now;
        position.bump = ctx.bumps.position;
    }
    // Accrue on the old principal before it changes.
    position.accrue(series.coupon_bps, series.maturity_ts, now)?;
    if saved > 0 {
        if position.principal == 0 {
            series.saver_count = series
                .saver_count
                .checked_add(1)
                .ok_or(ErrorCode::MathOverflow)?;
        }
        position.principal = position
            .principal
            .checked_add(saved)
            .ok_or(ErrorCode::MathOverflow)?;
        series.total_principal = new_total;
    }

    rule.total_sent = rule
        .total_sent
        .checked_add(amount)
        .ok_or(ErrorCode::MathOverflow)?;
    rule.total_saved = rule
        .total_saved
        .checked_add(saved)
        .ok_or(ErrorCode::MathOverflow)?;
    rule.transfer_count = rule
        .transfer_count
        .checked_add(1)
        .ok_or(ErrorCode::MathOverflow)?;

    let decimals = ctx.accounts.usd_mint.decimals;
    let token_program = ctx.accounts.token_program.key();
    if family > 0 {
        transfer_checked(
            CpiContext::new(
                token_program,
                TransferChecked {
                    from: ctx.accounts.worker_token.to_account_info(),
                    mint: ctx.accounts.usd_mint.to_account_info(),
                    to: ctx.accounts.recipient_token.to_account_info(),
                    authority: ctx.accounts.worker.to_account_info(),
                },
            ),
            family,
            decimals,
        )?;
    }
    if saved > 0 {
        transfer_checked(
            CpiContext::new(
                token_program,
                TransferChecked {
                    from: ctx.accounts.worker_token.to_account_info(),
                    mint: ctx.accounts.usd_mint.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.worker.to_account_info(),
                },
            ),
            saved,
            decimals,
        )?;
    }

    emit!(RemittanceSent {
        worker: ctx.accounts.worker.key(),
        recipient: ctx.accounts.rule.recipient,
        amount,
        family_amount: family,
        saved_amount: saved,
        series: ctx.accounts.series.key(),
    });
    Ok(())
}
