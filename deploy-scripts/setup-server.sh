#!/bin/bash

# Cosnap项目服务器初始化脚本
# 适用于Ubuntu 20.04/22.04

echo "🚀 开始初始化Cosnap服务器..."

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then 
    echo "❌ 请使用root权限运行此脚本"
    echo "使用方法: sudo bash setup-server.sh"
    exit 1
fi

# 更新系统
echo "📦 更新系统包..."
apt update && apt upgrade -y

# 安装基础工具
echo "🔧 安装基础工具..."
apt install -y curl wget git unzip software-properties-common

# 安装Node.js 18
echo "📦 安装Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# 验证Node.js安装
echo "✅ Node.js版本: $(node --version)"
echo "✅ NPM版本: $(npm --version)"

# 安装PM2
echo "🔄 安装PM2进程管理器..."
npm install -g pm2

# 安装Nginx
echo "🌐 安装Nginx..."
apt install -y nginx

# 启动并启用Nginx
systemctl start nginx
systemctl enable nginx

# 安装防火墙并配置
echo "🔒 配置防火墙..."
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 3001/tcp  # 后端API (可选，调试用)
echo "y" | ufw enable

# 创建项目目录
echo "📁 创建项目目录..."
mkdir -p /var/www/cosnap
chown -R www-data:www-data /var/www/cosnap

# 安装Certbot (SSL证书)
echo "🔐 安装SSL证书工具..."
snap install --classic certbot

# 创建日志目录
mkdir -p /var/log/cosnap
chown -R www-data:www-data /var/log/cosnap

echo ""
echo "✅ 服务器初始化完成！"
echo ""
echo "📋 下一步操作:"
echo "1. 克隆项目代码: git clone https://github.com/你的用户名/cosnap-project.git /var/www/cosnap"
echo "2. 配置环境变量: /var/www/cosnap/runninghub-backend/.env"
echo "3. 运行部署脚本: bash /var/www/cosnap/deploy-scripts/deploy.sh"
echo "4. 配置域名和SSL: bash /var/www/cosnap/deploy-scripts/setup-domain.sh 你的域名.com"
echo ""
echo "🌐 临时访问地址: http://$(curl -s ifconfig.me)"
echo ""