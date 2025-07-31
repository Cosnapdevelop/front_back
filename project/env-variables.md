# 环境变量配置说明

## 📝 环境变量列表

### 必需的环境变量

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `VITE_API_BASE_URL` | 后端API地址 | `https://your-backend.railway.app` |
| `VITE_RUNNINGHUB_API_KEY` | RunningHub API密钥 | `your_api_key_here` |

### 可选的环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `NODE_ENV` | 运行环境 | `production` |
| `PORT` | 后端服务端口 | `3001` |

## 🔧 如何设置环境变量

### 开发环境
创建 `.env.local` 文件：
```bash
VITE_API_BASE_URL=http://localhost:3001
VITE_RUNNINGHUB_API_KEY=your_api_key_here
```

### 生产环境
在部署平台（Vercel/Netlify）中设置：
1. 进入项目设置
2. 找到 "Environment Variables"
3. 添加上述变量

## 🚨 安全注意事项

1. **不要提交API密钥到Git**
   - 将 `.env.local` 添加到 `.gitignore`
   - 使用环境变量而不是硬编码

2. **定期更新API密钥**
   - 定期检查RunningHub API密钥是否有效
   - 及时更新过期的密钥

3. **限制API访问**
   - 在RunningHub控制台设置API访问限制
   - 监控API使用量

## 📋 部署检查清单

- [ ] 设置 `VITE_API_BASE_URL` 为后端域名
- [ ] 设置 `VITE_RUNNINGHUB_API_KEY` 为有效API密钥
- [ ] 确保后端服务正常运行
- [ ] 测试API连接是否正常
- [ ] 验证图片上传功能
- [ ] 检查背景替换特效是否工作