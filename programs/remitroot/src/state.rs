use anchor_lang::prelude::*;

use crate::{constants::*, error::ErrorCode};

#[account]
#[derive(InitSpace)]
pub struct Config {
    pub admin: Pubkey,
    pub usd_mint: Pubkey,
    pub series_count: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct BondSeries {
    pub id: u64,
    pub issuer: Pubkey,
    #[max_len(MAX_NAME_LEN)]
    pub name: String,
    /// Annual simple interest in basis points, e.g. 900 = 9%.
    pub coupon_bps: u16,
    pub start_ts: i64,
    pub maturity_ts: i64,
    /// Maximum principal that can ever be sold.
    pub cap: u64,
    /// Principal sold so far (lifetime, never decreases).
    pub total_principal: u64,
    /// Principal paid back to savers at redemption.
    pub total_redeemed: u64,
    pub interest_paid: u64,
    /// Taken out of the vault by the issuer.
    pub total_withdrawn: u64,
    pub saver_count: u32,
    pub proceeds_count: u32,
    pub vault: Pubkey,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct SplitRule {
    pub worker: Pubkey,
    pub recipient: Pubkey,
    pub save_bps: u16,
    pub series: Pubkey,
    pub total_sent: u64,
    pub total_saved: u64,
    pub transfer_count: u32,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Position {
    pub worker: Pubkey,
    pub series: Pubkey,
    pub principal: u64,
    /// Interest booked up to `last_accrual_ts`.
    pub accrued_interest: u64,
    pub last_accrual_ts: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct ProceedsRecord {
    pub series: Pubkey,
    pub index: u32,
    pub amount: u64,
    #[max_len(MAX_PURPOSE_LEN)]
    pub purpose: String,
    pub ts: i64,
}

impl Position {
    /// Books simple interest up to `now`, capped at maturity. Rounds down, in the vault's favour.
    /// Must be called before any change to `principal`.
    pub fn accrue(&mut self, coupon_bps: u16, maturity_ts: i64, now: i64) -> Result<()> {
        let until = now.min(maturity_ts);
        if until <= self.last_accrual_ts {
            return Ok(());
        }
        let elapsed = until
            .checked_sub(self.last_accrual_ts)
            .ok_or(ErrorCode::MathOverflow)? as u128;
        let interest = (self.principal as u128)
            .checked_mul(coupon_bps as u128)
            .and_then(|v| v.checked_mul(elapsed))
            .and_then(|v| v.checked_div(BPS_DENOMINATOR * SECONDS_PER_YEAR))
            .ok_or(ErrorCode::MathOverflow)?;
        let interest = u64::try_from(interest).map_err(|_| ErrorCode::MathOverflow)?;
        self.accrued_interest = self
            .accrued_interest
            .checked_add(interest)
            .ok_or(ErrorCode::MathOverflow)?;
        self.last_accrual_ts = until;
        Ok(())
    }
}
