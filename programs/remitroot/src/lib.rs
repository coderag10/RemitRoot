pub mod constants;
pub mod error;
pub mod events;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use events::*;
pub use instructions::*;
pub use state::*;

declare_id!("4diHFDJAtmQXPvi7ePbozYJ7De76ChL3cGiBqWwcv2gT");

#[program]
pub mod remitroot {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        crate::instructions::initialize::handle_initialize(ctx)
    }

    pub fn create_series(
        ctx: Context<CreateSeries>,
        name: String,
        coupon_bps: u16,
        maturity_ts: i64,
        cap: u64,
    ) -> Result<()> {
        crate::instructions::create_series::handle_create_series(
            ctx,
            name,
            coupon_bps,
            maturity_ts,
            cap,
        )
    }

    pub fn set_split_rule(
        ctx: Context<SetSplitRule>,
        recipient: Pubkey,
        save_bps: u16,
    ) -> Result<()> {
        crate::instructions::set_split_rule::handle_set_split_rule(ctx, recipient, save_bps)
    }

    pub fn send_remittance(ctx: Context<SendRemittance>, amount: u64) -> Result<()> {
        crate::instructions::send_remittance::handle_send_remittance(ctx, amount)
    }

    pub fn redeem(ctx: Context<Redeem>) -> Result<()> {
        crate::instructions::redeem::handle_redeem(ctx)
    }

    pub fn withdraw_proceeds(
        ctx: Context<WithdrawProceeds>,
        amount: u64,
        purpose: String,
    ) -> Result<()> {
        crate::instructions::withdraw_proceeds::handle_withdraw_proceeds(ctx, amount, purpose)
    }
}
