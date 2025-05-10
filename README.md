# LE Token - Solana积分与代币系统

这是一个基于Solana区块链的积分与代币系统，用于与iOS应用和微信小程序集成，实现积分的自动记录和管理，以及积分兑换代币功能。

## 功能特点

- 每日签到获取积分
- 邀请新用户注册（奖励积分指数级减小）
- 观看广告获取积分（每日限量）
- 参加社区活动获取积分（通过二维码扫描）
- 所有积分变动自动记录到Solana区块链
- 积分可兑换为LE代币（仅管理员操作）
- 代币信息可在区块链浏览器查看

## 项目结构

- `src/lib.rs`: Solana智能合约代码
- `src/api/main.rs`: API服务，作为iOS应用和区块链的桥梁
- `scripts/`: 包含部署和管理代币的各种脚本
  - `deploy_token.sh`: Bash脚本，用于部署代币到devnet
  - `distribute_token.sh`: Bash脚本，用于分发代币给用户
  - `simple_deploy.js`: JavaScript部署脚本
  - `add_metadata.js`: 为代币添加元数据的脚本
  - `distribute_tokens.js`: JavaScript分发脚本
- `assets/`: 包含代币相关资源
  - `metadata.json`: 代币元数据文件，定义代币显示信息
  - `images/`: 存放代币图标

## 元数据文件详解

`assets/metadata.json`文件定义了代币的元数据信息，JSON格式包含以下字段：

- `name`: 代币名称，显示在钱包和浏览器中
- `symbol`: 代币符号，类似股票代码的简短标识
- `description`: 代币描述，说明代币的用途和功能
- `image`: 代币图标的路径或URL
- `attributes`: 代币属性，提供额外的分类和信息
  - `trait_type`: 属性类型
  - `value`: 属性值

## 快速部署指南

我们提供了简化的脚本来部署LE代币和管理代币分发。

### 前提条件

- Solana CLI工具 (`solana`, `spl-token`)
- Node.js和npm (可选，用于JS脚本)
- bash或类Unix终端

### 使用Bash脚本部署和管理代币

#### 部署代币

```bash
# 部署代币到devnet
./scripts/deploy_token.sh
```

部署完成后，脚本会输出代币地址和其他相关信息，并将信息保存到`token-info.json`文件中。

#### 分发代币

```bash
# 分发代币给指定接收者
./scripts/distribute_token.sh <接收者地址> <数量>

# 示例：分发50个代币
./scripts/distribute_token.sh AcXiZ6WVQ9hAfnCdTXSNae3NWxNGMBNn5uhHqpY2c98w 50
```

分发成功后，脚本会输出交易详情并将记录保存到`transaction-history.json`文件中。

### 使用JavaScript脚本部署和管理代币

我们也提供了基于JavaScript的部署和管理脚本：

```bash
# 安装依赖
npm install

# 部署代币
npm run simple-deploy

# 添加代币元数据（需安装metaplex依赖）
npm run add-metadata

# 分发代币
npm run distribute <接收者地址> <数量>
```

## 设置代币图标

要为LE代币设置自定义图标，请将您的图标文件保存为此目录中的logo.png

```
assets/images/logo.png
```

理想的图片尺寸为：512x512像素
文件格式：PNG（推荐使用透明背景）
文件大小：不超过200KB

代币元数据将自动引用此路径中的图标。

## 在区块链浏览器查看代币

部署完成后，可以在Solana区块链浏览器查看代币信息：

1. 访问 https://explorer.solana.com/?cluster=devnet
2. 输入代币地址(可在token-info.json中找到)进行查询
3. 查看代币信息和交易记录

## 安装和运行原始项目

### 前提条件

- Rust和Cargo
- Solana CLI工具

### 安装依赖

```bash
cargo build
```

### 部署Solana程序

1. 生成部署密钥（如果没有）
```bash
solana-keygen new -o deploy-keypair.json
```

2. 获取测试SOL（如果在devnet上测试）
```bash
solana airdrop 2 $(solana-keygen pubkey deploy-keypair.json) --url devnet
```

3. 构建并部署程序
```bash
cargo build-bpf
solana program deploy --keypair deploy-keypair.json --url devnet target/deploy/le_token.so
```

4. 记录程序ID（合约地址）
```bash
echo "程序ID: $(solana address -k deploy-keypair.json)"
```

### 配置环境变量

编辑`.env`文件，设置以下变量：

- `SOLANA_RPC_URL`: Solana网络URL（devnet或mainnet）
- `PROGRAM_ID`: 部署的程序ID（上一步获取的地址）
- `ADMIN_PUBKEY`: 管理员钱包公钥
- `ADMIN_API_KEYS`: 管理员API密钥（用于授权管理操作）

### 启动API服务

```bash
cargo run --bin le_api
```

## API接口

### 用户注册

```
POST /api/register
```

### 每日签到

```
POST /api/check-in
```

### 观看广告

```
POST /api/view-ad
```

### 邀请新用户

```
POST /api/refer
```

### 社区活动

```
POST /api/community-activity
```

### 生成二维码

```
GET /api/qr-code/{user_id}
```

### 查询积分

```
GET /api/points/{user_id}
```

### 获取代币信息

```
GET /api/token-info
```

### 积分兑换代币（仅管理员）

```
POST /api/exchange
```

请求参数：
```json
{
  "user_id": "用户ID",
  "admin_key": "管理员密钥",
  "points_amount": 100
}
```

## iOS应用集成

在iOS应用中，可以通过HTTP请求调用上述API接口，实现积分的自动记录和管理。

## 许可证

MIT