// 部署$LE代币并初始化元数据的脚本

const { Connection, Keypair, PublicKey, Transaction, SystemProgram, sendAndConfirmTransaction } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

// 配置信息
const NETWORK = process.env.SOLANA_NETWORK || 'devnet';

// 使用多个备用RPC端点，提高连接成功率
const RPC_ENDPOINTS = {
  mainnet: [
    'https://api.mainnet-beta.solana.com',
    'https://solana-api.projectserum.com'
  ],
  devnet: [
    'https://api.devnet.solana.com',
    'https://devnet.solana.com',
    'https://rpc-devnet.helius.xyz/?api-key=1d8740dc-e5f4-421c-b823-e1bad1889eff'
  ]
};

// 默认使用第一个端点
const RPC_URL = NETWORK === 'mainnet' ? RPC_ENDPOINTS.mainnet[0] : RPC_ENDPOINTS.devnet[0];

// 设置连接选项，增加超时时间和重试次数
const connectionConfig = {
  commitment: 'confirmed',
  confirmTransactionInitialTimeout: 120000, // 120秒超时
  disableRetryOnRateLimit: false,
  httpHeaders: {
    'Content-Type': 'application/json'
  }
};

// 重试函数
async function withRetry(fn, maxRetries = 3, delay = 2000) {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      console.log(`尝试 ${i+1}/${maxRetries} 失败: ${err.message}`);
      lastError = err;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 1.5; // 指数退避
      }
    }
  }
  throw lastError;
}

// 代币信息
const TOKEN_NAME = "$LE Token";
const TOKEN_SYMBOL = "LE";
const TOKEN_DECIMALS = 9;
const TOKEN_DESCRIPTION = "$LE Token是一个基于Solana的积分代币系统，用于奖励社区活动和参与";
const TOKEN_IMAGE_URL = "https://raw.githubusercontent.com/your-repo/le-token/main/assets/logo.png";

async function main() {
  console.log(`开始部署$LE代币到 ${NETWORK}...`);
  
  // 尝试连接到不同的RPC端点，直到成功
  let connection;
  let currentRpcUrl = RPC_URL;
  
  // 尝试所有可用的RPC端点
  const endpoints = NETWORK === 'mainnet' ? RPC_ENDPOINTS.mainnet : RPC_ENDPOINTS.devnet;
  
  for (const endpoint of endpoints) {
    try {
      currentRpcUrl = endpoint;
      console.log(`尝试连接到Solana ${NETWORK} 网络: ${currentRpcUrl}`);
      connection = new Connection(currentRpcUrl, connectionConfig);
      
      // 测试连接是否有效
      await withRetry(async () => {
        const version = await connection.getVersion();
        console.log(`连接成功! Solana版本: ${JSON.stringify(version)}`);
        return version;
      }, 2);
      
      // 如果没有抛出异常，说明连接成功
      console.log(`已成功连接到Solana ${NETWORK} 网络: ${currentRpcUrl}`);
      break;
    } catch (err) {
      console.warn(`连接到 ${currentRpcUrl} 失败: ${err.message}`);
      if (endpoint === endpoints[endpoints.length - 1]) {
        console.error('所有RPC端点连接失败，无法继续部署');
        process.exit(1);
      }
    }
  }
  
  // 设置环境变量
  process.env.SOLANA_RPC_URL = currentRpcUrl;
  
  // 加载部署者密钥对
  let deployerKeypair;
  try {
    // 尝试多个可能的密钥文件路径
    const possibleKeypairFiles = [
      process.env.KEYPAIR_PATH,
      './deploy-keypair.json',
      './deployer-keypair.json',
      './new-deploy-keypair.json'
    ];
    
    let keypairFile = null;
    for (const file of possibleKeypairFiles) {
      if (file && fs.existsSync(path.resolve(file))) {
        keypairFile = path.resolve(file);
        break;
      }
    }
    
    if (!keypairFile) {
      throw new Error('找不到有效的部署密钥文件');
    }
    
    console.log(`使用密钥文件: ${keypairFile}`);
    const keypairData = JSON.parse(fs.readFileSync(keypairFile, 'utf8'));
    deployerKeypair = Keypair.fromSecretKey(new Uint8Array(keypairData));
    console.log(`使用部署者公钥: ${deployerKeypair.publicKey.toString()}`);
  } catch (err) {
    console.error('无法加载部署者密钥对:', err);
    process.exit(1);
  }
  
  // 加载程序密钥对（如果已经部署）
  let programKeypair;
  try {
    const programKeypairFile = path.resolve('./program-keypair.json');
    if (fs.existsSync(programKeypairFile)) {
      const programKeypairData = JSON.parse(fs.readFileSync(programKeypairFile, 'utf8'));
      programKeypair = Keypair.fromSecretKey(new Uint8Array(programKeypairData));
      console.log(`使用现有程序ID: ${programKeypair.publicKey.toString()}`);
    } else {
      // 如果程序尚未部署，创建新的程序密钥对
      programKeypair = Keypair.generate();
      fs.writeFileSync(programKeypairFile, JSON.stringify(Array.from(programKeypair.secretKey)));
      console.log(`创建新程序ID: ${programKeypair.publicKey.toString()}`);
    }
  } catch (err) {
    console.error('处理程序密钥对时出错:', err);
    process.exit(1);
  }
  
  // 检查部署者账户余额
  let balance;
  try {
    balance = await withRetry(async () => {
      const bal = await connection.getBalance(deployerKeypair.publicKey);
      console.log(`部署者账户余额: ${bal / 1000000000} SOL`);
      return bal;
    }, 3, 3000);
    
    if (balance < 1000000000) { // 小于1 SOL
      console.warn('警告: 部署者账户余额较低，可能无法完成部署');
    }
  } catch (err) {
    console.warn(`无法获取账户余额，但将继续尝试部署: ${err.message}`);
    // 继续执行，不中断部署流程
  }
  
  // 部署程序（这里只是示例，实际部署需要使用solana-cli或其他工具）
  console.log('部署程序...');
  // 实际部署命令: solana program deploy --program-id ./program-keypair.json ./target/deploy/le_token.so
  
  // 创建代币元数据账户
  console.log('创建代币元数据...');
  
  // 加载元数据文件
  const metadataPath = path.join(__dirname, '../assets/clean_metadata.json');
  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  
  // 构建元数据账户地址（使用PDA派生）
  const metadataAccountSeed = Buffer.from('metadata');
  const [metadataAccount] = await PublicKey.findProgramAddress(
    [metadataAccountSeed, programKeypair.publicKey.toBuffer()],
    programKeypair.publicKey
  );
  
  console.log(`元数据账户地址: ${metadataAccount.toString()}`);
  
  // 构建创建元数据的指令数据
  // 指令类型3 = CreateMetadata
  const nameBuffer = Buffer.from(TOKEN_NAME);
  const symbolBuffer = Buffer.from(TOKEN_SYMBOL);
  const uriBuffer = Buffer.from(TOKEN_IMAGE_URL);
  
  const instructionData = Buffer.alloc(3 + nameBuffer.length + symbolBuffer.length + uriBuffer.length);
  instructionData[0] = 3; // 指令类型: CreateMetadata
  instructionData[1] = nameBuffer.length; // 名称长度
  nameBuffer.copy(instructionData, 2);
  let offset = 2 + nameBuffer.length;
  
  instructionData[offset] = symbolBuffer.length; // 符号长度
  symbolBuffer.copy(instructionData, offset + 1);
  offset += 1 + symbolBuffer.length;
  
  instructionData[offset] = uriBuffer.length; // URI长度
  uriBuffer.copy(instructionData, offset + 1);
  offset += 1 + uriBuffer.length;
  
  instructionData[offset] = TOKEN_DECIMALS; // 小数位数
  
  // 创建交易
  const transaction = new Transaction().add({
    keys: [
      { pubkey: metadataAccount, isSigner: false, isWritable: true },
      { pubkey: programKeypair.publicKey, isSigner: false, isWritable: false },
      { pubkey: deployerKeypair.publicKey, isSigner: true, isWritable: true },
      { pubkey: deployerKeypair.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: new PublicKey('SysvarRent111111111111111111111111111111111'), isSigner: false, isWritable: false },
    ],
    programId: programKeypair.publicKey,
    data: instructionData,
  });
  
  try {
    // 发送交易
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [deployerKeypair]
    );
    
    console.log(`元数据创建成功! 交易签名: ${signature}`);
    console.log(`在浏览器中查看: https://explorer.solana.com/tx/${signature}?cluster=${NETWORK === 'mainnet' ? 'mainnet-beta' : 'devnet'}`);
    
    // 更新.env文件，保存程序ID
    const envPath = path.resolve('./.env');
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
    
    // 更新或添加PROGRAM_ID
    if (envContent.includes('PROGRAM_ID=')) {
      envContent = envContent.replace(/PROGRAM_ID=.*\n/, `PROGRAM_ID=${programKeypair.publicKey.toString()}\n`);
    } else {
      envContent += `\nPROGRAM_ID=${programKeypair.publicKey.toString()}`;
    }
    
    // 更新或添加SOLANA_NETWORK
    if (envContent.includes('SOLANA_NETWORK=')) {
      envContent = envContent.replace(/SOLANA_NETWORK=.*\n/, `SOLANA_NETWORK=${NETWORK}\n`);
    } else {
      envContent += `\nSOLANA_NETWORK=${NETWORK}`;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log('.env文件已更新');
    
    console.log('\n部署完成! 代币信息将在区块链浏览器中显示。');
    console.log(`代币名称: ${TOKEN_NAME}`);
    console.log(`代币符号: ${TOKEN_SYMBOL}`);
    console.log(`小数位数: ${TOKEN_DECIMALS}`);
    console.log(`合约地址: ${programKeypair.publicKey.toString()}`);
    
  } catch (err) {
    console.error('部署过程中出错:', err);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});