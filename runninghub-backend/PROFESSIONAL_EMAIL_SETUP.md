# 专业邮箱服务配置指南

## 🏆 推荐的专业邮箱服务

### 1. SendGrid（最推荐）⭐⭐⭐⭐⭐

**为什么推荐**: 高投递率、免费额度充足、配置简单

**免费额度**: 每月100封邮件永久免费
**收费**: $14.95/月（40,000封邮件）

#### 配置步骤
1. 注册 [SendGrid账户](https://sendgrid.com)
2. 验证邮箱和设置发件人认证
3. 生成API密钥
4. 配置环境变量：

```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key  # SG.开头的API密钥
SMTP_FROM=your-verified-email@yourdomain.com
SMTP_FROM_NAME=Cosnap AI
```

**优势**:
- ✅ 业界最高投递率（>95%）
- ✅ 详细的邮件分析和统计
- ✅ 自动处理退信和投诉
- ✅ 支持模板和个性化

---

### 2. Amazon SES（最便宜）💰

**为什么选择**: 超低价格，AWS生态集成

**免费额度**: 每月200封（从EC2发送）
**收费**: $0.10/1000封邮件（超便宜！）

#### 配置步骤
1. 登录 [AWS控制台](https://aws.amazon.com/ses/)
2. 开启SES服务并验证发件人邮箱
3. 创建SMTP凭证
4. 配置环境变量：

```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com  # 根据区域调整
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-ses-access-key-id
SMTP_PASS=your-ses-secret-access-key
SMTP_FROM=your-verified-email@yourdomain.com
SMTP_FROM_NAME=Cosnap AI
```

**优势**:
- ✅ 价格最便宜
- ✅ 与AWS服务深度集成
- ✅ 高可靠性和扩展性
- ✅ 支持多区域部署

---

### 3. Mailgun（欧美推荐）🌍

**为什么选择**: 欧美用户投递率高，开发友好

**免费额度**: 前3个月每月5,000封
**收费**: $15/月（10,000封邮件）

#### 配置步骤
1. 注册 [Mailgun账户](https://www.mailgun.com)
2. 验证域名或使用sandbox域名
3. 获取API密钥和SMTP凭证
4. 配置环境变量：

```bash
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=postmaster@your-mailgun-domain.mailgun.org
SMTP_PASS=your-mailgun-smtp-password
SMTP_FROM=noreply@your-mailgun-domain.mailgun.org
SMTP_FROM_NAME=Cosnap AI
```

**优势**:
- ✅ 欧美地区投递率高
- ✅ 强大的API和Webhook支持
- ✅ 详细的日志和分析
- ✅ 支持批量发送

---

## 🇨🇳 国内专业服务

### 4. 阿里云邮件推送

**适合**: 国内项目，需要备案域名

**免费额度**: 每月200封
**收费**: ¥1/1000封

```bash
SMTP_HOST=smtpdm.aliyun.com
SMTP_PORT=80
SMTP_SECURE=false
SMTP_USER=your-aliyun-email-account
SMTP_PASS=your-aliyun-email-password
SMTP_FROM=noreply@your-domain.com  # 需要备案域名
SMTP_FROM_NAME=Cosnap AI
```

### 5. 腾讯云邮件服务

**适合**: 腾讯云用户

**免费额度**: 每月1000封
**收费**: ¥1/1000封

```bash
SMTP_HOST=smtp.qcloudmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-tencent-email-account
SMTP_PASS=your-tencent-email-password
SMTP_FROM=noreply@your-domain.com
SMTP_FROM_NAME=Cosnap AI
```

---

## 📊 服务对比表

| 服务 | 免费额度 | 价格/月 | 投递率 | 配置难度 | 推荐指数 |
|------|----------|---------|--------|----------|----------|
| SendGrid | 100封 | $14.95 | 最高 | 简单 | ⭐⭐⭐⭐⭐ |
| Amazon SES | 200封* | $0.10/1K | 高 | 中等 | ⭐⭐⭐⭐⭐ |
| Mailgun | 5K封/3个月 | $15 | 高 | 简单 | ⭐⭐⭐⭐ |
| 163邮箱 | 无限制 | 免费 | 中等 | 最简单 | ⭐⭐⭐⭐ |
| 阿里云 | 200封 | ¥1/1K | 中等 | 复杂 | ⭐⭐⭐ |

*需要从EC2发送

---

## 🎯 推荐选择策略

### 项目初期（推荐163邮箱）
- 完全免费，配置简单
- 适合开发和测试阶段
- 国内投递速度快

### 项目成长期（推荐SendGrid）
- 100封/月足够小项目使用
- 专业级投递率和分析
- 后续扩展方便

### 大型项目（推荐Amazon SES）
- 成本最低，按量付费
- 高可靠性和扩展性
- 适合高发送量场景

---

## 🔧 快速部署脚本

选择服务后，运行对应的测试脚本：

```bash
# 测试SendGrid配置
node scripts/test-sendgrid-smtp.js

# 测试Amazon SES配置
node scripts/test-ses-smtp.js

# 测试163邮箱配置
node scripts/test-163-smtp.js
```

---

## 📞 获取支持

- **SendGrid文档**: https://docs.sendgrid.com/
- **Amazon SES文档**: https://docs.aws.amazon.com/ses/
- **Mailgun文档**: https://documentation.mailgun.com/
- **阿里云邮推文档**: https://help.aliyun.com/product/29412.html

---

**建议**: 先使用163邮箱快速解决当前问题，项目上线后再根据发送量选择专业服务。