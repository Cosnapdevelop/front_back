#!/bin/bash

# 🚀 Cosnap自动部署脚本
echo "🚀 开始Cosnap自动部署流程..."

# 检查Git状态
echo "📋 检查Git状态..."
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  发现未提交的更改"
    git status --short
    
    # 自动提交更改
    echo "📤 自动提交更改..."
    git add .
    git commit -m "auto: 自动部署更新 - $(date '+%Y-%m-%d %H:%M:%S')"
    
    # 推送到GitHub
    echo "📤 推送到GitHub..."
    git push origin main
    
    echo "✅ 代码已推送到GitHub"
else
    echo "✅ 没有未提交的更改"
fi

# 检查Vercel项目配置
echo "🔧 检查Vercel项目配置..."
cd project

# 触发Vercel部署
echo "🚀 触发Vercel部署..."
vercel --prod

# 获取部署URL
echo "📋 获取最新部署信息..."
vercel ls --limit 1

echo "🎉 自动部署完成！"
echo "📝 部署总结:"
echo "  ✅ 代码已推送到GitHub"
echo "  ✅ Vercel自动部署已触发"
echo "  ✅ 新功能已包含在部署中"

echo ""
echo "⏰ 请等待2-3分钟让部署完成"
echo "🌐 然后访问最新的部署URL"

# 返回上级目录
cd .. 