use anchor_lang::prelude::*;

use crate::{constants::*, error::ErrorCode};

#[account]
#[derive(InitSpace)]
pub struct Config {
    /// Creates series and can pause.
    pub admin: Pubkey,
    /// The dollar mint every series uses: the test mint on devnet, USDC in a local simulation.
    pub usd_mint: Pubkey,
    /// Emergency stop for setting rules, sending and claiming interest. Redeeming always works.
    pub paused: bool,
    /// Id of the next series.
    pub series_count: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct BondSeries {
    pub id: u64,
    /// Can withdraw proceeds and repay.
    pub issuer: Pubkey,
    #[max_len(NAME_SPACE)]
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
    /// Interest paid to savers, by claim or at redemption.
    pub interest_paid: u64,
    /// Taken out of the vault by the issuer.
    pub total_withdrawn: u64,
    /// Paid back into the vault by the issuer.
    pub total_repaid: u64,
    /// Workers who have ever saved into this series.
    pub saver_count: u32,
    pub proceeds_count: u32,
    pub vault: Pubkey,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct SplitRule {
    pub worker: Pubkey,
    /// The family wallet.
    pub recipient: Pubkey,
    /// Savings share, 0 to 5000 basis points.
    pub save_bps: u16,
    /// Where savings go.
    pub series: Pubkey,
    pub total_sent: u64,
    pub total_saved: u64,
    pub transfer_count: u32,
    /// Optional savings goal in base units; 0 means no goal.
    pub goal_amount: u64,
    /// What the goal is for; see `MAX_GOAL_KIND`.
    pub goal_kind: u8,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Position {
    pub worker: Pubkey,
    pub series: Pubkey,
    pub principal: u64,
    /// Interest booked up to `last_accrual_ts` and not yet paid.
    pub accrued_interest: u64,
    pub last_accrual_ts: i64,
    /// Interest already paid out by `claim_interest`.
    pub interest_claimed: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct ProceedsRecord {
    pub series: Pubkey,
    pub index: u32,
    pub amount: u64,
    #[max_len(PURPOSE_SPACE)]
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
            .ok_or(ErrorCode::MathOverflow)?;
        let elapsed = u128::try_from(elapsed).map_err(|_| ErrorCode::MathOverflow)?;
        let interest = u128::from(self.principal)
            .checked_mul(u128::from(coupon_bps))
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

impl BondSeries {
    /// Moves `amount` out of the vault, which the series owns, signing with the series seeds.
    #[allow(clippy::too_many_arguments)]
    pub fn transfer_out<'info>(
        &self,
        token_program: Pubkey,
        vault: AccountInfo<'info>,
        mint: AccountInfo<'info>,
        to: AccountInfo<'info>,
        authority: AccountInfo<'info>,
        amount: u64,
        decimals: u8,
    ) -> Result<()> {
        let id_bytes = self.id.to_le_bytes();
        let signer_seeds: &[&[&[u8]]] = &[&[SERIES_SEED, id_bytes.as_ref(), &[self.bump]]];
        anchor_spl::token_interface::transfer_checked(
            CpiContext::new_with_signer(
                token_program,
                anchor_spl::token_interface::TransferChecked {
                    from: vault,
                    mint,
                    to,
                    authority,
                },
                signer_seeds,
            ),
            amount,
            decimals,
        )
    }
}
