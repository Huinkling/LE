// LE代币分发脚本 - 管理员功能
// 本脚本用于将LE代币从管理员账户分发给其他用户
// 通过命令行参数接收接收者地址和分发数量

// 导入必要的库和模块
const { clusterApiUrl, Connection, Keypair, PublicKey } = require('@solana/web3.js');
const { Token, TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const fs = require('fs');

// 检查命令行参数 - 确保用户提供了接收者地址和数量
if (process.argv.length < 4) {
  console.log('用法: node distribute_tokens.js <接收者地址> <数量>');
  console.log('例如: node distribute_tokens.js Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr 100');
  process.exit(1);
}

// 获取命令行参数
const receiverAddress = process.argv[2]; // 接收者的Solana钱包地址
const amount = parseFloat(process.argv[3]); // 要转账的代币数量

// 验证数量参数 - 确保是有效的正数
if (isNaN(amount) || amount <= 0) {
  console.error('错误: 数量必须是正数');
  process.exit(1);
}

async function main() {
  try {
    // 从token-info.json获取代币信息
    // 这个文件包含了代币地址和管理员账户等关键信息
    if (!fs.existsSync('./token-info.json')) {
      console.error('找不到token-info.json，请先运行部署脚本');
      return;
    }

    // 解析token-info.json并获取必要的地址信息
    const tokenInfo = JSON.parse(fs.readFileSync('./token-info.json', 'utf8'));
    const tokenMint = new PublicKey(tokenInfo.tokenAddress); // 代币铸币地址
    const adminTokenAccount = new PublicKey(tokenInfo.adminTokenAccount); // 管理员的代币账户
    
    // 连接到Solana devnet测试网
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    
    // 加载管理员密钥 - 用于签署转账交易
    // 注意：管理员必须是代币的创建者或拥有足够权限的账户
    const adminKeyFile = './deploy-keypair.json';
    const adminKey = Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(fs.readFileSync(adminKeyFile, 'utf-8')))
    );
    console.log(`使用管理员密钥: ${adminKey.publicKey.toString()}`);
    
    // 验证接收者地址格式是否有效
    let receiverPublicKey;
    try {
      receiverPublicKey = new PublicKey(receiverAddress);
    } catch (error) {
      console.error('错误: 无效的接收者地址');
      return;
    }
    
    // 创建代币实例 - 用于进行代币相关操作
    const token = new Token(
      connection,
      tokenMint,
      TOKEN_PROGRAM_ID,
      adminKey
    );
    
    // 确保接收者有代币账户，如果没有则创建
    // SPL代币要求每个用户有专门的账户来存储特定类型的代币
    let receiverTokenAccount;
    try {
      // getOrCreateAssociatedAccountInfo 方法会查找或创建关联代币账户
      receiverTokenAccount = await token.getOrCreateAssociatedAccountInfo(
        receiverPublicKey
      );
      console.log(`接收者代币账户: ${receiverTokenAccount.address.toString()}`);
    } catch (error) {
      console.error('创建接收者代币账户时出错:', error);
      return;
    }
    
    // 计算实际转账金额 - 考虑代币的小数位数
    // 例如，如果代币有9位小数，转账1个代币实际需要发送1000000000个最小单位
    const realAmount = amount * Math.pow(10, tokenInfo.decimals);
    
    // 执行代币转账操作
    console.log(`从管理员向 ${receiverAddress} 转账 ${amount} LE代币...`);
    
    // 调用token.transfer方法执行转账
    const txSignature = await token.transfer(
      adminTokenAccount,                // 源代币账户 - 从管理员账户转出
      receiverTokenAccount.address,     // 目标代币账户 - 接收者的账户
      adminKey.publicKey,               // 转账授权者 - 管理员公钥
      [adminKey],                       // 签名者 - 管理员密钥对
      realAmount                        // 转账金额 - 已考虑小数位数
    );
    
    // 显示转账成功信息和交易链接
    console.log(`转账成功! 交易签名: ${txSignature}`);
    console.log(`在浏览器中查看: https://explorer.solana.com/tx/${txSignature}?cluster=devnet`);
    console.log(`接收者可以在这里查看余额: https://explorer.solana.com/address/${receiverTokenAccount.address.toString()}?cluster=devnet`);
    
    // 记录交易到历史记录文件 - 便于后续查询和审计
    const transaction = {
      timestamp: new Date().toISOString(),  // 交易时间戳 - ISO 8601格式
      from: adminKey.publicKey.toString(),  // 发送方地址
      to: receiverAddress,                  // 接收方地址
      amount: amount,                       // 转账金额
      txSignature                           // 交易签名/ID
    };
    
    // 更新或创建交易历史文件
    let transactions = [];
    const txHistoryFile = './transaction-history.json';
    
    // 如果历史文件已存在，则加载现有记录
    if (fs.existsSync(txHistoryFile)) {
      transactions = JSON.parse(fs.readFileSync(txHistoryFile, 'utf8'));
    }
    
    // 添加新交易记录并保存到文件
    transactions.push(transaction);
    fs.writeFileSync(txHistoryFile, JSON.stringify(transactions, null, 2));
    console.log('交易已添加到历史记录');
    
  } catch (error) {
    // 错误处理 - 打印详细错误信息以便调试
    console.error('代币分发过程中出错:', error);
  }
}

// 执行主函数并处理结果
main().then(
  () => process.exit(),       // 成功完成后退出
  err => {
    console.error(err);       // 打印错误信息
    process.exit(-1);         // 出错时以非零状态码退出
  }
); 