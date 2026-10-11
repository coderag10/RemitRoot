use anchor_lang::prelude::*;

#[event]
pub struct SeriesCreated {
    pub series: Pubkey,
    pub id: u64,
    pub issuer: Pubkey,
    pub coupon_bps: u16,
    pub maturity_ts: i64,
    pub cap: u64,
}

#[event]
pub struct RuleSet {
    pub worker: Pubkey,
    pub recipient: Pubkey,
    pub save_bps: u16,
    pub series: Pubkey,
}

#[event]
pub struct RemittanceSent {
    pub worker: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub family_amount: u64,
    pub saved_amount: u64,
    pub series: Pubkey,
}

#[event]
pub struct Redeemed {
    pub worker: Pubkey,
    pub series: Pubkey,
    pub principal: u64,
    pub interest: u64,
}

#[event]
pub struct ProceedsWithdrawn {
    pub series: Pubkey,
    pub index: u32,
    pub amount: u64,
    pub purpose: String,
}
