# 邮箱更改功能 API 文档

## 概述

本文档描述了安全的邮箱更改功能实现，包括双重验证（当前邮箱+新邮箱）、安全检查和操作日志。

## API 端点

### 1. 发送验证码 (扩展)

**端点:** `POST /auth/send-code`

**功能:** 发送邮箱验证码，现已支持邮箱更改场景

**请求体:**
```json
{
  "email": "user@example.com",
  "scene": "change_email"
}
```

**支持的场景:**
- `register` - 注册验证码
- `reset_password` - 密码重置验证码
- `delete_account` - 账户删除验证码
- `change_email` - 邮箱更改验证码 (新增)

**特殊验证 (change_email 场景):**
- 需要提供有效的 Authorization Bearer Token
- 检查新邮箱是否已被其他用户使用
- 防止向当前邮箱发送更改验证码

**响应:**
```json
{
  "success": true
}
```

**错误响应:**
```json
{
  "success": false,
  "error": "错误信息"
}
```

### 2. 邮箱更改 (新增)

**端点:** `POST /auth/change-email`

**功能:** 执行安全的邮箱更改，需要双重验证

**认证:** 需要 Bearer Token

**请求体:**
```json
{
  "newEmail": "newemail@example.com",
  "currentEmailCode": "123456",
  "newEmailCode": "654321",
  "password": "userPassword"
}
```

**安全检查:**
1. 验证用户密码
2. 检查新邮箱是否已被使用
3. 验证当前邮箱的验证码
4. 验证新邮箱的验证码
5. 防止设置相同邮箱

**成功响应:**
```json
{
  "success": true,
  "message": "邮箱更改成功，请重新登录",
  "user": {
    "id": "user-id",
    "username": "username",
    "email": "newemail@example.com"
  }
}
```

**错误响应:**
```json
{
  "success": false,
  "error": "错误信息"
}
```

**可能的错误:**
- `400` - 输入验证失败
- `401` - 密码错误/未登录
- `404` - 用户不存在
- `409` - 邮箱已被使用
- `500` - 服务器内部错误

## 安全特性

### 1. 双重验证
- 必须验证当前邮箱的验证码
- 必须验证新邮箱的验证码
- 两个验证码必须都有效且未过期

### 2. 密码验证
- 必须提供正确的当前密码
- 使用 bcrypt 进行密码验证

### 3. 邮箱唯一性检查
- 防止使用已被其他用户占用的邮箱
- 防止设置与当前相同的邮箱

### 4. 会话安全
- 邮箱更改后立即撤销所有刷新令牌
- 强制用户重新登录以确保安全

### 5. 操作日志
- 记录成功的邮箱更改操作
- 包含用户信息、IP地址、旧邮箱和新邮箱

### 6. Rate Limiting
- 使用 `sensitiveOperationLimiter` 限制请求频率
- 防止暴力攻击

## 邮件模板

系统支持不同场景的邮件模板：

### 邮箱更改验证码邮件
- 主题: "Cosnap 邮箱更改验证码"
- 包含安全提示信息
- 明确说明验证码用途和有效期

### 邮件内容特点
- 响应式HTML设计
- 包含品牌信息
- 安全警告提示
- 防钓鱼提醒

## 使用流程

### 完整的邮箱更改流程

1. **用户登录**
   ```bash
   POST /auth/login
   ```

2. **为当前邮箱发送验证码**
   ```bash
   POST /auth/send-code
   {
     "email": "current@example.com",
     "scene": "change_email"
   }
   ```

3. **为新邮箱发送验证码**
   ```bash
   POST /auth/send-code
   {
     "email": "new@example.com", 
     "scene": "change_email"
   }
   ```

4. **执行邮箱更改**
   ```bash
   POST /auth/change-email
   {
     "newEmail": "new@example.com",
     "currentEmailCode": "123456",
     "newEmailCode": "654321",
     "password": "userPassword"
   }
   ```

5. **重新登录**
   ```bash
   POST /auth/login
   {
     "email": "new@example.com",
     "password": "userPassword"
   }
   ```

## 测试

使用提供的测试脚本验证功能：

```bash
# 运行邮箱更改功能测试
node test-change-email.js [当前邮箱验证码] [新邮箱验证码]

# 示例
node test-change-email.js 123456 654321
```

测试脚本包含：
- 完整流程测试
- 安全性测试
- 错误处理测试
- 清理功能

## 数据库变更

无需数据库schema变更，使用现有的：
- `User` 表的 `email` 字段
- `VerificationCode` 表支持 `change_email` 场景
- `RefreshToken` 表用于撤销旧令牌

## 环境配置

确保邮件服务已配置：
```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
SMTP_FROM=noreply@cosnap.com
SMTP_FROM_NAME=Cosnap AI
SMTP_SECURE=false
```

## 监控和日志

所有操作都会记录详细日志：
- 成功的邮箱更改操作
- 失败的验证尝试
- 安全相关的异常行为

日志格式：
```
[邮箱更改] 成功 - 用户: username (user-id), IP: 192.168.1.1, 旧邮箱: old@example.com, 新邮箱: new@example.com
```

## 错误处理

系统提供详细的错误响应：
- 输入验证错误
- 业务逻辑错误
- 数据库约束错误
- 系统异常错误

所有错误都会记录在服务器日志中，便于调试和监控。