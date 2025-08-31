# 🧪 测试账号管理指南

为了避免在测试过程中受到AI特效使用限制的影响，我们提供了完整的测试账号管理系统。

## 快速开始

### 1. 最简单的方法 - 一键创建VIP测试账号
```bash
npm run test:quick-setup
```
这将创建一个 `test@cosnap.dev` 的VIP账号，拥有无限AI特效使用权限。

### 2. 使用管理员API接口

你可以直接调用后端API来管理测试账号：

**获取ADMIN_KEY:**
- 生产环境：从Render环境变量中获取 `ADMIN_RESET_KEY`
- 开发环境：可以使用默认值或生成新的密钥

## 🛠 完整功能列表

### A. 创建测试账号

#### 方法1: 使用脚本工具
```bash
# 创建单个VIP测试账号
node scripts/test-account-manager.js create test-user@example.com --tier VIP

# 批量创建5个VIP测试账号
node scripts/test-account-manager.js batch --count 5 --tier VIP --prefix testuser

# 快速设置（推荐）
node scripts/test-account-manager.js quick-setup
```

#### 方法2: 使用curl调用API
```bash
# 创建测试账号
curl -X POST "https://cosnap-back.onrender.com/api/admin/test-user" \
  -H "x-admin-key: YOUR_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "tier": "VIP",
    "username": "testuser"
  }'

# 批量创建测试账号
curl -X POST "https://cosnap-back.onrender.com/api/admin/batch-test-users" \
  -H "x-admin-key: YOUR_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "count": 3,
    "tier": "VIP",
    "emailPrefix": "test"
  }'
```

### B. 管理现有测试账号

#### 重置使用量
```bash
# 脚本方式
node scripts/test-account-manager.js reset test@example.com

# API方式
curl -X POST "https://cosnap-back.onrender.com/api/admin/reset-usage" \
  -H "x-admin-key: YOUR_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

#### 升级用户等级
```bash
# 升级为VIP，有效期365天
node scripts/test-account-manager.js upgrade test@example.com VIP --duration 365

# API方式
curl -X POST "https://cosnap-back.onrender.com/api/admin/upgrade-user" \
  -H "x-admin-key: YOUR_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "tier": "VIP",
    "duration": 365
  }'
```

#### 查看测试账号列表
```bash
# 脚本方式
node scripts/test-account-manager.js list
npm run test:list-users

# API方式
curl "https://cosnap-back.onrender.com/api/admin/test-users" \
  -H "x-admin-key: YOUR_ADMIN_KEY"
```

#### 查看特定用户信息
```bash
# 脚本方式
node scripts/test-account-manager.js info test@example.com

# API方式
curl "https://cosnap-back.onrender.com/api/admin/user-info?email=test@example.com" \
  -H "x-admin-key: YOUR_ADMIN_KEY"
```

## 📊 订阅等级说明

| 等级 | 月度限制 | 水印 | 优先处理 | 独家特效 |
|------|----------|------|----------|----------|
| FREE | 20次 | 有 | 否 | 否 |
| PRO | 无限 | 无 | 是 | 否 |
| VIP | 无限 | 无 | 是 | 是 |

**推荐测试配置：VIP等级** - 拥有所有功能，无使用限制

## 🔧 环境配置

### 设置管理员密钥

**Render部署 (生产环境):**
1. 登录 Render Dashboard
2. 选择你的服务
3. 进入 Environment 标签
4. 添加环境变量：`ADMIN_RESET_KEY=your-secret-admin-key`
5. 重新部署服务

**本地开发:**
在 `.env` 文件中添加：
```env
ADMIN_RESET_KEY=your-admin-key-here
```

### 更新数据库Schema

如果你是第一次使用测试账号功能，需要更新数据库：
```bash
# 推送schema变更到数据库
npm run db:push

# 或者运行迁移
npm run migrate:deploy
```

## 🎯 典型测试工作流

### 场景1: 开始新的测试会话
```bash
# 1. 快速创建测试账号
npm run test:quick-setup

# 2. 在前端使用 test@cosnap.dev 登录
# 3. 开始测试AI特效功能（无限制）
```

### 场景2: 测试达到限制后重置
```bash
# 重置测试账号的使用量
node scripts/test-account-manager.js reset test@cosnap.dev
```

### 场景3: 测试不同订阅等级
```bash
# 创建FREE等级测试账号（体验限制）
node scripts/test-account-manager.js create free-test@example.com --tier FREE

# 创建PRO等级测试账号
node scripts/test-account-manager.js create pro-test@example.com --tier PRO
```

### 场景4: 批量测试用户
```bash
# 创建10个VIP测试账号用于压力测试
node scripts/test-account-manager.js batch --count 10 --tier VIP --prefix load-test
```

## 🚨 注意事项

1. **仅在测试和开发环境使用** - 测试账号仅用于功能测试
2. **管理员密钥安全** - 妥善保管ADMIN_KEY，不要泄露给未授权人员  
3. **清理测试数据** - 定期清理不需要的测试账号和数据
4. **生产环境谨慎** - 在生产环境使用管理员功能时要格外小心

## 📞 故障排除

### 常见问题

**Q: "Invalid admin key" 错误**
A: 检查环境变量 `ADMIN_RESET_KEY` 是否正确设置

**Q: "User not found" 错误** 
A: 确认用户邮箱拼写正确，或先创建用户

**Q: 数据库连接错误**
A: 确认 `DATABASE_URL` 环境变量配置正确

**Q: 脚本依赖错误**
A: 运行 `npm install` 安装所需依赖

### 检查系统状态
```bash
# 查看数据库统计
curl "https://cosnap-back.onrender.com/api/admin/database-stats" \
  -H "x-admin-key: YOUR_ADMIN_KEY"

# 查看所有测试账号状态
npm run test:list-users
```

---

💡 **提示：** 推荐使用 `npm run test:quick-setup` 命令快速创建测试环境，这是最简单高效的方法！