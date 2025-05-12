// 更新LE代币元数据的脚本
const fs = require('fs');
const { 
  Connection, 
  Keypair,
  PublicKey, 
  Transaction, 
  sendAndConfirmTransaction 
} = require('@solana/web3.js');
const { 
  createUpdateMetadataAccountV2Instruction,
  PROGRAM_ID 
} = require('@metaplex-foundation/mpl-token-metadata');

// 计算元数据账户地址
async function getMetadata(mint) {
  return (
    await PublicKey.findProgramAddress(
      [
        Buffer.from('metadata'),
        PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
      ],
      PROGRAM_ID
    )
  )[0];
}

// 主函数
async function main() {
  try {
    console.log('准备更新LE代币元数据...');
    
    // 加载代币信息
    const tokenInfoPath = '../token-info.json';
    const deployerKeyPath = '../deploy-keypair.json';
    
    if (!fs.existsSync(tokenInfoPath)) {
      console.error(`找不到代币信息文件: ${tokenInfoPath}`);
      return;
    }
    
    if (!fs.existsSync(deployerKeyPath)) {
      console.error(`找不到部署密钥文件: ${deployerKeyPath}`);
      return;
    }
    
    // 读取代币信息
    const tokenInfo = JSON.parse(fs.readFileSync(tokenInfoPath, 'utf8'));
    const tokenMint = new PublicKey(tokenInfo.tokenAddress);
    
    console.log(`准备更新代币元数据: ${tokenMint.toString()}`);
    
    // 连接到Solana网络
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    
    // 加载部署密钥
    const deployerKey = Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(fs.readFileSync(deployerKeyPath, 'utf-8')))
    );
    
    console.log(`使用密钥: ${deployerKey.publicKey.toString()}`);
    
    // 计算元数据账户地址
    const metadataPDA = await getMetadata(tokenMint);
    console.log(`元数据地址: ${metadataPDA.toString()}`);
    
    // 从token-info.json获取元数据
    const name = tokenInfo.metadata.name;
    const symbol = tokenInfo.metadata.symbol;
    const uri = tokenInfo.metadata.uri;
    
    console.log('更新元数据为:');
    console.log(`名称: ${name}`);
    console.log(`符号: ${symbol}`);
    console.log(`URI: ${uri}`);
    
    // 创建更新元数据指令
    const updateInstruction = createUpdateMetadataAccountV2Instruction(
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
    
    console.log('\n请注意:');
    console.log('1. 元数据更新可能需要一些时间才能在浏览器中显示');
    console.log('2. 您可能需要清除浏览器缓存或使用隐私浏览模式查看最新的元数据');
    console.log('3. 如需验证，请访问: https://explorer.solana.com/address/' + tokenInfo.tokenAddress + '?cluster=devnet');
  } catch (error) {
    console.error('更新元数据时出错:', error);
  }
}

// 执行主函数
main().then(
  () => process.exit(),
  (err) => {
    console.error(err);
    process.exit(-1);
  }
); 