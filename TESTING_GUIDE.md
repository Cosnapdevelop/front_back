# 🧪 Cosnap AI 测试完整指导

## 📋 测试环境选择

### 🌐 云端测试 (推荐优先)
**优点**: 验证真实部署环境，测试用户实际体验  
**缺点**: 调试较困难，修改需要重新部署

### 💻 本地测试
**优点**: 快速调试，实时修改，详细日志  
**缺点**: 环境差异可能导致结果不同

---

## 🚀 方案1: 云端测试 (10分钟快速验证)

### 步骤1: 获取你的部署URL
```
前端 (Vercel): https://your-app-name.vercel.app
后端 (Render):  https://your-backend-name.onrender.com
```

### 步骤2: 云端API健康检查
在浏览器中访问:
```
https://your-backend-name.onrender.com/api/health
```
✅ **期望结果**: 
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2024-xx-xx"
}
```

### 步骤3: 云端前端访问测试
在浏览器中访问:
```
https://your-app-name.vercel.app
```
✅ **检查项目**:
- [ ] 页面正常加载
- [ ] 没有控制台错误
- [ ] 登录/注册按钮可见
- [ ] 页面样式正常显示

### 步骤4: 用户注册流程测试
1. 点击注册按钮
2. 填写测试信息:
   - 邮箱: `test@cosnap-$(date +%s).com`
   - 用户名: `testuser$(date +%s)`  
   - 密码: `TestPassword123!`
3. 提交注册

✅ **期望结果**: 成功注册并跳转到主页

### 步骤5: AI效果测试
1. 上传一张图片 (建议<5MB)
2. 选择一个AI效果
3. 点击处理

✅ **期望结果**: 任务提交成功，显示处理状态

### 云端测试脚本
我为你创建一个云端API测试脚本:
```bash
# 将你的URL替换到这里
export BACKEND_URL="https://your-backend-name.onrender.com"
export FRONTEND_URL="https://your-app-name.vercel.app"

# 测试后端健康
curl -s "$BACKEND_URL/api/health" | jq .

# 测试前端可访问性
curl -s -I "$FRONTEND_URL" | head -1
```

---

## 🔧 方案2: 本地测试 (完整开发测试)

### 前置条件检查
```bash
# 检查Node.js版本
node --version    # 应该是 v18+ 

# 检查npm版本  
npm --version     # 应该是 8+

# 检查环境变量文件
ls -la */**.env*  # 检查.env文件是否存在
```

### 步骤1: 启动后端服务器
```bash
cd runninghub-backend

# 检查环境变量
echo "DATABASE_URL: $DATABASE_URL"
echo "RUNNINGHUB_API_KEY: $RUNNINGHUB_API_KEY"

# 安装依赖 (如果需要)
npm install

# 启动开发服务器
npm start
```
✅ **期望输出**: 
```
🚀 Server running on port 3001
✅ Database connected
🔑 RunningHub API configured
```

### 步骤2: 启动前端服务器  
```bash
# 新开一个终端窗口
cd project

# 安装依赖 (如果需要)
npm install

# 启动开发服务器
npm run dev
```
✅ **期望输出**:
```
  Local:   http://localhost:5173/
  Network: http://192.168.x.x:5173/
```

### 步骤3: 运行后端API测试
```bash
cd runninghub-backend

# API密钥测试
node test-api-key.js

# 文件上传测试
node test-upload.js

# Cosnap配置测试
node test-cosnap-config.js
```

### 步骤4: 前端UI测试
在浏览器访问 `http://localhost:5173`

✅ **测试检查清单**:
- [ ] 页面加载无错误
- [ ] 注册/登录表单工作
- [ ] 文件上传组件显示正确
- [ ] 错误消息友好显示
- [ ] 响应式设计在手机/桌面正常

### 步骤5: 集成测试
```bash
# 前端单元测试
cd project
npm run test

# E2E测试 (如果配置了)
npm run test:e2e
```

---

## 🎯 具体测试场景

### 📸 文件上传测试
**测试用例**:
1. **正常图片** (1-5MB JPG/PNG)
2. **大文件** (接近10MB) - 应该正常上传
3. **超大文件** (>10MB) - 应该显示错误或使用云存储
4. **错误格式** (TXT文件) - 应该被拒绝

### 🔐 认证流程测试
**测试用例**:
1. **新用户注册** - 应该成功并自动登录
2. **已存在邮箱** - 应该显示友好错误
3. **弱密码** - 应该提示密码要求
4. **Token过期** - 应该自动刷新或提示重新登录

### 🎨 AI效果测试
**测试用例**:
1. **换背景效果** - 验证select参数正确传递
2. **任务状态查询** - 验证轮询机制
3. **结果展示** - 验证图片正常显示

---

## 🐛 常见问题和解决方案

### 后端启动问题
```bash
# 如果遇到数据库连接错误
echo "检查DATABASE_URL环境变量"
echo $DATABASE_URL

# 如果遇到端口占用
lsof -ti:3001 | xargs kill -9  # 杀死占用3001端口的进程
```

### 前端启动问题
```bash
# 如果遇到依赖问题
rm -rf node_modules package-lock.json
npm install

# 如果遇到端口占用
lsof -ti:5173 | xargs kill -9  # 杀死占用5173端口的进程
```

### API调用问题
1. **CORS错误**: 检查后端CORS配置
2. **401认证错误**: 检查JWT token
3. **网络错误**: 检查API端点URL

---

## 📊 测试报告模板

### 云端测试报告
```
日期: $(date)
测试环境: 云端部署

✅ 后端健康检查: [通过/失败]
✅ 前端访问: [通过/失败]  
✅ 用户注册: [通过/失败]
✅ 用户登录: [通过/失败]
✅ 文件上传: [通过/失败]
✅ AI效果处理: [通过/失败]

问题记录:
- 问题1: 描述和解决方案
- 问题2: 描述和解决方案
```

### 本地测试报告
```
日期: $(date)
测试环境: 本地开发

✅ 后端启动: [成功/失败]
✅ 前端启动: [成功/失败]
✅ API测试: [通过/失败]
✅ 单元测试: [通过/失败]  
✅ 集成测试: [通过/失败]

性能指标:
- 页面加载时间: X秒
- API响应时间: X毫秒
- 内存使用: XMB
```

---

## 🚀 推荐测试顺序

### 对于已部署的应用
1. **云端快速验证** (10分钟)
2. **发现问题时本地调试** (30分钟)  
3. **修复后重新部署验证** (15分钟)

### 对于开发中的功能
1. **本地开发测试** (持续)
2. **功能完成后云端验证** (每次功能完成)
3. **定期完整测试** (每周)

你想从哪个方案开始？我可以为你提供更详细的指导！