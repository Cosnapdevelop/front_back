# Web推送通知 (VAPID) 配置指南

## 问题说明

如果你在前端控制台看到 "VAPID 公钥未配置，跳过推送订阅" 的警告，这是因为Web推送通知功能需要VAPID密钥配置。

## 解决方案

### 选项1：启用推送通知功能

#### 1. 前端环境变量配置

在你的前端环境变量中（Vercel等部署平台）添加：

```env
VITE_VAPID_PUBLIC_KEY=BIjbMpazpOqhKKaDqcc7RudDlyxTP5Q9x933yEgDkmPFKfNBbdIKtN-XdjSj2PY7HoYTArAtPMDC9YlnAXd290M
```

#### 2. 后端环境变量配置

在你的后端环境变量中（Render等部署平台）添加：

```env
VAPID_PUBLIC_KEY=BIjbMpazpOqhKKaDqcc7RudDlyxTP5Q9x933yEgDkmPFKfNBbdIKtN-XdjSj2PY7HoYTArAtPMDC9YlnAXd290M
VAPID_PRIVATE_KEY=Z-KZPBR55zyUQKE6kuXWrIH2xsjTjb3g3TkBpzu81Qk
VAPID_EMAIL=mailto:cosnap.ai@gmail.com
```

### 选项2：禁用推送通知功能（推荐简化方案）

如果你不需要推送通知功能，可以修改代码移除这个警告。

## 当前生成的VAPID密钥对

```
Public Key:  BIjbMpazpOqhKKaDqcc7RudDlyxTP5Q9x933yEgDkmPFKfNBbdIKtN-XdjSj2PY7HoYTArAtPMDC9YlnAXd290M
Private Key: Z-KZPBR55zyUQKE6kuXWrIH2xsjTjb3g3TkBpzu81Qk
```

## 推送通知功能说明

Web推送通知允许你向用户发送：
- AI任务完成通知
- 系统更新提醒  
- 营销消息（需用户同意）

### 推送通知工作流程

1. **用户订阅**：用户访问网站时自动请求通知权限
2. **服务器存储**：将用户的推送订阅信息存储到数据库
3. **发送通知**：后端使用VAPID私钥发送推送消息
4. **用户接收**：用户在浏览器中收到通知

## 环境变量配置步骤

### 前端 (Vercel)
1. 登录Vercel控制台
2. 找到你的项目 → Settings → Environment Variables
3. 添加：`VITE_VAPID_PUBLIC_KEY` = `BIjbMpazpOqhKKaDqcc7RudDlyxTP5Q9x933yEgDkmPFKfNBbdIKtN-XdjSj2PY7HoYTArAtPMDC9YlnAXd290M`
4. 重新部署项目

### 后端 (Render)
1. 登录Render控制台  
2. 找到你的服务 → Environment
3. 添加三个环境变量：
   - `VAPID_PUBLIC_KEY` = `BIjbMpazpOqhKKaDqcc7RudDlyxTP5Q9x933yEgDkmPFKfNBbdIKtN-XdjSj2PY7HoYTArAtPMDC9YlnAXd290M`
   - `VAPID_PRIVATE_KEY` = `Z-KZPBR55zyUQKE6kuXWrIH2xsjTjb3g3TkBpzu81Qk`
   - `VAPID_EMAIL` = `mailto:cosnap.ai@gmail.com`
4. 服务自动重启

## 快速解决警告

如果你只想消除警告消息而不启用推送功能，可以直接在前端添加VAPID公钥环境变量，这样代码就不会显示警告了。

## 安全提醒

- VAPID私钥只能在后端使用，绝对不要泄露
- VAPID公钥可以公开，会包含在前端代码中
- 定期轮换VAPID密钥对以提高安全性

配置完成后，重新部署应用，警告消息就会消失！