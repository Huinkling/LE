//! $LE Token program

mod token_program;
pub use token_program::*;

mod token_metadata;
pub use token_metadata::*;

use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{  // 注意这里的括号位置与原文件一致
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
};
use std::convert::TryInto;

/// Define the type of state stored in accounts
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct UserAccount {
    pub owner: Pubkey,
    pub points: u64,
    pub daily_check_in: u64, // Timestamp of last check-in
    pub ad_views_today: u8,  // Number of ads viewed today
    pub referrals: Vec<Pubkey>, // List of referred users
}

// Declare and export the program's entrypoint
entrypoint!(process_instruction);

// Program entrypoint's implementation
pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    msg!("$LE Token program entrypoint");

    // Iterating accounts is safer than indexing
    let accounts_iter = &mut accounts.iter();

    // Get the account to write to
    let account = next_account_info(accounts_iter)?;

    // The account must be owned by the program in order to modify its data
    if account.owner != program_id {
        msg!("Account does not have the correct program id");
        return Err(ProgramError::IncorrectProgramId);
    }

    // Increment and store the number of times hello has been called
    let instruction_type = instruction_data[0];
    
    match instruction_type {
        0 => { // Initialize account
            msg!("Instruction: Initialize Account");
            let owner = next_account_info(accounts_iter)?;
            
            let user_account = UserAccount {
                owner: *owner.key,
                points: 0,
                daily_check_in: 0,
                ad_views_today: 0,
                referrals: Vec::new(),
            };
            
            user_account.serialize(&mut &mut account.data.borrow_mut()[..])?;
        }
        1 => { // Add points
            msg!("Instruction: Add Points");
            let mut user_account = UserAccount::try_from_slice(&account.data.borrow())?;
            
            // Get points amount from instruction data
            let points_to_add = u64::from_le_bytes(
                instruction_data[1..9].try_into().unwrap()
            );
            
            user_account.points = user_account.points.checked_add(points_to_add)
                .ok_or(ProgramError::ArithmeticOverflow)?;
                
            user_account.serialize(&mut &mut account.data.borrow_mut()[..])?;
            
            msg!("Added {} points. New balance: {}", points_to_add, user_account.points);
        }
        2 => { // Daily check-in
            msg!("Instruction: Daily Check-in");
            let mut user_account = UserAccount::try_from_slice(&account.data.borrow())?;
            
            // Get current timestamp from instruction data
            let current_time = u64::from_le_bytes(
                instruction_data[1..9].try_into().unwrap()
            );
            
            // Check if 24 hours have passed since last check-in
            // 86400 seconds = 24 hours
            if current_time - user_account.daily_check_in >= 86400 {
                // Award 10 points for daily check-in
                user_account.points = user_account.points.checked_add(10)
                    .ok_or(ProgramError::ArithmeticOverflow)?;
                user_account.daily_check_in = current_time;
                
                msg!("Daily check-in successful. Awarded 10 points. New balance: {}", user_account.points);
            } else {
                msg!("Error: Already checked in today");
                return Err(ProgramError::InvalidArgument);
            }
            
            user_account.serialize(&mut &mut account.data.borrow_mut()[..])?;
        }
        3 => { // Record ad view
            msg!("Instruction: Record Ad View");
            let mut user_account = UserAccount::try_from_slice(&account.data.borrow())?;
            
            // Get current timestamp from instruction data
            let current_time = u64::from_le_bytes(
                instruction_data[1..9].try_into().unwrap()
            );
            
            // Check if it's a new day, reset ad views counter
            if (current_time - user_account.daily_check_in) >= 86400 {
                user_account.ad_views_today = 0;
            }
            
            // Check if daily ad view limit reached (max 5 per day)
            if user_account.ad_views_today < 5 {
                // Award 5 points for viewing an ad
                user_account.points = user_account.points.checked_add(5)
                    .ok_or(ProgramError::ArithmeticOverflow)?;
                user_account.ad_views_today += 1;
                
                msg!("Ad view recorded. Awarded 5 points. New balance: {}", user_account.points);
            } else {
                msg!("Error: Daily ad view limit reached");
                return Err(ProgramError::InvalidArgument);
            }
            
            user_account.serialize(&mut &mut account.data.borrow_mut()[..])?;
        }
        4 => { // Record referral
            msg!("Instruction: Record Referral");
            let mut user_account = UserAccount::try_from_slice(&account.data.borrow())?;
            
            // Get referred user pubkey from instruction data
            let referred_pubkey = Pubkey::new_from_array(*<&[u8; 32]>::try_from(&instruction_data[1..33]).unwrap());
            
            // Check if user already referred
            if !user_account.referrals.contains(&referred_pubkey) {
                // Award points based on number of existing referrals (decreasing rewards)
                let referral_count = user_account.referrals.len() as u64;
                let points_to_add = if referral_count == 0 {
                    50 // First referral: 50 points
                } else {
                    50 / (2_u64.pow(referral_count.try_into().unwrap())) // Exponential decrease
                };
                
                user_account.points = user_account.points.checked_add(points_to_add)
                    .ok_or(ProgramError::ArithmeticOverflow)?;
                user_account.referrals.push(referred_pubkey);
                
                msg!("Referral recorded. Awarded {} points. New balance: {}", 
                     points_to_add, user_account.points);
            } else {
                msg!("Error: User already referred");
                return Err(ProgramError::InvalidArgument);
            }
            
            user_account.serialize(&mut &mut account.data.borrow_mut()[..])?;
        }
        5 => { // Record community activity
            msg!("Instruction: Record Community Activity");
            let mut user_account = UserAccount::try_from_slice(&account.data.borrow())?;
            
            // Get points amount from instruction data (set by admin)
            let points_to_add = u64::from_le_bytes(
                instruction_data[1..9].try_into().unwrap()
            );
            
            user_account.points = user_account.points.checked_add(points_to_add)
                .ok_or(ProgramError::ArithmeticOverflow)?;
                
            user_account.serialize(&mut &mut account.data.borrow_mut()[..])?;
            
            msg!("Community activity recorded. Added {} points. New balance: {}", 
                 points_to_add, user_account.points);
        }
        _ => {
            msg!("Error: Unknown instruction");
            return Err(ProgramError::InvalidInstructionData);
        }
    }

    Ok(())
}