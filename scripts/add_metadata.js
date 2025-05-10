// 添加LE代币元数据脚本
// 本脚本用于为已部署的LE代币添加元数据信息，如代币名称、符号和图标
// 元数据对于代币的显示非常重要，能够使代币在钱包和区块链浏览器中显示友好的信息

// 导入必要的库和模块
const { clusterApiUrl, Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

// 尝试导入Metaplex元数据库，如果不可用则给出安装提示
// Metaplex是Solana上的NFT和代币元数据标准实现
let TOKEN_METADATA_PROGRAM_ID;
try {
  const { Metadata, PROGRAM_ID } = require('@metaplex-foundation/mpl-token-metadata');
  TOKEN_METADATA_PROGRAM_ID = PROGRAM_ID;
} catch (error) {
  console.error('缺少元数据库依赖，请运行: npm install @metaplex-foundation/mpl-token-metadata');
  process.exit(1);
}

async function main() {
  try {
    // 从token-info.json获取代币信息
    // 这个文件是在部署代币时创建的，包含了代币的地址和其他关键信息
    if (!fs.existsSync('./token-info.json')) {
      console.error('找不到token-info.json，请先运行部署脚本');
      return;
    }

    // 解析token-info.json文件并获取代币铸币地址
    const tokenInfo = JSON.parse(fs.readFileSync('./token-info.json', 'utf8'));
    const tokenMint = new PublicKey(tokenInfo.tokenAddress);
    
    // 连接到Solana devnet测试网
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    
    // 加载部署密钥 - 用于签署元数据交易
    // 注意：添加元数据必须由代币创建者或具有足够权限的账户进行
    const deployerKeyFile = './deploy-keypair.json';
    const deployerKey = Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(fs.readFileSync(deployerKeyFile, 'utf-8')))
    );
    console.log(`使用部署者密钥: ${deployerKey.publicKey.toString()}`);
    
    // 使用Metaplex标准计算元数据账户地址
    // 元数据账户是一个程序派生地址(PDA)，由代币铸币地址确定
    const metadataPDA = await getMetadata(tokenMint);
    console.log(`元数据地址: ${metadataPDA.toString()}`);
    
    // 设置代币元数据内容
    const name = "LE";                           // 代币名称
    const symbol = "LE";                         // 代币符号
    const uri = "https://arweave.net/YOUR_UPLOADED_IMAGE_LINK";  // 代币图标和元数据的URI
    
    // 创建添加元数据的交易
    // 这将调用Metaplex的Token Metadata程序来创建元数据账户
    const transaction = new Transaction().add(
      createMetadataInstruction(
        metadataPDA,                 // 元数据账户地址
        tokenMint,                   // 代币铸币地址
        deployerKey.publicKey,       // 铸币权限拥有者
        deployerKey.publicKey,       // 支付账户
        deployerKey.publicKey,       // 更新权限拥有者
        name,                        // 代币名称
        symbol,                      // 代币符号
        uri                          // 元数据URI
      )
    );
    
    // 发送并确认交易
    // 等待交易被网络确认，确保元数据成功添加
    const txid = await sendAndConfirmTransaction(
      connection,
      transaction,
      [deployerKey]                  // 交易签名者
    );
    
    // 交易成功后显示确认信息和链接
    console.log(`元数据已添加! 交易ID: ${txid}`);
    console.log(`在浏览器中查看: https://explorer.solana.com/tx/${txid}?cluster=devnet`);
    console.log(`元数据地址: https://explorer.solana.com/address/${metadataPDA.toString()}?cluster=devnet`);
    
    // 更新token-info.json文件，添加元数据信息
    // 这样其他脚本可以访问完整的代币信息，包括元数据
    tokenInfo.metadata = {
      metadataAddress: metadataPDA.toString(), // 元数据账户地址
      name,                                   // 代币名称
      symbol,                                 // 代币符号
      uri                                     // 元数据URI
    };
    
    // 将更新后的信息写回文件
    fs.writeFileSync('./token-info.json', JSON.stringify(tokenInfo, null, 2));
    console.log('代币信息已更新，包含元数据地址');
    
    console.log('\n您现在可以在Solana浏览器中查看代币和元数据了!');
  } catch (error) {
    // 错误处理 - 打印详细错误信息以便调试
    console.error('添加元数据过程中出错:', error);
  }
}

// 辅助函数 - 计算元数据账户地址
// 在Solana上，元数据账户地址是通过一个确定性算法从代币地址派生出来的
async function getMetadata(tokenMint) {
  return (
    await PublicKey.findProgramAddress(
      [
        Buffer.from('metadata'),           // 固定的种子前缀
        TOKEN_METADATA_PROGRAM_ID.toBuffer(), // Metaplex元数据程序ID
        tokenMint.toBuffer(),              // 代币铸币地址
      ],
      TOKEN_METADATA_PROGRAM_ID           // Metaplex元数据程序ID
    )
  )[0]; // 返回派生地址的第一个元素
}

// 元数据指令创建函数 - 创建设置元数据的指令
// 这个函数使用Metaplex提供的API构建元数据指令
function createMetadataInstruction(
  metadataAccount,   // 元数据账户地址
  mint,              // 代币铸币地址
  mintAuthority,     // 铸币权限拥有者
  payer,             // 支付交易费用的账户
  updateAuthority,   // 更新元数据权限的拥有者
  name,              // 代币名称
  symbol,            // 代币符号
  uri               // 元数据URI
) {
  // 导入Metaplex元数据指令创建函数
  const { createCreateMetadataAccountV2Instruction } = require('@metaplex-foundation/mpl-token-metadata');
  
  // 构建元数据数据结构
  const data = {
    name,                         // 代币名称
    symbol,                       // 代币符号
    uri,                          // 元数据URI
    sellerFeeBasisPoints: 0,      // 销售费用基点(用于NFT，对普通代币设为0)
    creators: null,               // 创作者信息(可选)
    collection: null,             // 集合信息(可选)
    uses: null                    // 使用信息(可选)
  };
  
  // 创建元数据指令
  return createCreateMetadataAccountV2Instruction(
    {
      metadata: metadataAccount,  // 元数据账户
      mint,                       // 代币铸币地址
      mintAuthority,              // 铸币权限拥有者
      payer,                      // 支付账户
      updateAuthority,            // 更新权限拥有者
    },
    {
      createMetadataAccountArgsV2: {
        data,                     // 元数据内容
        isMutable: true           // 元数据是否可修改
      }
    }
  );
}

// 执行主函数并处理结果
main().then(
  () => process.exit(),           // 成功完成后退出
  err => {
    console.error(err);           // 打印错误信息
    process.exit(-1);             // 出错时以非零状态码退出
  }
); 