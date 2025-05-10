//! $LE Token Metadata implementation

use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
    program::{invoke, invoke_signed},
    system_instruction,
    sysvar::{rent::Rent, Sysvar},
};

// 代币元数据结构
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct TokenMetadata {
    pub name: String,        // 代币名称
    pub symbol: String,      // 代币符号
    pub uri: String,         // 代币图标和其他元数据的URI
    pub decimals: u8,        // 代币小数位数
    pub update_authority: Pubkey, // 元数据更新权限
}

// 创建代币元数据账户
pub fn create_metadata_account(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    name: String,
    symbol: String,
    uri: String,
    decimals: u8,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    
    // 获取必要的账户
    let metadata_account = next_account_info(account_info_iter)?;
    let mint_account = next_account_info(account_info_iter)?;
    let mint_authority = next_account_info(account_info_iter)?;
    let payer = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;
    let rent_sysvar = next_account_info(account_info_iter)?;
    
    // 验证签名
    if !mint_authority.is_signer || !payer.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    
    // 创建元数据账户
    let rent = Rent::from_account_info(rent_sysvar)?;
    let metadata = TokenMetadata {
        name,
        symbol,
        uri,
        decimals,
        update_authority: *mint_authority.key,
    };
    
    // 序列化元数据
    let metadata_serialized = metadata.try_to_vec()?;
    let metadata_account_size = metadata_serialized.len();
    
    // 计算所需的租金
    let rent_lamports = rent.minimum_balance(metadata_account_size);
    
    // 创建元数据账户
    invoke(
        &system_instruction::create_account(
            payer.key,
            metadata_account.key,
            rent_lamports,
            metadata_account_size as u64,
            program_id,
        ),
        &[payer.clone(), metadata_account.clone(), system_program.clone()],
    )?;
    
    // 将元数据写入账户
    let mut metadata_data = metadata_account.try_borrow_mut_data()?;
    metadata_data[..metadata_serialized.len()].copy_from_slice(&metadata_serialized);
    
    msg!("Created token metadata: {}, {}, decimals: {}", metadata.name, metadata.symbol, metadata.decimals);
    
    Ok(())
}

// 更新代币元数据
pub fn update_metadata(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    name: Option<String>,
    symbol: Option<String>,
    uri: Option<String>,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    
    // 获取必要的账户
    let metadata_account = next_account_info(account_info_iter)?;
    let update_authority = next_account_info(account_info_iter)?;
    
    // 验证账户所有权
    if metadata_account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }
    
    // 验证更新权限
    if !update_authority.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    
    // 读取现有元数据
    let mut metadata = TokenMetadata::try_from_slice(&metadata_account.data.borrow())?;
    
    // 验证更新权限
    if metadata.update_authority != *update_authority.key {
        return Err(ProgramError::InvalidAccountData);
    }
    
    // 更新元数据
    if let Some(new_name) = name {
        metadata.name = new_name;
    }
    
    if let Some(new_symbol) = symbol {
        metadata.symbol = new_symbol;
    }
    
    if let Some(new_uri) = uri {
        metadata.uri = new_uri;
    }
    
    // 序列化并保存更新后的元数据
    let metadata_serialized = metadata.try_to_vec()?;
    let mut metadata_data = metadata_account.try_borrow_mut_data()?;
    metadata_data[..metadata_serialized.len()].copy_from_slice(&metadata_serialized);
    
    msg!("Updated token metadata: {}, {}", metadata.name, metadata.symbol);
    
    Ok(())
}