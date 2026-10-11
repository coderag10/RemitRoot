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

#[constant]
pub const MAX_SAVE_BPS: u16 = 5_000;

#[constant]
pub const MAX_COUPON_BPS: u16 = 10_000;

pub const BPS_DENOMINATOR: u128 = 10_000;
pub const SECONDS_PER_YEAR: u128 = 31_536_000;

pub const MAX_NAME_LEN: usize = 32;
pub const MAX_PURPOSE_LEN: usize = 64;
