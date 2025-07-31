# 🚀 Cosnap项目部署完整指南

> 本指南专为完全新手编写，从零开始教您如何将Cosnap项目部署到云服务器并获得公网访问链接。

## 📋 目录
1. [项目架构说明](#项目架构说明)
2. [部署方案选择](#部署方案选择)
3. [准备工作](#准备工作)
4. [方案一：免费部署（推荐新手）](#方案一免费部署推荐新手)
5. [方案二：云服务器部署（生产环境）](#方案二云服务器部署生产环境)
6. [域名配置](#域名配置)
7. [常见问题](#常见问题)

---

## 📐 项目架构说明

您的Cosnap项目包含两个主要部分：

### 🎨 前端 (project/)
- **技术栈**: React + TypeScript + Vite
- **功能**: 用户界面，图片上传，效果预览
- **端口**: 默认5173 (开发) / 80 (生产)

### ⚙️ 后端 (runninghub-backend/)
- **技术栈**: Node.js + Express
- **功能**: API接口，图片处理，调用RunningHub
- **端口**: 默认3001

### 🔗 部署架构图
```
用户 → [域名] → [前端网站] → [后端API] → [RunningHub服务]
      cosnap.com   (React)     (Node.js)    (AI处理)
```

---

## 🎯 部署方案选择

### 🆓 免费方案（推荐新手）
- **前端**: Vercel/Netlify
- **后端**: Railway/Render
- **成本**: 免费
- **适合**: 学习、测试、小流量

### 💰 付费方案（生产环境）
- **云服务器**: 阿里云/腾讯云/AWS
- **成本**: 50-200元/月
- **适合**: 正式运营、大流量

---

## 🛠 准备工作

### 1. 安装必要工具

#### Windows用户:
```bash
# 下载并安装 Node.js (推荐LTS版本)
# 访问: https://nodejs.org/

# 下载并安装 Git
# 访问: https://git-scm.com/

# 验证安装
node --version
npm --version
git --version
```

### 2. 注册必要账号
- [ ] GitHub账号 (代码托管)
- [ ] Vercel账号 (前端部署)
- [ ] Railway账号 (后端部署)
- [ ] 域名注册商账号 (可选)

### 3. 环境变量配置

创建 `runninghub-backend/.env` 文件：
```env
# RunningHub API配置
RUNNINGHUB_API_KEY=你的API密钥
RUNNINGHUB_WEBAPP_ID=你的WebApp_ID

# 云存储配置（可选）
CLOUD_STORAGE_ACCESS_KEY=云存储访问密钥
CLOUD_STORAGE_SECRET_KEY=云存储密钥

# 端口配置
PORT=3001
```

---

## 🆓 方案一：免费部署（推荐新手）

### 第一步：代码上传到GitHub

1. **创建GitHub仓库**
```bash
# 在GitHub网站创建新仓库: cosnap-project
# 勾选"Add a README file"
```

2. **上传本地代码**
```bash
# 在项目根目录执行
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/你的用户名/cosnap-project.git
git push -u origin main
```

### 第二步：部署后端到Railway

1. **访问Railway.app并登录**
2. **点击"New Project" → "Deploy from GitHub repo"**
3. **选择你的仓库，设置根目录为 `runninghub-backend`**
4. **添加环境变量**：
   - `RUNNINGHUB_API_KEY`: 你的API密钥
   - `RUNNINGHUB_WEBAPP_ID`: 你的WebApp ID
   - `PORT`: 3001

5. **等待部署完成，获得后端URL**：
   ```
   https://你的项目名.railway.app
   ```

### 第三步：部署前端到Vercel

1. **访问Vercel.com并登录**
2. **点击"New Project" → "Import Git Repository"**
3. **选择你的仓库，设置根目录为 `project`**
4. **配置环境变量**：
   ```env
   VITE_API_BASE_URL=https://你的后端域名.railway.app
   ```

5. **等待部署完成，获得前端URL**：
   ```
   https://你的项目名.vercel.app
   ```

### 第四步：更新前端API配置

修改 `project/src/config/api.ts`：
```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://你的后端域名.railway.app';

export const RUNNING_HUB_CONFIG = {
  // ... 其他配置
  API_BASE_URL
};
```

---

## 💰 方案二：云服务器部署（生产环境）

### 购买云服务器

#### 阿里云ECS (推荐)
- **配置**: 2核4G，40G SSD
- **系统**: Ubuntu 20.04 LTS
- **成本**: 约80-120元/月

#### 腾讯云CVM
- **配置**: 2核4G，50G SSD
- **系统**: Ubuntu 20.04 LTS
- **成本**: 约70-100元/月

### 服务器初始化

```bash
# 连接服务器
ssh root@你的服务器IP

# 更新系统
apt update && apt upgrade -y

# 安装Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# 安装PM2 (进程管理)
npm install -g pm2

# 安装Nginx (反向代理)
apt install nginx -y

# 安装Git
apt install git -y
```

### 部署代码

```bash
# 克隆代码
cd /var/www
git clone https://github.com/你的用户名/cosnap-project.git
cd cosnap-project

# 部署后端
cd runninghub-backend
npm install
# 创建.env文件并填入配置
pm2 start src/index.js --name "cosnap-backend"

# 部署前端
cd ../project
npm install
npm run build

# 复制构建文件到Nginx目录
cp -r dist/* /var/www/html/
```

### 配置Nginx

创建 `/etc/nginx/sites-available/cosnap`：
```nginx
server {
    listen 80;
    server_name 你的域名.com;
    
    # 前端静态文件
    location / {
        root /var/www/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    # 后端API代理
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用站点：
```bash
ln -s /etc/nginx/sites-available/cosnap /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

---

## 🌐 域名配置

### 购买域名
- **国内**: 阿里云、腾讯云、西数 (需备案)
- **国外**: Namecheap、GoDaddy (无需备案)
- **成本**: 50-100元/年

### 配置DNS解析

在域名管理后台添加A记录：
```
类型: A
名称: @
值: 你的服务器IP地址
TTL: 600
```

### SSL证书配置 (HTTPS)

```bash
# 安装Certbot
snap install --classic certbot

# 获取SSL证书
certbot --nginx -d 你的域名.com

# 自动续期
crontab -e
# 添加: 0 12 * * * /usr/bin/certbot renew --quiet
```

---

## 🔧 自动化部署脚本

创建 `deploy.sh`：
```bash
#!/bin/bash
echo "🚀 开始部署Cosnap项目..."

# 拉取最新代码
git pull origin main

# 部署后端
echo "📦 部署后端..."
cd runninghub-backend
npm install
pm2 restart cosnap-backend

# 部署前端
echo "🎨 部署前端..."
cd ../project
npm install
npm run build
cp -r dist/* /var/www/html/

echo "✅ 部署完成！"
echo "🌐 访问地址: https://你的域名.com"
```

使用方法：
```bash
chmod +x deploy.sh
./deploy.sh
```

---

## ❓ 常见问题

### Q1: 前端无法连接后端API
**解决方案**:
1. 检查后端是否正常运行: `pm2 status`
2. 检查防火墙设置: `ufw status`
3. 验证API地址配置是否正确

### Q2: 图片上传失败
**解决方案**:
1. 检查RunningHub API密钥是否正确
2. 查看后端日志: `pm2 logs cosnap-backend`
3. 确认云存储配置 (大文件上传)

### Q3: 域名访问404错误
**解决方案**:
1. 检查DNS解析是否生效: `nslookup 你的域名.com`
2. 验证Nginx配置: `nginx -t`
3. 检查防火墙80/443端口

### Q4: HTTPS证书问题
**解决方案**:
1. 确认域名DNS已生效
2. 检查防火墙开放80/443端口
3. 重新申请证书: `certbot --nginx -d 你的域名.com`

### Q5: 性能优化建议
**优化方案**:
1. 启用Nginx gzip压缩
2. 配置静态资源缓存
3. 使用CDN加速 (可选)
4. 数据库优化 (如需要)

---

## 🎉 部署成功检查清单

- [ ] 后端API正常响应
- [ ] 前端页面正常显示
- [ ] 图片上传功能正常
- [ ] AI效果处理正常
- [ ] HTTPS证书有效
- [ ] 域名解析正确
- [ ] 监控和日志配置

---

## 📞 需要帮助？

如果您在部署过程中遇到任何问题，可以：

1. **查看日志**: `pm2 logs cosnap-backend`
2. **检查状态**: `pm2 status`
3. **重启服务**: `pm2 restart all`
4. **查看Nginx错误**: `tail -f /var/log/nginx/error.log`

---

**祝您部署成功！🎉**

现在您的Cosnap项目已经可以通过公网访问了！