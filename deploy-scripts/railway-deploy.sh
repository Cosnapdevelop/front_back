#!/bin/bash

# Cosnap项目Railway免费部署脚本
# 用于将后端部署到Railway平台

echo "🚂 Cosnap Railway部署助手"
echo "========================="

# 检查是否安装了Railway CLI
if ! command -v railway &> /dev/null; then
    echo "📦 正在安装Railway CLI..."
    
    # 检测操作系统
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        curl -fsSL https://railway.app/install.sh | sh
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # Mac OS
        brew install railway
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
        # Windows
        echo "请手动安装Railway CLI:"
        echo "访问: https://docs.railway.app/develop/cli#install"
        exit 1
    fi
fi

# 检查项目结构
if [ ! -d "runninghub-backend" ]; then
    echo "❌ 未找到后端项目目录 'runninghub-backend'"
    echo "请在Cosnap项目根目录运行此脚本"
    exit 1
fi

cd runninghub-backend

# 检查package.json
if [ ! -f "package.json" ]; then
    echo "❌ 未找到package.json文件"
    exit 1
fi

# 创建railway.json配置文件
echo "📝 创建Railway配置文件..."
cat > railway.json << EOF
{
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/",
    "healthcheckTimeout": 100,
    "restartPolicyType": "never"
  }
}
EOF

# 创建.railwayignore文件
echo "📁 创建.railwayignore文件..."
cat > .railwayignore << EOF
node_modules/
*.log
.env.local
.env.development
.env.test
.git/
.gitignore
README.md
test/
docs/
EOF

# 确保package.json有正确的启动脚本
echo "🔧 检查package.json配置..."
if ! grep -q '"start"' package.json; then
    echo "添加启动脚本到package.json..."
    sed -i 's/"scripts": {/"scripts": {\n    "start": "node src\/index.js",/' package.json
fi

# 创建健康检查端点 (如果不存在)
echo "🏥 添加健康检查端点..."
if [ ! -f "src/routes/health.js" ]; then
    mkdir -p src/routes
    cat > src/routes/health.js << EOF
import express from 'express';
const router = express.Router();

// 健康检查端点
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Cosnap Backend',
    version: '1.0.0'
  });
});

export default router;
EOF

    # 在主app中添加健康检查路由 (如果还没有)
    if [ -f "src/index.js" ] && ! grep -q "health" src/index.js; then
        sed -i '/import.*routes/a import healthRoutes from '"'"'./routes/health.js'"'"';\napp.use('"'"'/'"'"', healthRoutes);' src/index.js
    fi
fi

# 提示用户配置环境变量
echo ""
echo "⚠️ 重要：Railway部署需要以下环境变量："
echo "============================================"
echo ""
echo "🔑 必需的环境变量:"
echo "   RUNNINGHUB_API_KEY=你的RunningHub API密钥"
echo "   RUNNINGHUB_WEBAPP_ID=你的WebApp ID"
echo "   PORT=3001"
echo "   NODE_ENV=production"
echo ""
echo "🌐 可选的环境变量:"
echo "   CLOUD_STORAGE_ACCESS_KEY=云存储访问密钥"
echo "   CLOUD_STORAGE_SECRET_KEY=云存储密钥"
echo ""

read -p "是否继续部署到Railway? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 开始部署到Railway..."
    
    # 登录Railway (如果未登录)
    echo "🔑 检查Railway登录状态..."
    if ! railway whoami > /dev/null 2>&1; then
        echo "请先登录Railway..."
        railway login
    fi
    
    # 初始化Railway项目
    echo "🎯 初始化Railway项目..."
    railway init
    
    # 设置环境变量提醒
    echo ""
    echo "📝 请在Railway控制台设置环境变量:"
    echo "======================================"
    echo "1. 运行: railway open"
    echo "2. 转到 Variables 标签页"
    echo "3. 添加以下变量:"
    echo "   RUNNINGHUB_API_KEY"
    echo "   RUNNINGHUB_WEBAPP_ID" 
    echo "   PORT=3001"
    echo "   NODE_ENV=production"
    echo ""
    
    read -p "已配置环境变量? 按Enter继续部署..." -r
    
    # 部署到Railway
    echo "📤 部署中..."
    railway up
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "🎉 部署成功！"
        echo ""
        echo "📋 获取部署URL:"
        echo "==============="
        
        # 获取部署域名
        echo "🌐 获取项目URL..."
        railway status
        
        echo ""
        echo "💡 管理你的Railway项目:"
        echo "======================="
        echo "• 查看项目: railway open"
        echo "• 查看日志: railway logs"
        echo "• 重新部署: railway up"
        echo "• 查看状态: railway status"
        echo ""
        echo "🔗 下一步:"
        echo "1. 复制上方显示的项目URL"
        echo "2. 在前端项目中更新API_BASE_URL"
        echo "3. 部署前端到Vercel"
        
    else
        echo "❌ 部署失败，请检查错误信息"
        echo ""
        echo "🔍 常见问题排查:"
        echo "==============="
        echo "• 检查package.json是否有start脚本"
        echo "• 确认所有依赖都在dependencies中"
        echo "• 检查环境变量是否正确设置"
        echo "• 查看Railway日志: railway logs"
    fi
else
    echo "⏹️ 部署已取消"
fi

echo ""
echo "💡 Railway使用提示:"
echo "==================="
echo "• 免费额度: 每月500小时运行时间"
echo "• 自动HTTPS和负载均衡"
echo "• 连接GitHub自动部署"
echo "• 内置数据库支持"
echo ""
echo "📖 更多帮助: https://docs.railway.app/"