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

declare_id!("GHmZ7YCiQNHJQZHTGZfK3oJBfjRWFspKU47HcWaGTiKj");

#[program]
pub mod remitroot {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        crate::instructions::initialize::handle_initialize(ctx)
    }

    pub fn set_paused(ctx: Context<SetPaused>, paused: bool) -> Result<()> {
        crate::instructions::set_paused::handle_set_paused(ctx, paused)
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
        goal_amount: u64,
        goal_kind: u8,
    ) -> Result<()> {
        crate::instructions::set_split_rule::handle_set_split_rule(
            ctx,
            recipient,
            save_bps,
            goal_amount,
            goal_kind,
        )
    }

    pub fn send_remittance(ctx: Context<SendRemittance>, amount: u64) -> Result<()> {
        crate::instructions::send_remittance::handle_send_remittance(ctx, amount)
    }

    pub fn claim_interest(ctx: Context<ClaimInterest>) -> Result<()> {
        crate::instructions::claim_interest::handle_claim_interest(ctx)
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

    pub fn repay(ctx: Context<Repay>, amount: u64) -> Result<()> {
        crate::instructions::repay::handle_repay(ctx, amount)
    }
}
