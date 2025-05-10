#!/bin/bash

# LE代币元数据更新脚本
# 此脚本用于更新Solana上LE代币的元数据

# 颜色设置
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # 无颜色

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}         LE代币元数据更新工具        ${NC}"
echo -e "${BLUE}======================================================${NC}"

# 检查Node.js环境
if ! command -v node &> /dev/null; then
    echo -e "${RED}错误: 未找到Node.js${NC}"
    echo "请安装Node.js后再运行此脚本"
    exit 1
fi

# 检查token-info.json是否存在
if [ ! -f "./token-info.json" ]; then
    echo -e "${RED}错误: 未找到token-info.json文件${NC}"
    echo "请确保您已经运行过部署脚本并创建了代币"
    exit 1
fi

# 检查部署密钥是否存在
if [ ! -f "./deploy-keypair.json" ]; then
    echo -e "${RED}错误: 未找到deploy-keypair.json文件${NC}"
    echo "请确保您的部署密钥文件存在"
    exit 1
fi

echo -e "${YELLOW}警告: 更新元数据前，请确保您已经将代币图标上传到Arweave或IPFS${NC}"
echo "元数据需要公开可访问的图片URL才能在区块链浏览器中正确显示"
echo ""
echo -e "${YELLOW}您已准备好图标URL了吗? (Y/n)${NC}"
read -r response

if [[ "$response" =~ ^([nN][oO]|[nN])$ ]]; then
    echo -e "${BLUE}请使用以下资源上传您的图片:${NC}"
    echo "1. Arweave上传工具: https://token-creator-lac.vercel.app/uploader"
    echo "2. Pinata (IPFS): https://www.pinata.cloud/"
    echo "3. NFT.Storage: https://nft.storage/"
    echo ""
    echo "上传完成后，请编辑scripts/update_metadata.js文件，"
    echo "将uri变量更新为您的图片URL"
    exit 0
fi

echo -e "${GREEN}开始更新LE代币元数据...${NC}"

# 执行更新脚本
node scripts/update_metadata.js

# 检查执行结果
if [ $? -eq 0 ]; then
    echo -e "${GREEN}======================================================${NC}"
    echo -e "${GREEN}元数据更新完成!${NC}"
    echo -e "${GREEN}======================================================${NC}"
    echo "您现在可以在Solana浏览器中检查您的代币了:"
    TOKEN_ADDRESS=$(cat token-info.json | grep tokenAddress | cut -d '"' -f 4)
    echo -e "${BLUE}https://explorer.solana.com/address/$TOKEN_ADDRESS?cluster=devnet${NC}"
else
    echo -e "${RED}元数据更新失败，请检查错误信息${NC}"
fi

echo ""
echo -e "${YELLOW}请注意: 元数据更新后可能需要一段时间才会在浏览器中更新显示${NC}" 