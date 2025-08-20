# Chinese Payment System Implementation for Cosnap AI

## 概述 (Overview)

本文档详细介绍了为 Cosnap AI 实现的中国支付系统，支持微信支付和支付宝支付，并包含完整的订阅管理和免费增值商业模式。

This document provides a comprehensive guide to the Chinese payment system implemented for Cosnap AI, supporting WeChat Pay and Alipay with complete subscription management and freemium business model.

## 🏗️ 系统架构 (System Architecture)

### 核心组件 (Core Components)

1. **Payment Gateway** (`paymentGateway.js`) - 统一支付网关抽象层
2. **WeChat Pay Service** (`wechatPayService.js`) - 微信支付集成
3. **Alipay Service** (`alipayService.js`) - 支付宝支付集成
4. **Subscription Service** (`subscriptionService.js`) - 订阅管理服务
5. **Payment Middleware** (`chinesePayment.js`) - 支付中间件和验证
6. **Payment Routes** (`payments.js`) - 支付API路由

### 数据库设计 (Database Schema)

#### 新增模型 (New Models)

- **Subscription** - 订阅记录
- **Payment** - 支付记录
- **UsageHistory** - 使用历史
- **PaymentWebhook** - 回调记录
- **ChineseConfig** - 配置管理

#### 枚举类型 (Enums)

- `SubscriptionTier`: FREE, PRO, VIP
- `SubscriptionStatus`: INACTIVE, ACTIVE, EXPIRED, CANCELLED, SUSPENDED
- `PaymentMethod`: WECHAT_PAY, ALIPAY
- `PaymentStatus`: PENDING, PAID, FAILED, REFUNDED, CANCELLED
- `UsageType`: AI_EFFECT, IMAGE_UPLOAD, PRIORITY_PROCESSING, EXCLUSIVE_EFFECT

## 💰 商业模式 (Business Model)

### 订阅等级 (Subscription Tiers)

#### 免费版 (FREE)
- 每月5次AI特效处理
- 带水印输出
- 基础特效库
- 社区支持

#### 专业版 (PRO)
- **月度**: ¥29.9
- **季度**: ¥79.9 (3个月)
- **年度**: ¥299.9 (12个月)
- 无限AI特效处理
- 无水印输出
- 优先处理队列
- 邮件技术支持

#### 会员版 (VIP)
- **月度**: ¥59.9
- **季度**: ¥159.9 (3个月)
- **年度**: ¥599.9 (12个月)
- 所有专业版功能
- 独家特效库
- 最高优先级处理
- 专属技术支持
- 新功能抢先体验

## 🔧 技术实现 (Technical Implementation)

### 微信支付集成 (WeChat Pay Integration)

#### 支持的支付方式
- **JSAPI** - 公众号支付
- **H5** - H5支付
- **Native** - 扫码支付
- **App** - APP支付

#### 核心功能
```javascript
// 创建统一下单
const orderResult = await wechatPay.createUnifiedOrder({
  outTradeNo: 'ORDER_123',
  body: 'Cosnap AI 专业版订阅',
  totalFee: 2990, // 29.90元 = 2990分
  tradeType: 'JSAPI',
  openid: 'user_openid'
});

// 处理支付回调
const notification = await wechatPay.handleNotification(xmlData);
```

### 支付宝集成 (Alipay Integration)

#### 支持的支付方式
- **Web** - 电脑网站支付
- **WAP** - 手机网站支付
- **App** - APP支付
- **QR Code** - 当面付扫码

#### 核心功能
```javascript
// 创建网站支付
const paymentResult = await alipay.createWebPayment({
  outTradeNo: 'ORDER_123',
  subject: 'Cosnap AI 专业版订阅',
  totalAmount: 29.90,
  body: '专业版月度订阅'
});

// 处理支付回调
const notification = await alipay.handleNotification(formData);
```

### 订阅管理 (Subscription Management)

#### 使用限制检查
```javascript
// 检查用户是否可以使用功能
const accessCheck = await subscriptionService.canUseFeature(
  userId, 
  'AI_EFFECT'
);

if (!accessCheck.allowed) {
  return res.status(403).json({
    message: accessCheck.reason,
    code: accessCheck.code
  });
}
```

#### 使用记录
```javascript
// 记录功能使用
await subscriptionService.recordUsage(
  userId,
  'AI_EFFECT',
  '使用AI特效: 人像美化',
  effectId,
  taskId
);
```

## 🛡️ 安全特性 (Security Features)

### 签名验证 (Signature Verification)

#### 微信支付签名
```javascript
// MD5签名验证
const isValid = wechatPay.verifySign(params, signature, apiKey);
```

#### 支付宝签名
```javascript
// RSA2签名验证
const isValid = alipay.verifySign(params, signature);
```

### 安全中间件 (Security Middleware)

- 支付请求频率限制
- 客户端IP验证
- User-Agent检查
- 支付环境安全检测
- 原始数据解析和验证

## 📡 API接口 (API Endpoints)

### 订阅管理 API
```
GET    /api/payments/pricing           # 获取价格表
GET    /api/payments/subscription      # 获取用户订阅状态
GET    /api/payments/usage-stats       # 获取使用统计
POST   /api/payments/cancel-subscription # 取消订阅
```

### 支付管理 API
```
POST   /api/payments/create-order      # 创建支付订单
GET    /api/payments/:paymentId/status # 查询支付状态
POST   /api/payments/refund           # 申请退款
```

### 回调接口 API
```
POST   /api/payments/webhooks/wechat  # 微信支付回调
POST   /api/payments/webhooks/alipay  # 支付宝回调
GET    /api/payments/return/wechat    # 微信支付返回
GET    /api/payments/return/alipay    # 支付宝返回
```

### 系统监控 API
```
GET    /api/payments/test             # 测试接口
GET    /api/payments/health           # 健康检查
```

## 🔧 环境配置 (Environment Configuration)

### 微信支付配置
```env
WECHAT_MCH_ID=your-merchant-id
WECHAT_APP_ID=your-app-id
WECHAT_APP_SECRET=your-app-secret
WECHAT_API_KEY=your-api-key
WECHAT_NOTIFY_URL=https://your-domain.com/api/payments/webhooks/wechat
WECHAT_CERT_PATH=/path/to/cert.pem
WECHAT_KEY_PATH=/path/to/key.pem
```

### 支付宝配置
```env
ALIPAY_APP_ID=your-app-id
ALIPAY_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...-----END PRIVATE KEY-----
ALIPAY_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----...-----END PUBLIC KEY-----
ALIPAY_PUBLIC_KEY_OFFICIAL=-----BEGIN PUBLIC KEY-----...-----END PUBLIC KEY-----
ALIPAY_GATEWAY_URL=https://openapi.alipay.com/gateway.do
ALIPAY_NOTIFY_URL=https://your-domain.com/api/payments/webhooks/alipay
ALIPAY_RETURN_URL=https://your-domain.com/api/payments/return/alipay
```

## 🚀 部署指南 (Deployment Guide)

### 1. 数据库迁移
```bash
# 推送数据库结构变更
npm run db:push

# 或者使用迁移（推荐用于生产环境）
npx prisma migrate deploy
```

### 2. 安装依赖
```bash
# 安装新增的支付相关依赖
npm install crypto xml2js raw-body moment node-rsa
```

### 3. 环境变量配置
复制 `.env.example` 到 `.env` 并配置所有必要的环境变量。

### 4. 启动服务
```bash
npm start
```

## 🧪 测试指南 (Testing Guide)

### 健康检查
```bash
curl http://localhost:3001/api/payments/health
```

### 获取价格表
```bash
curl http://localhost:3001/api/payments/pricing
```

### 创建测试订单
```bash
curl -X POST http://localhost:3001/api/payments/create-order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "subscriptionTier": "PRO",
    "billingCycle": "monthly",
    "paymentMethod": "WECHAT_PAY",
    "tradeType": "JSAPI",
    "openId": "test_openid"
  }'
```

## 🔒 合规要求 (Compliance Requirements)

### 微信支付合规
- 商户资质认证
- 经营范围符合要求
- 支付安全认证
- 用户隐私保护

### 支付宝合规
- 企业实名认证
- 业务资质证明
- 风险控制措施
- 数据安全保护

### 数据保护
- 用户敏感信息加密存储
- 支付数据安全传输
- 访问日志记录
- 定期安全审计

## 🐛 故障排除 (Troubleshooting)

### 常见问题

#### 1. 微信支付回调验签失败
```
检查API密钥是否正确
确认回调数据格式
验证签名算法实现
```

#### 2. 支付宝回调处理失败
```
检查RSA密钥格式
确认公钥配置正确
验证应用授权范围
```

#### 3. 订阅状态不同步
```
检查数据库事务
确认回调处理逻辑
验证定时任务执行
```

### 日志监控
```javascript
// 启用支付日志
ENABLE_PAYMENT_LOGGING=true

// 查看支付相关日志
tail -f logs/payment.log
```

## 📊 监控指标 (Monitoring Metrics)

### 关键指标
- 支付成功率
- 回调处理成功率
- 订阅转化率
- 用户流失率
- 收入增长率

### 告警设置
- 支付失败率超过5%
- 回调处理延迟超过30秒
- 数据库连接异常
- API响应时间超过2秒

## 🔄 未来优化 (Future Enhancements)

### 短期计划
1. 添加Redis缓存支持
2. 实现更精细的权限控制
3. 支持更多支付方式
4. 优化支付流程用户体验

### 长期计划
1. 机器学习驱动的定价策略
2. 智能推荐系统
3. 国际化支付支持
4. 区块链支付集成

## 📞 技术支持 (Technical Support)

如遇到技术问题，请联系开发团队或查看相关文档：

- 微信支付官方文档: https://pay.weixin.qq.com/wiki/doc/api/index.html
- 支付宝开放平台: https://open.alipay.com/
- Prisma文档: https://www.prisma.io/docs/

---

**注意**: 在生产环境部署前，请确保所有安全配置已正确设置，并通过充分的测试验证系统稳定性。