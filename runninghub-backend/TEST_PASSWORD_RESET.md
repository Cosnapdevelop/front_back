# 密码重置功能测试指南

## 环境变量配置

确保以下环境变量已正确配置：

```bash
# JWT配置
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_RESET_SECRET=your-reset-secret-key   # 新增：密码重置专用密钥
JWT_ISSUER=cosnap-api
JWT_AUDIENCE=cosnap-app

# 前端URL配置
FRONTEND_URL=http://localhost:5173   # 开发环境
# FRONTEND_URL=https://your-domain.com   # 生产环境

# SMTP邮件配置（参考现有配置）
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com
SMTP_FROM_NAME=Cosnap AI
```

## 数据库迁移

确保运行Prisma迁移以创建新的密码重置令牌表：

```bash
cd runninghub-backend
npm run db:push
```

## API端点测试

### 1. 发起密码重置请求
```bash
curl -X POST http://localhost:3001/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'
```

期望响应：
```json
{
  "success": true,
  "message": "如果该邮箱已注册，您将收到重置链接"
}
```

### 2. 验证重置令牌
```bash
curl -X GET http://localhost:3001/api/auth/reset-password/{TOKEN}
```

期望响应（有效令牌）：
```json
{
  "success": true,
  "email": "test@example.com"
}
```

### 3. 执行密码重置
```bash
curl -X POST http://localhost:3001/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "your-reset-token",
    "password": "NewPassword123!",
    "confirmPassword": "NewPassword123!"
  }'
```

期望响应：
```json
{
  "success": true,
  "message": "密码重置成功，请使用新密码登录"
}
```

## 安全特性验证

### 频率限制测试
- 密码重置请求：每小时最多3次
- 令牌验证：每15分钟最多20次
- 密码重置执行：每小时最多3次

### 令牌安全性测试
- 令牌有效期：1小时
- 一次性使用：使用后自动失效
- 用户状态检查：封禁/非活跃用户无法重置

### 密码安全性测试
- 密码强度要求：8-128位，包含大小写字母、数字和特殊字符
- 防止重复密码：新密码不能与当前密码相同
- 会话失效：重置后撤销所有刷新令牌

## 监控和日志

密码重置操作会产生详细的安全日志：
- 请求记录：IP地址、用户代理、成功/失败状态
- 错误追踪：具体错误类型和代码
- 审计跟踪：令牌创建、验证和使用记录

## 故障排除

### 常见错误
1. **JWT_RESET_SECRET未配置**：检查环境变量
2. **数据库表不存在**：运行Prisma迁移
3. **邮件发送失败**：检查SMTP配置
4. **令牌无效**：检查令牌格式和过期时间
5. **密码验证失败**：检查密码强度要求

### 开发环境测试
如果SMTP未配置，重置链接会打印到控制台日志中，便于开发测试。