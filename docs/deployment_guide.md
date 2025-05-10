# $LE 代币部署指南

## 部署问题排查

在部署 $LE 代币到 Solana 区块链时，我们遇到了网络连接问题。以下是解决方案和部署步骤。

### 网络连接问题

当前遇到的主要问题是与 Solana devnet 的网络连接不稳定，表现为：
- 高延迟 (>280ms)
- 高丢包率 (>60%)
- RPC 连接超时

### 解决方案

#### 方案一：等待网络恢复

1. 等待网络连接恢复稳定
2. 使用修改后的部署脚本重新尝试部署

```bash
node scripts/deploy_with_metadata.js
```

#### 方案二：使用本地开发网络

如果需要在本地测试，可以使用 Solana 本地测试网络：

```bash
# 启动本地测试网络
solana-test-validator

# 在另一个终端窗口执行部署脚本
SOLANA_NETWORK=localnet SOLANA_RPC_URL=http://localhost:8899 node scripts/deploy_with_metadata.js
```

#### 方案三：使用其他公共 RPC 端点

我们已经在脚本中添加了多个备用 RPC 端点，但如果仍然连接失败，可以尝试添加其他公共 RPC 端点：

1. 编辑 `scripts/deploy_with_metadata.js` 文件
2. 在 `RPC_ENDPOINTS.devnet` 数组中添加新的端点
3. 重新运行部署脚本

## 部署成功后

部署成功后，您将看到以下信息：

1. 程序 ID（合约地址）
2. 元数据账户地址
3. 交易签名

这些信息将自动更新到 `.env` 文件中。

## 在区块链浏览器查看代币

部署完成后，可以在 Solana 区块链浏览器查看代币信息：

1. 访问 [Solana Explorer](https://explorer.solana.com/?cluster=devnet)（选择 devnet 网络）
2. 输入程序 ID（合约地址）进行查询
3. 确认代币名称、符号、图标等信息正确显示

## 常见问题

### 1. 部署失败：网络连接问题

**症状**：出现 `fetch failed` 或 `timeout` 错误

**解决方案**：
- 检查网络连接
- 尝试使用不同的 RPC 端点
- 等待网络恢复后重试

### 2. 部署失败：余额不足

**症状**：出现 `Insufficient funds` 错误

**解决方案**：
- 确保部署者账户有足够的 SOL（至少 1 SOL）
- 使用 Solana CLI 获取测试网 SOL：`solana airdrop 1`

### 3. 部署成功但元数据未显示

**症状**：代币已部署但在区块链浏览器中看不到元数据

**解决方案**：
- 确认元数据交易已确认
- 检查元数据格式是否正确
- 等待区块链浏览器缓存更新（可能需要几分钟）