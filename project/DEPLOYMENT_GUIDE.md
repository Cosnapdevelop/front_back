# 🚀 部署指南 - 从零开始部署您的AI图像特效应用

## 📋 部署前准备

### 1. 确保代码已提交到Git
```bash
# 在项目根目录执行
git add .
git commit -m "准备部署"
git push origin main
```

### 2. 准备环境变量
创建 `.env.production` 文件（不要提交到Git）：
```bash
# 生产环境API地址（部署后端后更新）
VITE_API_BASE_URL=https://your-backend-domain.com

# RunningHub API Key
VITE_RUNNINGHUB_API_KEY=your_actual_api_key_here
```

## 🎯 方案1：Vercel部署（推荐）

### 步骤1：注册Vercel账号
1. 访问 [vercel.com](https://vercel.com)
2. 使用GitHub账号注册
3. 完成邮箱验证

### 步骤2：连接GitHub仓库
1. 在Vercel控制台点击 "New Project"
2. 选择您的GitHub仓库
3. 点击 "Import"

### 步骤3：配置部署设置
1. **Framework Preset**: 选择 "Vite"
2. **Root Directory**: 选择 `project` 文件夹
3. **Build Command**: `npm run build`
4. **Output Directory**: `dist`
5. **Install Command**: `npm install`

### 步骤4：设置环境变量
在Vercel项目设置中添加：
- `VITE_API_BASE_URL`: 您的后端API地址
- `VITE_RUNNINGHUB_API_KEY`: 您的RunningHub API Key

### 步骤5：部署
点击 "Deploy" 按钮，等待部署完成。

### 步骤6：获取域名
部署成功后，您会得到一个类似 `https://your-app.vercel.app` 的域名。

## 🎯 方案2：Netlify部署

### 步骤1：注册Netlify账号
1. 访问 [netlify.com](https://netlify.com)
2. 使用GitHub账号注册

### 步骤2：连接GitHub仓库
1. 点击 "New site from Git"
2. 选择GitHub，授权访问
3. 选择您的仓库

### 步骤3：配置构建设置
- **Base directory**: `project`
- **Build command**: `npm run build`
- **Publish directory**: `dist`

### 步骤4：设置环境变量
在Netlify设置中添加环境变量。

### 步骤5：部署
点击 "Deploy site" 开始部署。

## 🎯 方案3：GitHub Pages部署

### 步骤1：更新package.json
```json
{
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  },
  "devDependencies": {
    "gh-pages": "^3.2.3"
  }
}
```

### 步骤2：安装依赖
```bash
npm install --save-dev gh-pages
```

### 步骤3：部署
```bash
npm run deploy
```

## 🔧 后端部署

### 方案A：Railway（推荐）
1. 访问 [railway.app](https://railway.app)
2. 连接GitHub仓库
3. 选择后端文件夹 `runninghub-backend`
4. 设置环境变量：
   - `RUNNINGHUB_API_KEY`: 您的API Key
   - `PORT`: 3001
5. 部署后获取域名

### 方案B：Render
1. 访问 [render.com](https://render.com)
2. 创建新的Web Service
3. 连接GitHub仓库
4. 配置构建和启动命令

### 方案C：Heroku
1. 注册Heroku账号
2. 安装Heroku CLI
3. 创建应用并部署

## 🔗 连接前后端

### 1. 获取后端域名
部署后端后，您会得到一个域名，如：
`https://your-backend-app.railway.app`

### 2. 更新前端配置
在Vercel/Netlify的环境变量中设置：
```
VITE_API_BASE_URL=https://your-backend-app.railway.app
```

### 3. 重新部署前端
更新环境变量后，重新部署前端应用。

## 🌐 自定义域名（可选）

### Vercel自定义域名
1. 在Vercel项目设置中找到 "Domains"
2. 添加您的域名
3. 按照提示配置DNS记录

### Netlify自定义域名
1. 在Netlify设置中找到 "Domain management"
2. 添加自定义域名
3. 配置DNS记录

## 🔍 部署后测试

### 1. 功能测试
- 访问应用首页
- 测试图片上传功能
- 测试背景替换特效
- 检查图片库功能

### 2. 性能测试
- 测试大文件上传
- 检查加载速度
- 验证响应式设计

### 3. 错误监控
- 检查浏览器控制台错误
- 监控API调用状态
- 查看服务器日志

## 🛠️ 常见问题解决

### 问题1：API调用失败
**解决**: 检查环境变量是否正确设置，确保后端域名可访问。

### 问题2：图片上传失败
**解决**: 检查RunningHub API Key是否正确，确保有足够的配额。

### 问题3：构建失败
**解决**: 检查package.json中的依赖是否正确，确保所有文件都已提交。

### 问题4：路由问题
**解决**: 确保部署配置中的路由重定向设置正确。

## 📞 获取帮助

如果遇到问题：
1. 查看部署平台的日志
2. 检查浏览器开发者工具
3. 查看GitHub Issues
4. 联系技术支持

## 🎉 部署完成

部署成功后，您就可以通过公网域名访问您的AI图像特效应用了！

**示例域名**: `https://your-app.vercel.app`

现在任何人都可以通过这个链接访问您的应用了！