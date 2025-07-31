#!/bin/bash

# 🚀 快速部署脚本
echo "🚀 开始部署AI图像特效应用..."

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误：请在project目录下运行此脚本"
    exit 1
fi

# 检查Git状态
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  警告：有未提交的更改"
    read -p "是否继续部署？(y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ 部署已取消"
        exit 1
    fi
fi

# 安装依赖
echo "📦 安装依赖..."
npm install

# 构建项目
echo "🔨 构建项目..."
npm run build

# 检查构建是否成功
if [ ! -d "dist" ]; then
    echo "❌ 构建失败：dist目录不存在"
    exit 1
fi

echo "✅ 构建成功！"

# 显示部署选项
echo ""
echo "🎯 选择部署方式："
echo "1. Vercel (推荐)"
echo "2. Netlify"
echo "3. GitHub Pages"
echo "4. 仅构建，手动部署"

read -p "请选择 (1-4): " choice

case $choice in
    1)
        echo "🚀 部署到Vercel..."
        echo "请按照以下步骤操作："
        echo "1. 访问 https://vercel.com"
        echo "2. 使用GitHub账号登录"
        echo "3. 点击 'New Project'"
        echo "4. 选择您的GitHub仓库"
        echo "5. 配置构建设置："
        echo "   - Framework: Vite"
        echo "   - Root Directory: project"
        echo "   - Build Command: npm run build"
        echo "   - Output Directory: dist"
        echo "6. 设置环境变量"
        echo "7. 点击 'Deploy'"
        ;;
    2)
        echo "🚀 部署到Netlify..."
        echo "请按照以下步骤操作："
        echo "1. 访问 https://netlify.com"
        echo "2. 使用GitHub账号登录"
        echo "3. 点击 'New site from Git'"
        echo "4. 选择GitHub和您的仓库"
        echo "5. 配置构建设置："
        echo "   - Base directory: project"
        echo "   - Build command: npm run build"
        echo "   - Publish directory: dist"
        echo "6. 设置环境变量"
        echo "7. 点击 'Deploy site'"
        ;;
    3)
        echo "🚀 部署到GitHub Pages..."
        echo "安装gh-pages..."
        npm install --save-dev gh-pages
        
        echo "更新package.json..."
        # 这里需要手动更新package.json
        
        echo "部署到GitHub Pages..."
        npm run deploy
        ;;
    4)
        echo "✅ 构建完成！"
        echo "dist目录已准备好，可以手动部署到任何平台。"
        ;;
    *)
        echo "❌ 无效选择"
        exit 1
        ;;
esac

echo ""
echo "🎉 部署指南完成！"
echo "📖 详细说明请查看 DEPLOYMENT_GUIDE.md"