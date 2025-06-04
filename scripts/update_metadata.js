// 更新LE代币元数据脚本
// 此脚本用于更新已部署代币的元数据信息，如名称和图标

const { 
  clusterApiUrl, 
  Connection, 
  Keypair, 
  PublicKey, 
  Transaction, 
  sendAndConfirmTransaction 
} = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

// 导入Metaplex元数据工具
let metaplex;
try {
  const { 
    createUpdateMetadataAccountV2Instruction, 
    PROGRAM_ID 
  } = require('@metaplex-foundation/mpl-token-metadata');
  
  metaplex = {
    createUpdateMetadataAccountV2Instruction,
    PROGRAM_ID
  };
} catch (error) {
  console.error('缺少元数据库依赖，请运行: npm install @metaplex-foundation/mpl-token-metadata');
  process.exit(1);
}

// 从文件中读取代币信息
if (!fs.existsSync('./token-info.json')) {
  console.error('找不到token-info.json文件');
  process.exit(1);
}

async function main() {
  try {
    // 读取代币信息
    const tokenInfo = JSON.parse(fs.readFileSync('./token-info.json', 'utf8'));
    const tokenMint = new PublicKey(tokenInfo.tokenAddress);
    
    console.log(`准备更新代币元数据: ${tokenMint.toString()}`);
    
    // 连接到Solana网络
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    
    // 加载部署密钥
    const deployerKeyFile = './deploy-keypair.json';
    const deployerKey = Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(fs.readFileSync(deployerKeyFile, 'utf-8')))
    );
    
    console.log(`使用密钥: ${deployerKey.publicKey.toString()}`);
    
    // 计算元数据账户地址
    const metadataPDA = await getMetadata(tokenMint);
    console.log(`元数据地址: ${metadataPDA.toString()}`);
    
    // 从token-info.json获取新的元数据
    if (!tokenInfo.metadata || !tokenInfo.metadata.uri) {
      console.error('token-info.json 中缺少 metadata 信息');
      process.exit(1);
    }

    const name = tokenInfo.metadata.name || 'LE';
    const symbol = tokenInfo.metadata.symbol || 'LE';
    const uri = tokenInfo.metadata.uri;
    
    console.log('更新元数据为:');
    console.log(`名称: ${name}`);
    console.log(`符号: ${symbol}`);
    console.log(`URI: ${uri}`);
    
    // 创建更新元数据指令
    const updateInstruction = metaplex.createUpdateMetadataAccountV2Instruction(
      {
        metadata: metadataPDA,
        updateAuthority: deployerKey.publicKey,
      },
      {
        updateMetadataAccountArgsV2: {
          data: {
            name,
            symbol,
            uri,
            sellerFeeBasisPoints: 0,
            creators: null,
            collection: null,
            uses: null,
          },
          updateAuthority: deployerKey.publicKey,
          primarySaleHappened: true,
          isMutable: true,
        },
      }
    );
    
    // 创建并发送交易
    const transaction = new Transaction().add(updateInstruction);
    
    console.log('发送交易...');
    const txid = await sendAndConfirmTransaction(
      connection,
      transaction,
      [deployerKey]
    );
    
    console.log(`元数据更新成功! 交易ID: ${txid}`);
    console.log(`在浏览器中查看: https://explorer.solana.com/tx/${txid}?cluster=devnet`);
    
    // 更新本地token-info.json文件
    tokenInfo.metadata = {
      name,
      symbol,
      uri
    };
    
    fs.writeFileSync('./token-info.json', JSON.stringify(tokenInfo, null, 2));
    console.log('本地代币信息已更新');
    
    console.log('\n请注意:');
    console.log('1. 元数据更新可能需要一些时间才能在浏览器中显示');
    console.log('2. 图标URL必须是公开可访问的，本地文件路径无法在浏览器中显示');
    console.log('3. 建议使用Arweave或IPFS服务上传图标文件以获得永久链接');
  } catch (error) {
    console.error('更新元数据时出错:', error);
  }
}

// 计算元数据账户地址
async function getMetadata(mint) {
  return (
    await PublicKey.findProgramAddress(
      [
        Buffer.from('metadata'),
        metaplex.PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
      ],
      metaplex.PROGRAM_ID
    )
  )[0];
}

// 执行主函数
main().then(
  () => process.exit(),
  (err) => {
    console.error(err);
    process.exit(-1);
  }
); 