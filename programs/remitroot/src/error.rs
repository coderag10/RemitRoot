use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Only the admin can do this")]
    NotAdmin,
    #[msg("Only the bond issuer can do this")]
    NotIssuer,
    #[msg("Savings share cannot be more than 50%")]
    SaveShareTooHigh,
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
    #[msg("The vault does not hold enough funds; the issuer must repay first")]
    VaultInsufficient,
    #[msg("Arithmetic overflow")]
    MathOverflow,
}
