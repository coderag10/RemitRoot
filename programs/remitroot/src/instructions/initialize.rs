use anchor_lang::prelude::*;
use anchor_spl::token_interface::Mint;

use crate::{constants::*, events::ConfigInitialized, state::Config};

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        init,
        payer = admin,
        space = 8 + Config::INIT_SPACE,
        seeds = [CONFIG_SEED],
        bump
    )]
    pub config: Account<'info, Config>,
    /// Any SPL or Token-2022 mint: the test dollar on devnet, USDC in a local simulation.
    pub usd_mint: InterfaceAccount<'info, Mint>,
    pub system_program: Program<'info, System>,
}

pub fn handle_initialize(ctx: Context<Initialize>) -> Result<()> {
    let config = &mut ctx.accounts.config;
    config.admin = ctx.accounts.admin.key();
    config.usd_mint = ctx.accounts.usd_mint.key();
    config.paused = false;
    config.series_count = 0;
    config.bump = ctx.bumps.config;

    emit!(ConfigInitialized {
        admin: config.admin,
        usd_mint: config.usd_mint,
    });
    Ok(())
}
