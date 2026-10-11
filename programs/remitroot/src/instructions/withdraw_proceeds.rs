use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked,
};

use crate::{
    constants::*,
    error::ErrorCode,
    events::ProceedsWithdrawn,
    state::{BondSeries, Config, ProceedsRecord},
};

#[derive(Accounts)]
pub struct WithdrawProceeds<'info> {
    #[account(mut)]
    pub issuer: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump, has_one = usd_mint)]
    pub config: Account<'info, Config>,
    #[account(
        mut,
        seeds = [SERIES_SEED, series.id.to_le_bytes().as_ref()],
        bump = series.bump,
        has_one = issuer @ ErrorCode::NotIssuer,
        has_one = vault,
    )]
    pub series: Account<'info, BondSeries>,
    #[account(
        init,
        payer = issuer,
        space = 8 + ProceedsRecord::INIT_SPACE,
        seeds = [
            PROCEEDS_SEED,
            series.key().as_ref(),
            series.proceeds_count.to_le_bytes().as_ref(),
        ],
        bump
    )]
    pub record: Account<'info, ProceedsRecord>,
    pub usd_mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        token::mint = usd_mint,
        token::authority = issuer,
        token::token_program = token_program,
    )]
    pub issuer_token: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn handle_withdraw_proceeds(
    ctx: Context<WithdrawProceeds>,
    amount: u64,
    purpose: String,
) -> Result<()> {
    require!(amount > 0, ErrorCode::ZeroAmount);
    require!(
        !purpose.is_empty() && purpose.len() <= MAX_PURPOSE_LEN,
        ErrorCode::InvalidPurpose
    );
    require!(
        ctx.accounts.vault.amount >= amount,
        ErrorCode::VaultInsufficient
    );

    let series = &mut ctx.accounts.series;
    let index = series.proceeds_count;
    series.proceeds_count = index.checked_add(1).ok_or(ErrorCode::MathOverflow)?;
    series.total_withdrawn = series
        .total_withdrawn
        .checked_add(amount)
        .ok_or(ErrorCode::MathOverflow)?;

    let record = &mut ctx.accounts.record;
    record.series = series.key();
    record.index = index;
    record.amount = amount;
    record.purpose = purpose.clone();
    record.ts = Clock::get()?.unix_timestamp;

    let id_bytes = series.id.to_le_bytes();
    let signer_seeds: &[&[&[u8]]] = &[&[SERIES_SEED, id_bytes.as_ref(), &[series.bump]]];
    transfer_checked(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.key(),
            TransferChecked {
                from: ctx.accounts.vault.to_account_info(),
                mint: ctx.accounts.usd_mint.to_account_info(),
                to: ctx.accounts.issuer_token.to_account_info(),
                authority: series.to_account_info(),
            },
            signer_seeds,
        ),
        amount,
        ctx.accounts.usd_mint.decimals,
    )?;

    emit!(ProceedsWithdrawn {
        series: series.key(),
        index,
        amount,
        purpose,
    });
    Ok(())
}
