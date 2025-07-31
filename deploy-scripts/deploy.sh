#!/bin/bash

# Cosnap项目自动部署脚本

echo "🚀 开始部署Cosnap项目..."

# 设置项目路径
PROJECT_DIR="/var/www/cosnap"
BACKEND_DIR="$PROJECT_DIR/runninghub-backend"
FRONTEND_DIR="$PROJECT_DIR/project"

# 检查项目目录是否存在
if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ 项目目录不存在: $PROJECT_DIR"
    echo "请先克隆项目: git clone https://github.com/你的用户名/cosnap-project.git $PROJECT_DIR"
    exit 1
fi

cd $PROJECT_DIR

# 拉取最新代码
echo "📥 拉取最新代码..."
git pull origin main

# 部署后端
echo "⚙️ 部署后端服务..."
cd $BACKEND_DIR

# 检查.env文件
if [ ! -f ".env" ]; then
    echo "⚠️ 未找到.env文件，创建模板..."
    cat > .env << EOF
# RunningHub API配置
RUNNINGHUB_API_KEY=请填入你的API密钥
RUNNINGHUB_WEBAPP_ID=请填入你的WebApp_ID

# 云存储配置（可选）
CLOUD_STORAGE_ACCESS_KEY=
CLOUD_STORAGE_SECRET_KEY=

# 端口配置
PORT=3001

# 环境
NODE_ENV=production
EOF
    echo "❌ 请编辑 $BACKEND_DIR/.env 文件并填入正确的配置"
    exit 1
fi

# 安装后端依赖
echo "📦 安装后端依赖..."
npm install --production

# 检查PM2进程是否存在
if pm2 list | grep -q "cosnap-backend"; then
    echo "🔄 重启后端服务..."
    pm2 restart cosnap-backend
else
    echo "🚀 启动后端服务..."
    pm2 start src/index.js --name "cosnap-backend" --log "/var/log/cosnap/backend.log"
fi

# 保存PM2配置
pm2 save
pm2 startup

# 部署前端
echo "🎨 部署前端应用..."
cd $FRONTEND_DIR

# 安装前端依赖
echo "📦 安装前端依赖..."
npm install

# 构建前端
echo "🔨 构建前端应用..."
npm run build

# 复制构建文件到Nginx目录
echo "📁 复制文件到Web目录..."
rm -rf /var/www/html/*
cp -r dist/* /var/www/html/

# 设置权限
chown -R www-data:www-data /var/www/html/

# 重新加载Nginx
echo "🌐 重新加载Nginx..."
nginx -t && systemctl reload nginx

# 检查服务状态
echo ""
echo "📊 服务状态检查:"
echo "===================="

# 检查后端状态
if pm2 list | grep -q "cosnap-backend.*online"; then
    echo "✅ 后端服务: 运行中"
else
    echo "❌ 后端服务: 异常"
    echo "   查看日志: pm2 logs cosnap-backend"
fi

# 检查Nginx状态
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx服务: 运行中"
else
    echo "❌ Nginx服务: 异常"
fi

# 检查端口
if netstat -tuln | grep -q ":3001"; then
    echo "✅ 后端端口: 3001 已开启"
else
    echo "❌ 后端端口: 3001 未开启"
fi

if netstat -tuln | grep -q ":80"; then
    echo "✅ Web端口: 80 已开启"
else
    echo "❌ Web端口: 80 未开启"
fi

echo ""
echo "🎉 部署完成！"
echo ""
echo "📍 访问地址:"
echo "   HTTP:  http://$(curl -s ifconfig.me)"
echo "   本地:  http://localhost"
echo ""
echo "📋 管理命令:"
echo "   查看后端日志: pm2 logs cosnap-backend"
echo "   重启后端:     pm2 restart cosnap-backend"
echo "   查看进程:     pm2 status"
echo "   重启Nginx:    systemctl restart nginx"
echo ""

# 运行简单测试
echo "🧪 运行连通性测试..."
if curl -s http://localhost/api/health > /dev/null 2>&1; then
    echo "✅ API连接正常"
else
    echo "⚠️ API连接测试失败，请检查后端服务"
fi

echo "✨ 部署脚本执行完毕！"