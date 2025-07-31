# 🚀 快速部署指南

## ⚡ 5分钟快速部署

### 第一步：准备代码
```bash
# 确保所有代码已提交到Git
git add .
git commit -m "准备部署"
git push origin main
```

### 第二步：部署后端（Railway）
1. 访问 [railway.app](https://railway.app)
2. 使用GitHub账号登录
3. 点击 "New Project" → "Deploy from GitHub repo"
4. 选择您的仓库，选择 `runninghub-backend` 文件夹
5. 设置环境变量：
   - `RUNNINGHUB_API_KEY`: 您的RunningHub API密钥
   - `PORT`: 3001
6. 部署完成后，复制域名（如：`https://your-app.railway.app`）

### 第三步：部署前端（Vercel）
1. 访问 [vercel.com](https://vercel.com)
2. 使用GitHub账号登录
3. 点击 "New Project" → 选择您的仓库
4. 配置构建设置：
   - Framework: Vite
   - Root Directory: `project`
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. 设置环境变量：
   - `VITE_API_BASE_URL`: 第二步获得的后端域名
   - `VITE_RUNNINGHUB_API_KEY`: 您的RunningHub API密钥
6. 点击 "Deploy"

### 第四步：测试应用
1. 访问Vercel提供的域名
2. 测试图片上传功能
3. 测试背景替换特效
4. 检查图片库功能

## 🎯 部署完成！

您的应用现在可以通过公网访问了！
域名示例：`https://your-app.vercel.app`

## 🔧 如果遇到问题

### 常见问题1：API调用失败
**解决**: 检查环境变量是否正确设置

### 常见问题2：构建失败
**解决**: 确保所有依赖都已安装

### 常见问题3：图片上传失败
**解决**: 检查RunningHub API密钥是否有效

## 📞 需要帮助？

查看详细部署指南：`DEPLOYMENT_GUIDE.md`