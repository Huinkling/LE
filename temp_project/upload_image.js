// 上传LE代币图标到Arweave的脚本
const fs = require('fs');
const path = require('path');
const { Connection, Keypair } = require('@solana/web3.js');
const { Metaplex } = require('@metaplex-foundation/js');

// 主函数
async function main() {
  try {
    console.log('准备上传LE代币图标到Arweave...');
    
    // 检查图标文件路径
    console.log('请输入图标文件的路径（相对于项目根目录）：');
    console.log('例如：assets/logo.png');
    
    // 在实际情况下，这里会从命令行读取输入
    // 但为了简化脚本，我们使用一个固定路径
    const imagePath = '../assets/logo.png';
    
    // 验证图像文件存在
    if (!fs.existsSync(imagePath)) {
      console.error(`找不到图像文件: ${imagePath}`);
      console.log('请确保图像文件存在并重新运行脚本');
      return;
    }
    
    // 读取图像文件
    const imageBuffer = fs.readFileSync(imagePath);
    console.log(`已读取图像文件: ${imagePath}`);
    
    // 读取部署密钥
    const deployerKeyPath = '../deploy-keypair.json';
    if (!fs.existsSync(deployerKeyPath)) {
      console.error(`找不到部署密钥文件: ${deployerKeyPath}`);
      return;
    }
    
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
    
    console.log('上传图像到Arweave...');
    
    // 上传图像到Arweave - 修复API调用
    const imageUri = await metaplex
      .storage()
      .upload(imageBuffer);
    
    console.log(`图像上传成功! URI: ${imageUri}`);
    
    // 读取clean_metadata.json文件
    const metadataPath = '../temp_upload/clean_metadata.json';
    if (!fs.existsSync(metadataPath)) {
      console.error(`找不到元数据文件: ${metadataPath}`);
      return;
    }
    
    // 更新元数据文件中的图像链接
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    metadata.image = imageUri;
    
    // 写回元数据文件
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    console.log(`已更新元数据文件中的图像URI`);
    
    console.log('\n下一步: 运行 "node upload_metadata.js" 上传完整的元数据');
  } catch (error) {
    console.error('上传图像过程中出错:', error);
  }
}

main().then(
  () => process.exit(),
  (err) => {
    console.error(err);
    process.exit(-1);
  }
); 