# 🔄 Cosnap AI - 完整数据重置指南

## 概述

此指南将帮你完全清除 Cosnap AI 应用程序的所有用户数据，包括数据库和前端存储，以便进行全新的测试。

## ⚠️ 警告

**此操作将删除所有数据，包括：**
- 所有用户账户和认证信息
- 所有帖子、评论和互动记录
- 所有图片库和收藏夹
- 所有支付和订阅记录
- 所有性能分析数据

**仅在开发环境中使用！**

## 🚀 重置步骤

### 第一步：重置后端数据库

#### 方法 1：使用 npm 脚本（推荐）

```bash
# 进入后端目录
cd E:\desktop\Cosnap企划\code\ui\runninghub-backend

# 重置数据库
npm run reset:database

# 或者重置数据库并显示前端清理提示
npm run reset:all
```

#### 方法 2：直接运行脚本

```bash
# 进入后端目录
cd E:\desktop\Cosnap企划\code\ui\runninghub-backend

# 直接运行重置脚本
node scripts/reset-database.js
```

### 第二步：清除前端数据

确保前端开发服务器正在运行：

```bash
# 进入前端目录
cd E:\desktop\Cosnap企划\code\ui\project

# 启动开发服务器（如果尚未运行）
npm run dev
```

然后在浏览器中打开：
```
http://localhost:5173/reset-frontend.html
```

在打开的页面中：
1. 查看检测到的存储数据
2. 点击"清除所有前端数据"按钮
3. 确认清除操作

### 第三步：验证重置

重置完成后，验证以下内容：

1. **数据库为空**：
   ```bash
   cd runninghub-backend
   npx prisma studio
   ```
   打开 Prisma Studio 检查所有表是否为空

2. **前端存储为空**：
   - 打开浏览器开发者工具 (F12)
   - 检查 Application > Local Storage 是否为空
   - 检查 Application > Session Storage 是否为空

3. **应用程序状态**：
   - 访问 `http://localhost:5173`
   - 确认未登录状态
   - 确认图片库为空
   - 确认社区页面为空

## 📋 重置包含的数据表

以下数据表将被完全清空：

### 用户相关
- `User` - 用户账户
- `RefreshToken` - 刷新令牌
- `VerificationCode` - 验证码

### 社区功能
- `Post` - 帖子
- `Comment` - 评论
- `PostLike` - 帖子点赞
- `CommentLike` - 评论点赞
- `Notification` - 通知

### 支付系统
- `Subscription` - 订阅
- `Payment` - 支付记录
- `PaymentWebhook` - 支付回调
- `UsageHistory` - 使用历史

### 分析数据
- `PerformanceMetric` - 性能指标
- `PerformanceAlert` - 性能警告
- `ConversionFunnel` - 转化漏斗
- `UserEvent` - 用户事件
- `ApiResponseTime` - API响应时间

### 前端存储
- `localStorage` - 本地存储（图片库、设置等）
- `sessionStorage` - 会话存储
- `IndexedDB` - 索引数据库（如果有）
- 相关 Cookies

## 🔧 故障排除

### 数据库重置失败

如果数据库重置失败，可能的解决方案：

1. **检查数据库连接**：
   ```bash
   cd runninghub-backend
   npx prisma db push
   ```

2. **手动重置**：
   ```bash
   # 重置数据库架构
   npx prisma migrate reset --force
   
   # 推送最新架构
   npx prisma db push
   ```

3. **检查环境变量**：
   确认 `.env` 文件中的 `DATABASE_URL` 正确

### 前端清理失败

如果前端数据清理失败：

1. **手动清理 localStorage**：
   ```javascript
   // 在浏览器控制台中运行
   localStorage.clear();
   sessionStorage.clear();
   ```

2. **清除浏览器缓存**：
   - Chrome: Ctrl+Shift+Delete
   - 选择"所有时间"
   - 勾选所有选项并清除

3. **使用隐私模式**：
   打开新的隐私/无痕浏览器窗口进行测试

## 📝 测试检查清单

重置完成后，使用以下清单验证：

- [ ] 无法访问任何用户账户
- [ ] 首页显示"立即开始"状态
- [ ] 社区页面显示空状态
- [ ] 图片库为空
- [ ] 登录/注册功能正常工作
- [ ] 可以创建新用户账户
- [ ] 新用户可以正常使用所有功能

## 🆘 需要帮助？

如果遇到问题：

1. 检查控制台错误信息
2. 确认所有服务都在运行：
   - 前端: `http://localhost:5173`
   - 后端: `http://localhost:3001`
   - 数据库连接正常

3. 查看日志文件获取详细错误信息

---

**注意**: 此重置操作不可逆，请确保在开发环境中操作，并且已备份重要数据（如有需要）。