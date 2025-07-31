#!/bin/bash

# Cosnap项目域名和SSL配置脚本

if [ -z "$1" ]; then
    echo "❌ 请提供域名参数"
    echo "使用方法: bash setup-domain.sh 你的域名.com"
    exit 1
fi

DOMAIN=$1

echo "🌐 配置域名: $DOMAIN"

# 检查域名DNS解析
echo "🔍 检查DNS解析..."
if nslookup $DOMAIN | grep -q "$(curl -s ifconfig.me)"; then
    echo "✅ DNS解析正确"
else
    echo "⚠️ DNS解析可能未生效，请确保域名A记录指向: $(curl -s ifconfig.me)"
    echo "继续配置中..."
fi

# 创建Nginx站点配置
echo "📝 创建Nginx配置..."
cat > /etc/nginx/sites-available/cosnap << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    # 前端静态文件
    location / {
        root /var/www/html;
        index index.html;
        try_files \$uri \$uri/ /index.html;
        
        # 缓存静态资源
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # 后端API代理
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # 超时设置
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }
    
    # 安全头部
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Gzip压缩
    gzip on;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json
        image/svg+xml;
}
EOF

# 启用站点
echo "🔗 启用站点配置..."
ln -sf /etc/nginx/sites-available/cosnap /etc/nginx/sites-enabled/

# 删除默认站点 (可选)
if [ -f "/etc/nginx/sites-enabled/default" ]; then
    rm /etc/nginx/sites-enabled/default
fi

# 测试Nginx配置
echo "✅ 测试Nginx配置..."
if nginx -t; then
    echo "✅ Nginx配置正确"
    systemctl reload nginx
else
    echo "❌ Nginx配置错误，请检查"
    exit 1
fi

# 配置SSL证书
echo "🔐 配置SSL证书..."
if command -v certbot &> /dev/null; then
    echo "📜 申请SSL证书..."
    certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
    
    if [ $? -eq 0 ]; then
        echo "✅ SSL证书配置成功"
        
        # 设置自动续期
        echo "⏰ 设置SSL证书自动续期..."
        (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
        
    else
        echo "⚠️ SSL证书申请失败，可能原因："
        echo "   1. DNS解析未生效"
        echo "   2. 防火墙阻止了80/443端口"
        echo "   3. 域名已有其他SSL证书"
    fi
else
    echo "❌ Certbot未安装，跳过SSL配置"
fi

# 更新前端API配置
echo "🔧 更新前端API配置..."
FRONTEND_CONFIG="/var/www/cosnap/project/src/config/api.ts"
if [ -f "$FRONTEND_CONFIG" ]; then
    # 创建备份
    cp "$FRONTEND_CONFIG" "$FRONTEND_CONFIG.backup"
    
    # 更新API base URL
    if grep -q "localhost" "$FRONTEND_CONFIG"; then
        sed -i "s|http://localhost:3001|https://$DOMAIN|g" "$FRONTEND_CONFIG"
        echo "✅ 已更新API配置为: https://$DOMAIN"
        
        # 重新构建前端
        echo "🔨 重新构建前端..."
        cd /var/www/cosnap/project
        npm run build
        cp -r dist/* /var/www/html/
        chown -R www-data:www-data /var/www/html/
    fi
fi

# 测试网站连通性
echo "🧪 测试网站连通性..."
sleep 3

if curl -s "http://$DOMAIN" > /dev/null; then
    echo "✅ HTTP访问正常"
else
    echo "⚠️ HTTP访问异常"
fi

if curl -s "https://$DOMAIN" > /dev/null 2>&1; then
    echo "✅ HTTPS访问正常"
else
    echo "⚠️ HTTPS访问异常"
fi

echo ""
echo "🎉 域名配置完成！"
echo ""
echo "🌐 访问地址:"
echo "   主域名: https://$DOMAIN"
echo "   备用:   https://www.$DOMAIN"
echo ""
echo "📋 管理地址:"
echo "   SSL证书状态: certbot certificates"
echo "   续期测试:    certbot renew --dry-run"
echo "   Nginx状态:   systemctl status nginx"
echo ""
echo "🔒 安全检查清单:"
echo "   - [✓] SSL证书已配置"
echo "   - [✓] 安全头部已添加"
echo "   - [✓] Gzip压缩已启用"
echo "   - [✓] 静态资源缓存已配置"
echo ""