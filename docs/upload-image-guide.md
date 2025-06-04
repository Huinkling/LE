# LE代币图标上传指南

本文档将指导您如何上传LE代币的图标到区块链存储服务，以便正确显示在Solana浏览器和钱包中。

## 为什么需要上传图片到区块链存储服务？

代币元数据中的图片URL必须是公开可访问的网络地址。本地文件路径（如`assets/images/logo.png`）无法被区块链浏览器和钱包访问，导致代币图标无法显示。

永久链接服务如Arweave或IPFS能确保您的图片长期可访问，不会因临时网络服务关闭而丢失。

## 上传选项

以下是几种上传图片的方法，按推荐顺序排列：

### 1. 使用Solana Token Creator上传工具

这是最简单的方法，专为Solana代币设计：

1. 访问 [https://token-creator-lac.vercel.app/uploader](https://token-creator-lac.vercel.app/uploader)
2. 点击"上传图像"按钮，选择您的LE代币图标文件
3. 等待上传完成，系统会提供一个Arweave URL
4. 复制该URL用于更新代币元数据

### 2. 使用Pinata (IPFS)

Pinata是一个流行的IPFS服务提供商：

1. 注册[Pinata](https://www.pinata.cloud/)账户
2. 登录后，点击"Upload"上传您的图标文件
3. 上传完成后，点击文件获取IPFS网关URL
4. 使用获得的URL更新代币元数据

### 3. 使用NFT.Storage

NFT.Storage专为NFT内容设计，由Filecoin提供支持：

1. 注册[NFT.Storage](https://nft.storage/)账户
2. 登录后，点击"Upload"上传您的图标文件
3. 上传完成后，获取IPFS URL
4. 使用获得的URL更新代币元数据

## 如何更新代币元数据

获取图片永久链接后：

1. 打开`token-info.json`文件
2. 在`metadata`字段中设置新的`name`、`symbol`和`uri`值
3. 保存文件后运行`./update_metadata.sh`脚本更新代币元数据

## 验证

更新元数据后，您可以在Solana浏览器中查看代币：

1. 访问[https://explorer.solana.com/?cluster=devnet](https://explorer.solana.com/?cluster=devnet)
2. 在搜索框中输入您的代币地址：`FKkToJHvhU24f5KB3Ljh8bsBQ7wT7PAqM5AcTXXwPpBe`
3. 在"Token"选项卡下，您应该能看到更新后的代币名称和图标

**注意：** 元数据更新可能需要一些时间才能在浏览器中显示，请耐心等待。

## 常见问题

1. **图片上传后无法访问**
   - 确保使用的是永久链接服务提供的公开URL
   - 检查URL是否能在浏览器中正常访问

2. **更新元数据后图标仍未显示**
   - 区块链浏览器可能存在缓存，请等待或尝试清除浏览器缓存
   - 确认交易已成功完成（检查提供的交易链接）

3. **上传图片失败**
   - 确保图片文件大小合理（通常建议小于1MB）
   - 图片格式应为PNG或JPG等常见格式 