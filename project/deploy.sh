#!/bin/bash

# Cosnap自动部署脚本
# 解决Vercel缓存和强制部署问题

echo "🚀 开始Cosnap自动部署流程..."

# 1. 检查Git状态
echo "📋 检查Git状态..."
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  发现未提交的更改，正在提交..."
    git add .
    git commit -m "auto: 自动部署更新 $(date '+%Y-%m-%d %H:%M:%S')"
    git push origin main
else
    echo "✅ Git工作目录干净"
fi

# 2. 清理Vercel缓存
echo "🧹 清理Vercel缓存..."
vercel --prod --force

# 3. 等待部署完成
echo "⏳ 等待部署完成..."
sleep 10

# 4. 检查部署状态
echo "🔍 检查部署状态..."
vercel ls --limit 1

# 5. 测试部署
echo "🧪 测试部署..."
DEPLOY_URL=$(vercel ls --limit 1 --json | jq -r '.[0].url')
echo "部署地址: $DEPLOY_URL"

# 6. 健康检查
echo "🏥 执行健康检查..."
curl -f -I "$DEPLOY_URL" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ 部署成功！"
    echo "🌐 访问地址: $DEPLOY_URL"
else
    echo "❌ 部署失败，请检查日志"
    exit 1
fi

echo "🎉 自动部署完成！"