use anchor_lang::prelude::*;

#[constant]
pub const CONFIG_SEED: &[u8] = b"config";

#[constant]
pub const SERIES_SEED: &[u8] = b"series";

#[constant]
pub const VAULT_SEED: &[u8] = b"vault";

#[constant]
pub const RULE_SEED: &[u8] = b"rule";

#[constant]
pub const POSITION_SEED: &[u8] = b"position";

#[constant]
pub const PROCEEDS_SEED: &[u8] = b"proceeds";

/// Highest savings share: 50% of each transfer.
#[constant]
pub const MAX_SAVE_BPS: u16 = 5_000;

/// Highest annual coupon a series may carry: 100%.
#[constant]
pub const MAX_COUPON_BPS: u16 = 10_000;

/// Savings goal kinds: 0 none, 1 land, 2 school fees, 3 house, 4 other.
#[constant]
pub const MAX_GOAL_KIND: u8 = 4;

pub const BPS_DENOMINATOR: u128 = 10_000;
pub const SECONDS_PER_YEAR: u128 = 31_536_000;

#[constant]
pub const MAX_NAME_LEN: u8 = 32;

#[constant]
pub const MAX_PURPOSE_LEN: u8 = 64;

/// The same limits as `usize`, for account space.
pub const NAME_SPACE: usize = MAX_NAME_LEN as usize;
pub const PURPOSE_SPACE: usize = MAX_PURPOSE_LEN as usize;
