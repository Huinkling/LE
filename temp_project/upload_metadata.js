// 上传LE代币元数据到Arweave的脚本
const fs = require('fs');
const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const { Metaplex } = require('@metaplex-foundation/js');

// 主函数
async function main() {
  try {
    console.log('准备上传LE代币元数据到Arweave...');
    
    // 加载元数据和密钥
    const metadataPath = '../temp_upload/clean_metadata.json';
    const tokenInfoPath = '../token-info.json';
    const deployerKeyPath = '../deploy-keypair.json';
    
    // 验证文件存在
    if (!fs.existsSync(metadataPath)) {
      console.error(`找不到元数据文件: ${metadataPath}`);
      return;
    }
    
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
    console.log(`处理代币: ${tokenInfo.tokenAddress}`);
    
    // 加载部署者密钥
    const deployerKey = Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(fs.readFileSync(deployerKeyPath, 'utf8')))
    );
    console.log(`使用部署者公钥: ${deployerKey.publicKey.toString()}`);
    
    // 连接到Solana devnet
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    
    // 初始化Metaplex实例 - 修复实例化方式
    const metaplex = new Metaplex(connection);
    metaplex.identity().setDriver({
      publicKey: deployerKey.publicKey,
      signMessage: () => {},
      signTransaction: () => {},
      signAllTransactions: () => {},
    });
    
    // 读取元数据
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    console.log('元数据内容:', metadata);
    
    console.log('上传元数据到Arweave...');
    
    // 上传元数据到Arweave
    const uri = await metaplex
      .storage()
      .uploadJson(metadata);
    
    console.log(`元数据上传成功! URI: ${uri}`);
    
    // 更新代币信息
    tokenInfo.metadata.uri = uri;
    fs.writeFileSync(tokenInfoPath, JSON.stringify(tokenInfo, null, 2));
    console.log('已更新token-info.json文件');
    
    // 更新元数据文件
    fs.writeFileSync('../assets/metadata.json', JSON.stringify(metadata, null, 2));
    console.log('已更新assets/metadata.json文件');
    
    console.log('\n下一步: 运行 "node update_token_metadata.js" 更新代币的元数据');
  } catch (error) {
    console.error('上传元数据过程中出错:', error);
  }
}

main().then(
  () => process.exit(),
  (err) => {
    console.error(err);
    process.exit(-1);
  }
); 