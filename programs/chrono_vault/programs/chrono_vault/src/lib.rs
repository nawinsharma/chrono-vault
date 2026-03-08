use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("u8Jw4y4seuWQYPMpZHwFGiPLUzXi1vFrKm6MB5Kiy8f");

#[program]
pub mod chrono_vault {
    use super::*;

    pub fn create_capsule(
        ctx: Context<CreateCapsule>,
        capsule_id: String,
        unlock_timestamp: i64,
        encrypted_cid: String,
        escrow_amount: u64,
    ) -> Result<()> {
        let clock = Clock::get()?;
        require!(
            unlock_timestamp > clock.unix_timestamp,
            ChronoVaultError::UnlockTimestampMustBeFuture
        );
        require!(
            capsule_id.len() <= 64,
            ChronoVaultError::CapsuleIdTooLong
        );
        require!(
            encrypted_cid.len() <= 256,
            ChronoVaultError::CidTooLong
        );

        let capsule_info = ctx.accounts.capsule.to_account_info();
        let capsule = &mut ctx.accounts.capsule;
        capsule.creator = ctx.accounts.creator.key();
        capsule.capsule_id = capsule_id;
        capsule.unlock_timestamp = unlock_timestamp;
        capsule.encrypted_cid = encrypted_cid;
        capsule.escrow_amount = escrow_amount;
        capsule.status = CapsuleStatus::Locked as u8;
        capsule.created_at = clock.unix_timestamp;
        capsule.bump = ctx.bumps.capsule;

        if escrow_amount > 0 {
            system_program::transfer(
                CpiContext::new(
                    ctx.accounts.system_program.to_account_info(),
                    system_program::Transfer {
                        from: ctx.accounts.creator.to_account_info(),
                        to: capsule_info,
                    },
                ),
                escrow_amount,
            )?;
        }

        emit!(CapsuleCreated {
            creator: capsule.creator,
            capsule_id: capsule.capsule_id.clone(),
            unlock_timestamp: capsule.unlock_timestamp,
            escrow_amount: capsule.escrow_amount,
        });

        Ok(())
    }

    pub fn unlock_capsule(ctx: Context<UnlockCapsule>, _capsule_id: String) -> Result<()> {
        let capsule = &mut ctx.accounts.capsule;
        let clock = Clock::get()?;

        require!(
            capsule.status == CapsuleStatus::Locked as u8,
            ChronoVaultError::CapsuleAlreadyUnlocked
        );
        require!(
            clock.unix_timestamp >= capsule.unlock_timestamp,
            ChronoVaultError::UnlockTimestampNotReached
        );
        require!(
            capsule.creator == ctx.accounts.creator.key(),
            ChronoVaultError::UnauthorizedUnlock
        );

        capsule.status = CapsuleStatus::Unlocked as u8;

        if capsule.escrow_amount > 0 {
            let escrow = capsule.escrow_amount;
            **capsule.to_account_info().try_borrow_mut_lamports()? -= escrow;
            **ctx
                .accounts
                .creator
                .to_account_info()
                .try_borrow_mut_lamports()? += escrow;
            capsule.escrow_amount = 0;
        }

        emit!(CapsuleUnlocked {
            creator: capsule.creator,
            capsule_id: capsule.capsule_id.clone(),
            unlocked_at: clock.unix_timestamp,
        });

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(capsule_id: String)]
pub struct CreateCapsule<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        init,
        payer = creator,
        space = Capsule::space(&capsule_id, &String::new()),
        seeds = [b"capsule", creator.key().as_ref(), capsule_id.as_bytes()],
        bump
    )]
    pub capsule: Account<'info, Capsule>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(capsule_id: String)]
pub struct UnlockCapsule<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        mut,
        seeds = [b"capsule", creator.key().as_ref(), capsule_id.as_bytes()],
        bump = capsule.bump,
        has_one = creator @ ChronoVaultError::UnauthorizedUnlock,
    )]
    pub capsule: Account<'info, Capsule>,

    pub system_program: Program<'info, System>,
}

#[account]
pub struct Capsule {
    pub creator: Pubkey,
    pub capsule_id: String,
    pub unlock_timestamp: i64,
    pub encrypted_cid: String,
    pub escrow_amount: u64,
    pub status: u8,
    pub created_at: i64,
    pub bump: u8,
}

impl Capsule {
    pub fn space(capsule_id: &String, _encrypted_cid: &String) -> usize {
        8  // discriminator
        + 32 // creator pubkey
        + 4 + 64 // capsule_id (max)
        + 8  // unlock_timestamp
        + 4 + 256 // encrypted_cid (max)
        + 8  // escrow_amount
        + 1  // status
        + 8  // created_at
        + 1  // bump
    }
}

#[repr(u8)]
pub enum CapsuleStatus {
    Locked = 0,
    Unlocked = 1,
}

#[event]
pub struct CapsuleCreated {
    pub creator: Pubkey,
    pub capsule_id: String,
    pub unlock_timestamp: i64,
    pub escrow_amount: u64,
}

#[event]
pub struct CapsuleUnlocked {
    pub creator: Pubkey,
    pub capsule_id: String,
    pub unlocked_at: i64,
}

#[error_code]
pub enum ChronoVaultError {
    #[msg("Unlock timestamp must be in the future")]
    UnlockTimestampMustBeFuture,

    #[msg("Capsule has already been unlocked")]
    CapsuleAlreadyUnlocked,

    #[msg("Unlock timestamp has not been reached yet")]
    UnlockTimestampNotReached,

    #[msg("Only the capsule creator can unlock it")]
    UnauthorizedUnlock,

    #[msg("Capsule ID exceeds maximum length of 64 characters")]
    CapsuleIdTooLong,

    #[msg("Encrypted CID exceeds maximum length of 256 characters")]
    CidTooLong,
}
