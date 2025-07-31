# 开发指南

## 🚨 重要提示

### RunningHub API 集成关键修复

**⚠️ 所有开发人员必须注意 ⚠️**

RunningHub 管理员明确要求：**webappId 必须使用字符串形式传递，不能使用 parseInt() 转换为整数**

#### 错误示例（不要这样做）
```javascript
// ❌ 错误：使用 parseInt() 转换
webappId: parseInt(webappId)
```

#### 正确示例（必须这样做）
```javascript
// ✅ 正确：直接使用字符串
webappId: webappId
```

#### 为什么重要？
这个修复解决了之前所有 webapp 特效返回 `"webapp not exists"` 错误的问题。如果不遵循这个要求，所有 webapp 特效都无法正常工作。

### 相关文档
- [详细修复记录](./RUNNINGHUB_API_FIX.md)
- [RunningHub 后端文档](./runninghub-backend/README.md)

---

## 项目结构

```
├── project/                 # 前端 React 应用
│   ├── src/
│   │   ├── data/
│   │   │   └── mockData.ts  # 特效配置（包含重要提示）
│   │   └── ...
│   └── ...
├── runninghub-backend/      # 后端 Node.js 服务
│   ├── src/
│   │   ├── services/
│   │   │   └── webappTaskService.js  # 主要修复文件
│   │   └── ...
│   ├── test-all-effects.js  # 测试脚本
│   └── README.md
├── RUNNINGHUB_API_FIX.md    # 详细修复文档
└── DEVELOPMENT_GUIDE.md     # 本文件
```

## 开发注意事项

### 1. API 集成
- 永远不要对 `webappId` 使用 `parseInt()`
- 确保所有 `webappId` 都是字符串格式
- 测试新特效时使用 `node test-all-effects.js`

### 2. 特效配置
- ComfyUI 特效使用 `workflowId`
- Webapp 特效使用 `webappId`
- 所有 ID 都必须是字符串格式

### 3. 测试
- 前端：`npm run dev` (project 目录)
- 后端：`npm start` (runninghub-backend 目录)
- 特效测试：`node test-all-effects.js`

### 4. 部署
- 前端：Vercel/Netlify
- 后端：Railway/Render/Heroku
- 环境变量配置参考 `env-variables.md`

## 当前可用特效

### ComfyUI Workflow
- ✅ Cosnap 背景替换

### Webapp
- ✅ 顶级人像放大-支持全身（体验版）
- ✅ 换背景 | 电商实用版V5.0
- ✅ WanVideo 图生视频
- ✅ Ultimate upscale final v.1
- ✅ Flux Kontext Single Picture Mode

## 常见问题

### Q: 为什么 webapp 特效返回 "webapp not exists"？
A: 检查是否使用了 `parseInt()` 转换 `webappId`。必须使用字符串形式。

### Q: 如何添加新的特效？
A: 参考 `mockData.ts` 中的现有特效配置，确保 `webappId` 是字符串格式。

### Q: 如何测试特效是否正常工作？
A: 使用 `node test-all-effects.js` 脚本测试所有特效。

---

**最后更新：2024年1月**

**维护人员：AI Assistant** 