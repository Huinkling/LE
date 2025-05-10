# $LE 代币离线部署步骤

由于当前网络连接问题，我们无法直接连接到Solana devnet网络。以下是在网络恢复后完成部署的详细步骤。

## 准备工作

1. 确保网络连接稳定（可以通过 `ping api.devnet.solana.com` 测试连接性）
2. 确保已安装所有必要的依赖：
   ```bash
   npm install
   ```

## 部署步骤

### 1. 使用Solana CLI获取测试网SOL

确保部署账户有足够的SOL用于部署：

```bash
# 检查当前账户余额
solana balance --keypair ./deploy-keypair.json --url https://api.devnet.solana.com

# 如果余额不足，请获取测试网SOL
solana airdrop 2 --keypair ./deploy-keypair.json --url https://api.devnet.solana.com
```

### 2. 部署代币程序

使用我们已经优化的部署脚本：

```bash
node scripts/deploy_with_metadata.js
```

如果仍然遇到网络问题，可以尝试以下替代方案：

```bash
# 方案1：指定不同的RPC端点
SOLANA_RPC_URL=https://rpc-devnet.helius.xyz/?api-key=1d8740dc-e5f4-421c-b823-e1bad1889eff node scripts/deploy_with_metadata.js

# 方案2：使用本地测试网络
solana-test-validator  # 在一个终端窗口运行
SOLANA_NETWORK=localnet SOLANA_RPC_URL=http://localhost:8899 node scripts/deploy_with_metadata.js  # 在另一个窗口运行
```

### 3. 验证部署结果

部署成功后，脚本会自动更新`.env`文件中的`PROGRAM_ID`。您可以通过以下步骤验证部署：

1. 检查`.env`文件中的`PROGRAM_ID`是否已更新
2. 在Solana区块链浏览器查看代币信息：
   - 访问 https://explorer.solana.com/?cluster=devnet
   - 输入`PROGRAM_ID`进行查询
   - 确认代币名称、符号等信息正确显示

## 部署后配置

成功部署后，您需要更新以下配置：

1. 确认`.env`文件中的以下配置正确：
   - `SOLANA_RPC_URL`: Solana网络URL（应为devnet或您使用的网络）
   - `PROGRAM_ID`: 部署的程序ID（由部署脚本自动更新）
   - `ADMIN_PUBKEY`: 管理员钱包公钥
   - `ADMIN_API_KEYS`: 管理员API密钥（用于授权管理操作）

2. 启动API服务（如果需要）：
   ```bash
   # 启动API服务的命令（根据您的项目配置可能有所不同）
   npm run start-api
   ```

## 常见问题排查

### 网络连接问题

如果遇到`fetch failed`或`timeout`错误：
- 检查网络连接
- 尝试使用不同的RPC端点
- 等待网络恢复后重试

### 部署失败：余额不足

如果出现`Insufficient funds`错误：
- 确保部署者账户有足够的SOL（至少1 SOL）
- 使用Solana CLI获取测试网SOL：`solana airdrop 1`

### 元数据未显示

如果代币已部署但在区块链浏览器中看不到元数据：
- 确认元数据交易已确认
- 检查元数据格式是否正确
- 等待区块链浏览器缓存更新（可能需要几分钟）