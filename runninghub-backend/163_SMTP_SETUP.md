# 163邮箱SMTP配置指南

## 为什么选择163邮箱？
- ✅ **完全免费**，无发送限制
- ✅ 国内服务器，投递速度快
- ✅ 配置简单，稳定可靠
- ✅ 替代Gmail的最佳选择

## 🚀 快速配置步骤

### 步骤1: 开启163邮箱SMTP服务

1. 登录你的163邮箱 (mail.163.com)
2. 点击右上角 **设置** → **POP3/SMTP/IMAP**
3. 勾选 **开启SMTP服务**
4. 设置**客户端授权码**（不是邮箱密码！）
5. 复制并保存这个授权码

### 步骤2: 配置环境变量

在生产环境中设置以下环境变量：

```bash
SMTP_HOST=smtp.163.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-username@163.com
SMTP_PASS=your-authorization-code  # 使用授权码，不是密码！
SMTP_FROM=your-username@163.com
SMTP_FROM_NAME=Cosnap AI
```

### 步骤3: 测试配置

```bash
# 运行测试脚本
node scripts/test-163-smtp.js
```

## 🔧 详细配置说明

### 163邮箱SMTP设置
- **服务器**: smtp.163.com
- **端口**: 465 (SSL) 或 25 (普通)
- **加密**: SSL/TLS
- **认证**: 需要使用客户端授权码

### 常见邮箱后缀支持
- `@163.com` - 163邮箱
- `@126.com` - 126邮箱（同样配置）
- `@yeah.net` - yeah邮箱（同样配置）

## ⚠️ 重要注意事项

1. **使用客户端授权码**，不是登录密码
2. **端口465使用SSL加密**，确保`SMTP_SECURE=true`
3. **如果465端口被封**，可以尝试25端口

## 🔍 故障排除

### 问题1: "535 Authentication failed"
**原因**: 使用了登录密码而不是客户端授权码
**解决**: 在163邮箱设置中生成并使用客户端授权码

### 问题2: "Connection timeout"
**原因**: 端口被防火墙阻拦
**解决**: 尝试使用25端口（普通连接）
```bash
SMTP_PORT=25
SMTP_SECURE=false
```

### 问题3: "Mail from must equal authorized user"
**原因**: `SMTP_FROM` 与 `SMTP_USER` 不匹配
**解决**: 确保两者使用相同的163邮箱地址

## 📊 性能对比

| 特性 | 163邮箱 | Gmail | SendGrid |
|------|---------|-------|----------|
| 费用 | 免费 | 需App密码 | 免费额度 |
| 国内速度 | 快 | 一般 | 一般 |
| 配置难度 | 简单 | 复杂 | 简单 |
| 投递率 | 高 | 高 | 最高 |

## 🎯 推荐配置

对于国内项目，推荐使用以下配置：

```env
# 163邮箱配置（推荐）
SMTP_HOST=smtp.163.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@163.com
SMTP_PASS=your-auth-code
SMTP_FROM=your-email@163.com
SMTP_FROM_NAME=Cosnap AI
```

## 📞 获取帮助

- **163邮箱帮助**: [网易邮箱帮助中心](http://help.163.com/)
- **SMTP设置帮助**: [客户端设置指南](http://help.163.com/09/1223/14/5R7P3QI100753VB8.html)

---

**配置时间**: 约5分钟  
**推荐指数**: ⭐⭐⭐⭐⭐  
**适用场景**: 国内项目的最佳选择