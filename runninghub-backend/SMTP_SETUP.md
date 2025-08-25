# 邮箱服务设置指南

## 问题说明

如果您遇到"验证码发送失败"的问题，这是因为邮箱服务（SMTP）需要额外配置。

## 解决方案

### 1. 复制环境配置文件
```bash
cd runninghub-backend
cp .env.example .env
```

### 2. 配置SMTP邮箱服务

在 `.env` 文件中找到邮箱配置部分并填写：

```env
# ==================== Email Service Configuration ====================
SMTP_HOST="smtp.gmail.com"        # Gmail SMTP服务器
SMTP_PORT="587"                   # SMTP端口
SMTP_SECURE="false"               # TLS加密
SMTP_USER="your-email@gmail.com"  # 你的邮箱地址
SMTP_PASS="your-app-password"     # 你的应用密码（不是邮箱密码！）
SMTP_FROM="your-email@gmail.com"  # 发送邮件的地址
SMTP_FROM_NAME="Cosnap AI"        # 发送方名称
```

### 3. Gmail 应用密码设置

#### 步骤1：启用两步验证
1. 访问 [Google账户安全设置](https://myaccount.google.com/security)
2. 启用"两步验证"

#### 步骤2：生成应用密码
1. 在安全设置中找到"应用密码"
2. 选择"邮件"应用类型
3. 复制生成的16位密码
4. 将此密码填入 `SMTP_PASS`

### 4. 其他邮箱服务商配置

#### QQ邮箱
```env
SMTP_HOST="smtp.qq.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-qq-number@qq.com"
SMTP_PASS="your-auth-code"        # QQ邮箱授权码
```

#### 163邮箱
```env
SMTP_HOST="smtp.163.com"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER="your-username@163.com"
SMTP_PASS="your-auth-code"        # 163邮箱客户端授权码
```

### 5. 测试邮箱配置

重启服务后，尝试发送验证码：
```bash
npm start
```

## 开发环境说明

在开发环境中，如果未配置SMTP，验证码会在服务器日志中显示：

```
[验证码] email=test@example.com, scene=register, code=123456, expiresAt=2024-...
```

查看后端服务控制台即可找到验证码。

## 安全提醒

- 永远不要将 `.env` 文件提交到Git仓库
- 使用应用密码而不是账户密码
- 定期更换应用密码
- 考虑使用专门的SMTP服务（如SendGrid、Amazon SES）用于生产环境

## 故障排除

### 常见错误1：530 Authentication failed
- 检查用户名和密码是否正确
- 确认已启用两步验证并使用应用密码
- 确认SMTP服务器地址和端口正确

### 常见错误2：Connection timeout
- 检查网络连接
- 尝试不同的SMTP端口（587、465、25）
- 检查防火墙设置

### 常见错误3：Self signed certificate
- 对于开发环境，可以在emailService.js中添加：
```javascript
const transporter = nodemailer.createTransporter({
  // ... 其他配置
  tls: {
    rejectUnauthorized: false
  }
});
```

需要技术支持？请查看项目issues或联系开发团队。