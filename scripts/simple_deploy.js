// 简单的LE代币部署脚本
// 本脚本使用JavaScript和Solana Web3.js库来在Solana devnet上部署LE代币
// 相比于bash脚本，这个方法提供了更好的错误处理和更灵活的功能

// 导入必要的库和模块
const { clusterApiUrl, Connection, Keypair, PublicKey, sendAndConfirmTransaction, Transaction } = require('@solana/web3.js');
const { Token, TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const fs = require('fs');

async function main() {
  // 连接到Solana devnet测试网络
  // 使用官方提供的RPC节点，confirmed表示等待交易确认
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

  try {
    // 1. 加载部署密钥 - 从本地文件加载用于部署的密钥对
    const deployerKeyFile = './deploy-keypair.json';
    const deployerKey = Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(fs.readFileSync(deployerKeyFile, 'utf-8')))
    );
    console.log(`使用部署者密钥: ${deployerKey.publicKey.toString()}`);

    // 2. 检查账户余额 - 确保有足够的SOL支付交易费用
    const balance = await connection.getBalance(deployerKey.publicKey);
    console.log(`账户余额: ${balance / 10**9} SOL`);

    // 如果余额不足1 SOL，提示用户获取更多SOL
    if (balance < 10**9) {
      console.log('余额太低，请先获取一些SOL');
      console.log('运行: solana airdrop 2 --url devnet');
      return;
    }

    // 3. 创建代币 - 使用SPL Token程序创建新的代币
    console.log('创建代币...');
    const token = await Token.createMint(
      connection,            // Solana网络连接
      deployerKey,           // 支付交易费用的账户
      deployerKey.publicKey, // 铸币权限所有者 - 谁有权创建新代币
      deployerKey.publicKey, // 冻结权限所有者 - 谁有权冻结代币账户
      9,                     // 小数位数，9是Solana上的标准做法(与SOL相同)
      TOKEN_PROGRAM_ID       // 使用SPL Token程序ID
    );
    
    console.log(`代币已创建! 铸币地址: ${token.publicKey.toString()}`);
    
    // 4. 为创建者创建代币账户 - 每种代币需要专门的账户来存储
    console.log('为管理员创建代币账户...');
    const adminTokenAccount = await token.createAccount(deployerKey.publicKey);
    console.log(`管理员代币账户: ${adminTokenAccount.toString()}`);
    
    // 5. 铸造一些代币到管理员账户 - 创建初始代币供应量
    const amount = 1000000 * 10**9; // 1,000,000 个代币，考虑9位小数
    console.log(`铸造 ${amount/10**9} 个代币到管理员账户...`);
    await token.mintTo(
      adminTokenAccount,     // 目标代币账户 - 接收新铸造代币的账户
      deployerKey.publicKey, // 铸币权限所有者 - 必须与创建代币时设置的相同
      [deployerKey],         // 多重签名者 - 用于授权交易的签名者
      amount                 // 铸造的代币数量，包含小数位数
    );

    // 6. 保存代币信息到文件 - 便于后续操作和引用
    const tokenInfo = {
      tokenAddress: token.publicKey.toString(),     // 代币的地址/ID
      adminTokenAccount: adminTokenAccount.toString(), // 管理员的代币账户
      decimals: 9,                                  // 小数位数
      adminPublicKey: deployerKey.publicKey.toString(), // 管理员公钥
      metadata: {
        name: "LE",                                // 代币名称
        symbol: "LE",                              // 代币符号
        uri: "assets/images/logo.png"              // 代币图标URI
      }
    };
    
    // 将代币信息写入JSON文件
    fs.writeFileSync('./token-info.json', JSON.stringify(tokenInfo, null, 2));
    console.log('代币信息已保存到 token-info.json');
    
    // 7. 显示如何查看代币的指南
    console.log('\n=== 如何查看您的代币 ===');
    console.log(`在浏览器中查看代币: https://explorer.solana.com/address/${token.publicKey.toString()}?cluster=devnet`);
    console.log(`管理员账户代币余额: https://explorer.solana.com/address/${adminTokenAccount.toString()}?cluster=devnet`);
    console.log('\n要在其他账户之间分发代币，您可以使用以下命令:');
    console.log('spl-token transfer --fund-recipient <TOKEN_ADDRESS> <AMOUNT> <RECIPIENT_ADDRESS> --url devnet');
  } catch (error) {
    // 错误处理 - 打印详细错误信息以便调试
    console.error('部署过程中出错:', error);
  }
}

// 执行主函数并处理结果
main().then(
  () => process.exit(),  // 成功完成后退出
  err => {
    console.error(err); // 打印错误信息
    process.exit(-1);   // 出错时以非零状态码退出
  }
); 