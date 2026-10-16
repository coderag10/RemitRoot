use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Only the admin can do this")]
    NotAdmin,
    #[msg("Only the bond issuer can do this")]
    NotIssuer,
    #[msg("RemitRoot is paused by the admin; try again later")]
    Paused,
    #[msg("Savings share cannot be more than 50%")]
    SaveShareTooHigh,
    #[msg("The family wallet address is not valid")]
    InvalidRecipient,
    #[msg("The savings goal is not valid")]
    InvalidGoal,
    #[msg("Coupon rate is too high")]
    CouponTooHigh,
    #[msg("Name is empty or too long")]
    InvalidName,
    #[msg("Purpose is empty or too long")]
    InvalidPurpose,
    #[msg("Maturity must be in the future")]
    InvalidMaturity,
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("This bond series has matured and takes no new savings")]
    SeriesMatured,
    #[msg("This bond series has not matured yet")]
    NotMatured,
    #[msg("This transfer would exceed the bond series cap")]
    CapExceeded,
    #[msg("The split rule points to a different bond series")]
    WrongSeries,
    #[msg("A savings share needs the bond position account")]
    PositionRequired,
    #[msg("A transfer with nothing saved must not pass a bond position")]
    PositionNotNeeded,
    #[msg("There is no interest to claim yet")]
    NothingToClaim,
    #[msg("The vault does not hold enough funds; the issuer must repay first")]
    VaultInsufficient,
    #[msg("Arithmetic overflow")]
    MathOverflow,
}
