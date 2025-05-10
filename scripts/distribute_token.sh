#!/bin/bash
# LE代币分发脚本 - 管理员功能
# 此脚本用于将LE代币从管理员账户分发给指定的接收者地址
# 自动处理接收者账户的创建、代币转账以及交易记录

# 检查命令行参数是否完整
if [ $# -lt 2 ]; then
  # 如果参数不足，显示用法说明
  echo "用法: ./distribute_token.sh <接收者地址> <数量>"
  echo "例如: ./distribute_token.sh AcXiZ6WVQ9hAfnCdTXSNae3NWxNGMBNn5uhHqpY2c98w 100"
  exit 1
fi

# 保存命令行参数 - 接收者地址和数量
RECEIVER=$1  # 第一个参数：接收者的Solana钱包地址
AMOUNT=$2    # 第二个参数：要转账的代币数量

# 确保在devnet测试网上操作
echo "确保在devnet上操作..."
solana config set --url devnet

# 检查token-info.json文件是否存在，此文件包含了代币的关键信息
if [ ! -f "token-info.json" ]; then
  echo "错误: token-info.json不存在，请先运行部署脚本"
  exit 1
fi

# 从token-info.json中提取代币地址信息
TOKEN_ADDRESS=$(cat token-info.json | grep -o '"tokenAddress": "[^"]*' | cut -d'"' -f4)

# 验证是否成功获取了代币地址
if [ -z "$TOKEN_ADDRESS" ]; then
  echo "错误: 无法从token-info.json中获取代币地址"
  exit 1
fi

echo "代币地址: $TOKEN_ADDRESS"

# 直接转账给接收者地址，自动创建和资助接收者的代币账户
# --allow-unfunded-recipient: 允许向未持有该代币的地址转账
# --fund-recipient: 资助接收者创建关联代币账户的SOL费用
echo "从管理员向 $RECEIVER 转移 $AMOUNT 个LE代币..."
TRANSFER_RESULT=$(spl-token transfer $TOKEN_ADDRESS $AMOUNT $RECEIVER --allow-unfunded-recipient --fund-recipient)

# 显示转账操作的完整结果
echo "$TRANSFER_RESULT"

# 从转账结果中提取交易签名和接收者关联代币账户地址
TX_SIGNATURE=$(echo "$TRANSFER_RESULT" | grep "Signature:" | awk '{print $2}')
RECEIVER_ACCOUNT=$(echo "$TRANSFER_RESULT" | grep "Recipient associated token account:" | awk '{print $5}')

# 验证交易签名是否成功获取，如果未获取则说明交易失败
if [ -z "$TX_SIGNATURE" ]; then
  echo "转账失败，未能获取交易签名"
  exit 1
fi

# 显示转账成功信息和相关链接
echo "转账成功! 交易签名: $TX_SIGNATURE"
echo "在浏览器中查看: https://explorer.solana.com/tx/$TX_SIGNATURE?cluster=devnet"

# 如果成功获取接收者账户地址，显示查看余额的链接
if [ ! -z "$RECEIVER_ACCOUNT" ]; then
  echo "接收者可以在这里查看余额: https://explorer.solana.com/address/$RECEIVER_ACCOUNT?cluster=devnet"
fi

# 记录交易历史 - 保存每次交易的详细信息，便于后续查询和审计
echo "记录交易到历史记录..."
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")  # 使用ISO 8601标准时间格式
ADMIN_PUBKEY=$(solana address)  # 获取当前管理员的公钥地址

# 创建或加载现有的交易历史文件
if [ ! -f "transaction-history.json" ]; then
  # 如果文件不存在，创建一个空的JSON数组
  echo "[]" > transaction-history.json
fi

# 使用jq工具将新交易添加到JSON数组中
# jq是一个命令行JSON处理工具，能够优雅地处理JSON文件
TMP_FILE=$(mktemp)  # 创建临时文件
jq --arg timestamp "$TIMESTAMP" \
   --arg from "$ADMIN_PUBKEY" \
   --arg to "$RECEIVER" \
   --arg amount "$AMOUNT" \
   --arg txSignature "$TX_SIGNATURE" \
   --arg receiverAccount "$RECEIVER_ACCOUNT" \
   '. += [{"timestamp": $timestamp, "from": $from, "to": $to, "amount": $amount, "txSignature": $txSignature, "receiverAccount": $receiverAccount}]' \
   transaction-history.json > "$TMP_FILE" && mv "$TMP_FILE" transaction-history.json 2>/dev/null

# 如果jq命令失败（例如系统未安装jq），使用简单的文本记录方式
if [ $? -ne 0 ]; then
  echo "警告: jq命令不可用，使用简单方式记录交易"
  echo "{\"timestamp\": \"$TIMESTAMP\", \"from\": \"$ADMIN_PUBKEY\", \"to\": \"$RECEIVER\", \"amount\": \"$AMOUNT\", \"txSignature\": \"$TX_SIGNATURE\", \"receiverAccount\": \"$RECEIVER_ACCOUNT\"}" >> transaction-history.txt
fi

# 操作完成提示
echo "交易已添加到历史记录"
echo ""
echo "接收者 $RECEIVER 现在拥有 $AMOUNT 个LE代币!" 