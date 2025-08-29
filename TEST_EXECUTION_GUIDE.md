# 忘记密码功能测试执行指南

## 快速开始

### 运行所有测试

```bash
# 后端测试
cd runninghub-backend
npm run test:coverage

# 前端测试
cd project
npm run test:coverage

# E2E 测试
npm run test:e2e
```

## 测试类型和文件位置

### 1. 后端测试

| 测试类型 | 文件位置 | 命令 |
|---------|----------|------|
| API 单元测试 | `runninghub-backend/__tests__/unit/forgot-password.test.js` | `npm test forgot-password` |
| 边界情况测试 | `runninghub-backend/__tests__/unit/forgot-password-edge-cases.test.js` | `npm test edge-cases` |
| 集成测试 | `runninghub-backend/__tests__/integration/forgot-password-flow.test.js` | `npm run test:integration` |

### 2. 前端测试

| 测试类型 | 文件位置 | 命令 |
|---------|----------|------|
| 组件测试 | `project/src/components/__tests__/ForgotPassword.test.tsx` | `npm test ForgotPassword` |
| 组件测试 | `project/src/components/__tests__/ResetPassword.test.tsx` | `npm test ResetPassword` |
| Hook 测试 | `project/src/hooks/__tests__/useForgotPassword.test.ts` | `npm test useForgotPassword` |
| 流程集成测试 | `project/src/components/__tests__/ForgotPasswordFlow.integration.test.tsx` | `npm test integration` |

### 3. E2E 测试

| 测试类型 | 文件位置 | 命令 |
|---------|----------|------|
| 用户流程测试 | `project/e2e/forgot-password.spec.ts` | `npm run test:e2e forgot-password` |

## 重要测试场景

### 🔥 必须通过的核心测试

1. **完整成功流程**
   ```
   忘记密码 → 邮件发送 → 重置密码 → 成功页面
   ```

2. **API 错误处理**
   - 无效邮箱格式验证
   - 网络错误处理
   - 速率限制处理

3. **安全性测试**
   - 令牌验证
   - 密码强度验证
   - XSS/注入攻击防护

### ⚠️ 关键边界情况

1. **令牌相关**
   - 过期令牌处理
   - 无效令牌处理
   - 恶意令牌处理

2. **并发处理**
   - 多个重置请求
   - 竞态条件处理

3. **系统错误**
   - 数据库连接失败
   - 邮件服务故障

## 手动测试检查清单

### 快速验收测试 (15分钟)

#### 1. 基本流程 ✅
- [ ] 打开 `/forgot-password`
- [ ] 输入有效邮箱
- [ ] 点击"Send Reset Link"
- [ ] 确认跳转到邮件发送页面
- [ ] 验证邮箱地址显示正确

#### 2. 表单验证 ✅
- [ ] 空邮箱显示错误
- [ ] 无效邮箱显示错误
- [ ] 有效邮箱清除错误

#### 3. 重置密码页面 ✅
- [ ] 访问重置链接（使用有效令牌）
- [ ] 填写新密码
- [ ] 确认密码匹配
- [ ] 密码强度指示器工作
- [ ] 成功重置后跳转成功页面

#### 4. 错误处理 ✅
- [ ] 无效令牌显示错误页面
- [ ] 网络错误显示适当消息
- [ ] 表单验证错误清晰显示

### 详细功能测试 (60分钟)

参考 `FORGOT_PASSWORD_TEST_PLAN.md` 中的完整测试清单。

## 测试数据

### 测试邮箱
```
# 开发环境测试邮箱
VALID_EMAIL=test@example.com
INVALID_EMAIL=invalid-format
NONEXISTENT_EMAIL=notfound@example.com
```

### 测试密码
```
# 弱密码（应该被拒绝）
WEAK_PASSWORDS=["weak", "12345678", "onlyletters"]

# 强密码（应该被接受）
STRONG_PASSWORD="SecurePassword123!"
```

## 测试环境设置

### 后端测试环境
```bash
# 设置测试数据库
export TEST_DATABASE_URL="postgresql://test:test@localhost:5432/cosnap_test"

# 设置测试邮件服务（如果需要）
export TEST_EMAIL_SERVICE=true
export TEST_SMTP_HOST="localhost"
export TEST_SMTP_PORT=1025
```

### 前端测试环境
```bash
# Mock API 端点
export VITE_API_BASE_URL="http://localhost:3001/api"

# 启用测试模式
export NODE_ENV=test
```

## 常见问题排查

### 后端测试失败

**问题**: 数据库连接失败
```bash
# 解决方案
npm run db:push  # 确保数据库模式是最新的
```

**问题**: 邮件服务测试失败
```bash
# 解决方案
export TEST_EMAIL_ENABLED=false  # 跳过邮件测试
```

### 前端测试失败

**问题**: 组件渲染错误
```bash
# 解决方案
npm install  # 确保依赖是最新的
npm run test -- --reporter=verbose  # 获取详细错误信息
```

**问题**: E2E 测试超时
```bash
# 解决方案
npm run test:e2e -- --timeout=60000  # 增加超时时间
```

## 性能基准

### 响应时间要求
- 忘记密码 API: < 2 秒
- 令牌验证 API: < 1 秒
- 密码重置 API: < 3 秒
- 页面加载时间: < 3 秒

### 并发处理
- 支持 100+ 并发忘记密码请求
- 支持 50+ 并发密码重置请求
- 系统稳定性保持 99.9%+

## 安全检查清单

### 输入验证 🔒
- [ ] SQL 注入防护
- [ ] XSS 攻击防护
- [ ] CSRF 保护
- [ ] 输入长度限制

### 令牌安全 🔒
- [ ] JWT 签名验证
- [ ] 令牌过期检查
- [ ] 令牌类型验证
- [ ] 防重放攻击

### 速率限制 🔒
- [ ] IP 级别限制
- [ ] 用户级别限制
- [ ] 端点级别限制
- [ ] 恶意行为检测

## 测试报告

### 自动生成覆盖率报告
```bash
# 后端覆盖率
cd runninghub-backend
npm run test:coverage
# 查看报告: open coverage/lcov-report/index.html

# 前端覆盖率
cd project
npm run test:coverage
# 查看报告: open coverage/index.html
```

### E2E 测试报告
```bash
# 运行 E2E 测试并生成报告
npm run test:e2e -- --reporter=html
# 查看报告: open playwright-report/index.html
```

## 持续集成集成

### GitHub Actions 集成
```yaml
# .github/workflows/test.yml
name: Test Forgot Password Feature

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Run Backend Tests
        run: |
          cd runninghub-backend
          npm ci
          npm run test:coverage

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Run Frontend Tests
        run: |
          cd project
          npm ci
          npm run test:coverage

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install Playwright
        run: |
          cd project
          npm ci
          npx playwright install
      - name: Run E2E Tests
        run: |
          cd project
          npm run test:e2e
```

## 总结

这个测试执行指南提供了快速和全面的测试方法。建议：

1. **开发期间**: 持续运行单元测试
2. **功能完成**: 执行集成测试
3. **提交前**: 运行完整测试套件
4. **发布前**: 执行完整的手动验收测试

通过遵循这个指南，可以确保忘记密码功能的质量和可靠性。