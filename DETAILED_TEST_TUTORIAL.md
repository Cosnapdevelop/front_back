# 🎓 Cosnap测试账号设置完整教程

## 📖 目录
1. [理解问题](#理解问题)
2. [环境准备](#环境准备)
3. [设置步骤](#设置步骤)
4. [使用方法](#使用方法)
5. [实际操作示例](#实际操作示例)
6. [故障排除](#故障排除)

---

## 🎯 理解问题

### 当前状况
- 你现在使用Cosnap时，免费用户每月只能使用**20次AI特效**
- 测试功能时很快就会用完这20次机会
- 达到限制后会看到："本月使用次数已达上限（20次），请升级订阅或等待下月重置"

### 解决方案
创建**VIP测试账号**，拥有：
- ✅ 无限次AI特效使用
- ✅ 无水印输出
- ✅ 最高优先级处理
- ✅ 所有独家特效访问

---

## 🛠 环境准备

### Step 1: 确认项目结构
确保你的文件夹结构是这样的：
```
E:\desktop\Cosnap企划\code\ui\
├── project/                 # React前端
└── runninghub-backend/      # Node.js后端
```

### Step 2: 检查后端环境
打开命令提示符（CMD）或PowerShell：

```bash
# 1. 进入后端目录
cd "E:\desktop\Cosnap企划\code\ui\runninghub-backend"

# 2. 检查Node.js版本（需要18或更高）
node --version

# 3. 检查npm版本
npm --version

# 4. 安装依赖（如果还没有安装）
npm install
```

---

## ⚙️ 设置步骤

### Step 1: 添加管理员密钥

1. **打开 `.env` 文件**
   ```bash
   cd runninghub-backend
   notepad .env
   ```

2. **在文件末尾添加以下内容**：
   ```env
   # 测试账号管理配置
   ADMIN_RESET_KEY=cosnap-test-admin-2024-secure-key
   ```

3. **保存并关闭文件**

### Step 2: 更新数据库结构

```bash
# 确保在 runninghub-backend 目录下
npm run db:push
```

如果出现错误，说明数据库连接有问题，我们稍后处理。

---

## 🚀 使用方法

### 方法一：最简单 - 一键创建（推荐）

```bash
# 在 runninghub-backend 目录下运行
npm run test:quick-setup
```

这个命令会：
- 创建一个 `test@cosnap.dev` 的VIP测试账号
- 设置无限AI特效使用权限
- 有效期1年

### 方法二：使用管理员API

如果你的后端服务正在运行，可以直接调用API：

```bash
# Windows PowerShell 或 Git Bash
curl -X POST "https://cosnap-back.onrender.com/api/admin/test-user" ^
  -H "x-admin-key: cosnap-test-admin-2024-secure-key" ^
  -H "Content-Type: application/json" ^
  -d "{\"email\": \"test@cosnap.dev\", \"tier\": \"VIP\"}"
```

### 方法三：使用脚本工具

```bash
# 创建单个测试账号
node scripts/test-account-manager.js create test@cosnap.dev --tier VIP

# 查看所有测试账号
node scripts/test-account-manager.js list

# 重置用户使用量
node scripts/test-account-manager.js reset test@cosnap.dev
```

---

## 📝 实际操作示例

### 场景1：从头开始设置

**1. 打开命令提示符**
- 按 `Win + R`，输入 `cmd`，按回车

**2. 导航到项目目录**
```bash
cd /d "E:\desktop\Cosnap企划\code\ui\runninghub-backend"
```

**3. 检查环境变量**
```bash
# 查看当前.env文件内容
type .env
```

**4. 添加管理员密钥**
```bash
# 使用记事本编辑.env文件
notepad .env
```
在文件末尾添加：
```
ADMIN_RESET_KEY=cosnap-test-admin-2024-secure-key
```
保存并关闭。

**5. 创建测试账号**
```bash
# 方式1：使用快速设置（推荐）
npm run test:quick-setup

# 方式2：使用脚本工具
node scripts/test-account-manager.js create test@cosnap.dev --tier VIP
```

**6. 验证创建成功**
```bash
# 查看测试账号列表
npm run test:list-users
```

### 场景2：在前端使用测试账号

**1. 打开Cosnap前端网站**
- 访问：`https://cosnap.vercel.app/`

**2. 登录测试账号**
- 点击"登录"按钮
- 使用邮箱：`test@cosnap.dev`
- 密码：系统会提示你设置密码或直接登录

**3. 测试AI特效**
- 现在你可以无限次使用所有AI特效
- 不会再看到"达到使用上限"的提示

### 场景3：重置使用量（如果需要）

```bash
# 重置特定用户的使用量
node scripts/test-account-manager.js reset test@cosnap.dev
```

---

## 🔧 故障排除

### 常见问题及解决方案

#### 问题1: "Invalid admin key" 错误
**原因：** 管理员密钥配置不正确  
**解决：**
```bash
# 检查.env文件中是否有ADMIN_RESET_KEY
type .env | findstr ADMIN_RESET_KEY

# 如果没有，添加这一行
echo ADMIN_RESET_KEY=cosnap-test-admin-2024-secure-key >> .env
```

#### 问题2: "DATABASE_URL environment variable is required"
**原因：** 数据库连接配置缺失  
**解决：**
1. 这个错误说明数据库配置有问题
2. 但我们可以直接使用线上API，不需要本地数据库
3. 使用方法二（管理员API）代替

#### 问题3: "npm: command not found"
**原因：** Node.js未安装或环境变量未配置  
**解决：**
1. 下载安装Node.js：https://nodejs.org/
2. 安装后重启命令提示符
3. 验证安装：`node --version`

#### 问题4: 脚本权限错误
**原因：** Windows执行策略限制  
**解决：**
```powershell
# 在PowerShell中运行（管理员身份）
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### 问题5: 无法连接到远程服务器
**原因：** 网络问题或服务器离线  
**解决：**
1. 检查网络连接
2. 确认服务器状态：访问 `https://cosnap-back.onrender.com/api/health`
3. 如果服务器正常，等待几分钟后重试

### 调试模式

如果遇到问题，启用详细日志：

```bash
# 设置调试模式
set DEBUG=*

# 然后运行命令
node scripts/test-account-manager.js create test@cosnap.dev --tier VIP
```

---

## 📱 使用流程总结

### 完整操作流程（5分钟完成）

1. **打开CMD** → `Win + R` → 输入`cmd`
2. **进入目录** → `cd /d "E:\desktop\Cosnap企划\code\ui\runninghub-backend"`
3. **检查.env** → `type .env`
4. **添加密钥** → 如果没有ADMIN_RESET_KEY，用notepad添加
5. **创建账号** → `npm run test:quick-setup`
6. **验证创建** → `npm run test:list-users`
7. **前端登录** → 使用 `test@cosnap.dev` 登录网站
8. **开始测试** → 现在可以无限使用AI特效！

### 验证成功的标志

✅ **后端创建成功** - 会显示：
```
✅ Test user VIP account created/updated successfully
用户信息:
   ID: xxx
   邮箱: test@cosnap.dev
   等级: VIP
   状态: ACTIVE
```

✅ **前端登录成功** - 在网站右上角会显示用户头像/邮箱

✅ **使用无限制** - 使用AI特效时不会看到"达到上限"提示

---

## 🎯 下一步

创建测试账号后，你可以：

1. **测试所有AI特效** - 无限制使用
2. **测试不同场景** - 大批量图片处理
3. **开发新功能** - 不用担心达到使用限制
4. **压力测试** - 创建多个测试账号进行并发测试

需要帮助时，随时问我！我会继续协助你解决任何问题。