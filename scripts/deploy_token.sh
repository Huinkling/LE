#!/bin/bash
# LE代币部署脚本 - 使用SPL-Token CLI工具
# 此脚本用于在Solana的devnet网络上部署LE代币，包括创建代币、创建账户、铸造代币和设置元数据等操作

# 确保在devnet上操作 - 将Solana CLI配置切换到devnet测试网
echo "切换到devnet..."
solana config set --url devnet

# 检查SOL余额 - 部署需要一定的SOL作为交易费用
BALANCE=$(solana balance | awk '{print $1}')
echo "当前余额: $BALANCE SOL"

# 如果余额低于0.5 SOL，自动请求空投以确保有足够的SOL进行部署
if (( $(echo "$BALANCE < 0.5" | bc -l) )); then
  echo "余额不足，请求空投..."
  solana airdrop 2  # 请求2个SOL的空投
  sleep 5  # 等待空投交易确认
  echo "新余额: $(solana balance) SOL"
fi

# 创建代币 - 使用spl-token命令创建一个新的代币，设置小数位数为9
echo "创建LE代币..."
TOKEN_ADDRESS=$(spl-token create-token --decimals 9 | grep "Creating token" | awk '{print $3}')
echo "代币地址: $TOKEN_ADDRESS"

# 创建代币账户 - 为当前用户创建持有该代币的账户
echo "创建代币账户..."
TOKEN_ACCOUNT=$(spl-token create-account $TOKEN_ADDRESS | grep "Creating account" | awk '{print $3}')
echo "代币账户: $TOKEN_ACCOUNT"

# 铸造代币 - 创建1,000,000个代币并发送到我们的账户
echo "铸造1,000,000 LE代币..."
spl-token mint $TOKEN_ADDRESS 1000000

# 设置代币元数据 - 尝试设置代币的名称、符号和图片URI等元数据信息
# 注意：此功能需要安装spl-token-metadata CLI工具
echo "正在尝试设置代币元数据..."
if command -v spl-token-metadata &> /dev/null; then
  # 如果安装了spl-token-metadata工具，使用它来设置元数据
  spl-token-metadata create \
    --token $TOKEN_ADDRESS \
    --name "LE" \
    --symbol "LE" \
    --uri "assets/images/logo.png"
  echo "代币元数据已设置"
else
  # 如果未安装元数据工具，显示警告信息和安装指南
  echo "警告: spl-token-metadata 工具未安装，跳过元数据设置"
  echo "可以通过 'cargo install spl-token-metadata-cli' 安装"
fi

# 保存信息到文件 - 将代币相关信息保存到token-info.json文件以便后续使用
echo "保存代币信息到token-info.json..."
cat > token-info.json << EOL
{
  "tokenAddress": "$TOKEN_ADDRESS",
  "adminTokenAccount": "$TOKEN_ACCOUNT",
  "decimals": 9,
  "adminPublicKey": "$(solana address)",
  "network": "devnet",
  "metadata": {
    "name": "LE",
    "symbol": "LE",
    "uri": "assets/images/logo.png"
  }
}
EOL

# 部署完成后显示摘要信息
echo ""
echo "===== 部署完成 ====="
echo "代币地址: $TOKEN_ADDRESS"
echo "管理员代币账户: $TOKEN_ACCOUNT"
echo ""
# 提供查看代币的链接
echo "在浏览器中查看代币: https://explorer.solana.com/address/$TOKEN_ADDRESS?cluster=devnet"
echo "查看账户余额: https://explorer.solana.com/address/$TOKEN_ACCOUNT?cluster=devnet" 