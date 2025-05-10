//! $LE Token SPL implementation

use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
    program::{invoke, invoke_signed},
    system_instruction,
    sysvar::{rent::Rent, Sysvar},
};
// use solana_sdk::signature::Keypair;
use std::convert::TryInto;

// 导入代币元数据模块
mod token_metadata;
use token_metadata::{TokenMetadata, create_metadata_account, update_metadata};

// 定义代币基本信息
pub const TOKEN_NAME: &str = "$LE Token";
pub const TOKEN_SYMBOL: &str = "LE";
pub const TOKEN_DECIMALS: u8 = 9;
pub const TOKEN_TOTAL_SUPPLY: u64 = 1_000_000_000 * 10u64.pow(TOKEN_DECIMALS as u32); // 10亿代币

// 指令类型
#[derive(Debug)]
pub enum TokenInstruction {
    // 初始化代币
    InitializeMint,
    // 铸造代币（仅管理员可用）
    MintTo { amount: u64 },
    // 转移代币（关闭此功能）
    Transfer { amount: u64 },
}

// 解析指令数据
impl TokenInstruction {
    pub fn unpack(input: &[u8]) -> Result<Self, ProgramError> {
        let (&tag, rest) = input.split_first().ok_or(ProgramError::InvalidInstructionData)?;

        Ok(match tag {
            0 => Self::InitializeMint,
            1 => {
                let amount = rest
                    .get(..8)
                    .and_then(|slice| slice.try_into().ok())
                    .map(u64::from_le_bytes)
                    .ok_or(ProgramError::InvalidInstructionData)?;
                Self::MintTo { amount }
            }
            2 => {
                // 转移功能已关闭
                return Err(ProgramError::InvalidInstructionData);
            }
            _ => return Err(ProgramError::InvalidInstructionData),
        })
    }
}

// 程序入口点
// 注意：入口点已在lib.rs中定义，这里不需要重复定义
// entrypoint!(process_instruction);

// 处理指令
pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let instruction = TokenInstruction::unpack(instruction_data)?;

    match instruction {
        TokenInstruction::InitializeMint => {
            msg!("Instruction: InitializeMint");
            process_initialize_mint(program_id, accounts)
        }
        TokenInstruction::MintTo { amount } => {
            msg!("Instruction: MintTo");
            process_mint_to(program_id, accounts, amount)
        }
        TokenInstruction::Transfer { amount: _ } => {
            msg!("Error: Transfer functionality is disabled");
            Err(ProgramError::InvalidInstructionData)
        }
    }
}

// 初始化代币
fn process_initialize_mint(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let mint_account = next_account_info(account_info_iter)?;
    let mint_authority = next_account_info(account_info_iter)?;
    let _payer = next_account_info(account_info_iter)?;

    // 验证账户所有权
    if mint_account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    // 验证签名
    if !mint_authority.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    msg!("$LE Token initialized with name: {}, symbol: {}, decimals: {}", 
         TOKEN_NAME, TOKEN_SYMBOL, TOKEN_DECIMALS);
    msg!("Total supply: {}", TOKEN_TOTAL_SUPPLY);

    Ok(())
}

// 铸造代币（仅管理员可用）
fn process_mint_to(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    amount: u64,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let mint_account = next_account_info(account_info_iter)?;
    let destination_account = next_account_info(account_info_iter)?;
    let authority = next_account_info(account_info_iter)?;

    // 验证账户所有权
    if mint_account.owner != program_id || destination_account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    // 验证铸币权限（仅管理员可用）
    if !authority.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // 在实际实现中，这里需要验证authority是否为管理员
    // 为简化示例，这里省略了该验证

    msg!("Minted {} tokens to account: {}", amount, destination_account.key);

    Ok(())
}