use anchor_lang::prelude::*;

#[event]
pub struct ConfigInitialized {
    pub admin: Pubkey,
    pub usd_mint: Pubkey,
}

#[event]
pub struct PauseSet {
    pub paused: bool,
}

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
    pub goal_amount: u64,
    pub goal_kind: u8,
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
pub struct InterestClaimed {
    pub worker: Pubkey,
    pub series: Pubkey,
    pub amount: u64,
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

#[event]
pub struct Repaid {
    pub series: Pubkey,
    pub amount: u64,
    pub total_repaid: u64,
}
