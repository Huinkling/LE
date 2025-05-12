# LE代币元数据更新工具

此项目包含一套工具，用于解决LE代币元数据同步问题。按照以下步骤可以更新代币元数据并确保其在区块链浏览器中正确显示。

## 准备工作

在开始之前，请确保：

1. 您已经部署了LE代币
2. 您拥有部署密钥文件（deploy-keypair.json）
3. 您有代币信息文件（token-info.json）
4. 您准备了代币的图标文件（例如：assets/logo.png）

## 安装依赖

```bash
npm install
```

## 更新流程

按照以下顺序运行脚本：

### 步骤1：上传图标到Arweave

```bash
node upload_image.js
```

这个脚本会：
- 读取您的图标文件（默认路径：../assets/logo.png）
- 上传到Arweave永久存储
- 更新元数据文件中的图像URI

### 步骤2：上传元数据到Arweave

```bash
node upload_metadata.js
```

这个脚本会：
- 读取更新后的元数据文件
- 上传到Arweave永久存储
- 获取元数据的永久URI
- 更新token-info.json文件

### 步骤3：更新代币元数据

```bash
node update_token_metadata.js
```

这个脚本会：
- 使用Metaplex协议更新代币的链上元数据
- 链接到Arweave上的元数据URI
- 确认交易并提供浏览器链接

### 步骤4：清除浏览器缓存

完成上述步骤后，您可能需要：
- 清除浏览器缓存
- 使用隐私浏览模式访问
- 等待一段时间（有时区块链浏览器会有延迟）

## 验证

更新完成后，您可以通过以下链接验证代币信息：

```
https://explorer.solana.com/address/YOUR_TOKEN_ADDRESS?cluster=devnet
```

将YOUR_TOKEN_ADDRESS替换为您的代币地址（例如：FKkToJHvhU24f5KB3Ljh8bsBQ7wT7PAqM5AcTXXwPpBe）

## 故障排除

如果遇到问题：

1. 确保您的部署密钥有足够的SOL
2. 检查网络连接是否稳定
3. 确认图标和元数据文件格式正确
4. 尝试在不同的浏览器中查看结果 