#!/bin/bash

# Cosnap项目Vercel免费部署脚本
# 用于将前端部署到Vercel平台

echo "🌟 Cosnap Vercel部署助手"
echo "========================="

# 检查是否安装了Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "📦 正在安装Vercel CLI..."
    npm install -g vercel
fi

# 检查项目结构
if [ ! -d "project" ]; then
    echo "❌ 未找到前端项目目录 'project'"
    echo "请在Cosnap项目根目录运行此脚本"
    exit 1
fi

cd project

# 检查package.json
if [ ! -f "package.json" ]; then
    echo "❌ 未找到package.json文件"
    exit 1
fi

# 创建vercel.json配置文件
echo "📝 创建Vercel配置文件..."
cat > vercel.json << EOF
{
  "version": 2,
  "name": "cosnap-frontend",
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "handle": "filesystem"
    },
    {
      "src": "/.*",
      "dest": "/index.html"
    }
  ],
  "env": {
    "VITE_API_BASE_URL": "@vite_api_base_url"
  },
  "functions": {
    "app/api/**/*.js": {
      "runtime": "nodejs18.x"
    }
  }
}
EOF

# 创建构建命令脚本
echo "🔧 配置构建命令..."
if ! grep -q '"vercel-build"' package.json; then
    # 添加vercel-build脚本
    sed -i 's/"build": "vite build"/"build": "vite build",\n    "vercel-build": "npm run build"/' package.json
fi

# 提示用户配置环境变量
echo ""
echo "⚠️ 重要：在Vercel部署之前，请先准备以下信息："
echo "=================================================="
echo ""
echo "🔑 后端API地址:"
echo "   如果使用Railway部署后端: https://你的项目名.railway.app"
echo "   如果使用自己的服务器: https://你的域名.com"
echo ""
echo "📋 部署步骤:"
echo "1. 运行 'vercel' 命令开始部署"
echo "2. 选择项目设置 (首次部署)"
echo "3. 在Vercel控制台设置环境变量:"
echo "   VITE_API_BASE_URL = 你的后端API地址"
echo ""

read -p "是否继续部署到Vercel? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 开始部署到Vercel..."
    
    # 登录Vercel (如果未登录)
    echo "🔑 检查Vercel登录状态..."
    if ! vercel whoami > /dev/null 2>&1; then
        echo "请先登录Vercel..."
        vercel login
    fi
    
    # 部署到Vercel
    echo "📤 部署中..."
    vercel --prod
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "🎉 部署成功！"
        echo ""
        echo "📋 下一步操作:"
        echo "1. 访问 Vercel 控制台: https://vercel.com/dashboard"
        echo "2. 找到你的项目并点击进入"
        echo "3. 转到 Settings > Environment Variables"
        echo "4. 添加环境变量:"
        echo "   Name: VITE_API_BASE_URL"
        echo "   Value: 你的后端API完整地址 (如: https://xxx.railway.app)"
        echo "5. 保存后重新部署: vercel --prod"
        echo ""
        echo "🌐 你的网站地址会显示在上方输出中"
    else
        echo "❌ 部署失败，请检查错误信息"
    fi
else
    echo "⏹️ 部署已取消"
fi

echo ""
echo "💡 Vercel使用提示:"
echo "=================="
echo "• 免费额度: 每月100GB流量"
echo "• 自动HTTPS和CDN加速"
echo "• 连接GitHub自动部署"
echo "• 多环境支持 (preview/production)"
echo ""
echo "📖 更多帮助: https://vercel.com/docs"