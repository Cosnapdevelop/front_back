# 🔧 GitHub Actions自动部署配置指南

## 问题分析

经过深入研究Vercel官方文档和现有代码结构，发现自动部署问题的根本原因是：

1. **Vercel配置冲突**：使用了旧版的`builds`配置，与项目设置不匹配
2. **GitHub Secrets缺失**：GitHub Actions需要配置Vercel访问令牌
3. **构建配置不明确**：Vercel不知道如何构建项目

## ✅ 已修复的问题

### 1. Vercel配置优化
- ✅ 移除旧版`builds`配置
- ✅ 添加`buildCommand`和`outputDirectory`
- ✅ 使用新版自动检测方式
- ✅ 简化package.json构建脚本

### 2. 本地测试验证
- ✅ 本地构建成功
- ✅ Vercel本地构建成功
- ✅ 生产环境部署成功

## 🔑 GitHub Secrets配置

要让GitHub Actions自动部署工作，需要在GitHub仓库中配置以下Secrets：

### 1. 获取Vercel Token
```bash
# 在本地运行
vercel login
vercel whoami
```

### 2. 获取项目信息
```bash
# 获取项目ID和组织ID
vercel project ls
```

### 3. 在GitHub仓库中配置Secrets

访问：`https://github.com/Cosnapdevelop/front_back/settings/secrets/actions`

添加以下Secrets：

| Secret名称 | 值 | 说明 |
|-----------|----|------|
| `VERCEL_TOKEN` | `vercel_xxxxx` | Vercel访问令牌 |
| `ORG_ID` | `team_sbUdwVspe4G2yEEzQegzV67U` | Vercel组织ID |
| `PROJECT_ID` | `prj_RMVDuTLoGTz6E3FZbDT9QiXqBe9E` | Vercel项目ID |

### 4. 获取Vercel Token的方法

```bash
# 方法1：使用Vercel CLI
vercel token

# 方法2：访问Vercel网站
# 1. 登录 https://vercel.com
# 2. 进入 Settings > Tokens
# 3. 创建新的Token
```

## 🚀 自动部署流程

配置完成后，每次推送代码到`main`分支都会自动触发：

1. **GitHub Actions触发**
   - 检出代码
   - 安装依赖
   - 运行lint检查
   - 构建项目

2. **Vercel部署**
   - 使用配置的Token部署到Vercel
   - 自动设置为生产环境
   - 更新主域名

3. **部署完成**
   - 自动评论PR（如果是PR）
   - 更新部署状态

## 📋 验证步骤

### 1. 检查GitHub Actions
访问：`https://github.com/Cosnapdevelop/front_back/actions`

### 2. 检查Vercel部署
访问：`https://vercel.com/terrys-projects-0cc48ccf/cosnap`

### 3. 测试自动部署
```bash
# 推送测试代码
echo "# 测试自动部署" >> README.md
git add README.md
git commit -m "test: 测试自动部署"
git push origin main
```

## 🔧 故障排除

### 1. GitHub Actions失败
- 检查Secrets配置是否正确
- 查看Actions日志获取详细错误信息

### 2. Vercel部署失败
- 检查`vercel.json`配置
- 验证构建命令是否正确

### 3. 权限问题
- 确保Vercel Token有足够权限
- 检查项目访问权限

## 📚 相关文档

- [Vercel部署文档](https://vercel.com/docs/deployment)
- [GitHub Actions文档](https://docs.github.com/en/actions)
- [Vercel CLI文档](https://vercel.com/docs/cli)

## 🎯 下一步

1. 配置GitHub Secrets
2. 测试自动部署流程
3. 监控部署状态
4. 优化构建性能 