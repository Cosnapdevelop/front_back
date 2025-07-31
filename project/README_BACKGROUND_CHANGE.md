# Cosnap背景替换特效 - 技术实现文档

## 🎯 功能概述

Cosnap背景替换特效是一个基于AI的图像处理功能，允许用户上传原始图片和背景图片，通过RunningHub ComfyUI API自动生成背景替换后的图片。

## 🔧 技术架构

### 前端 (React + TypeScript + Vite)
- **页面**: `ApplyEffect.tsx` - 特效应用页面
- **Hook**: `useTaskProcessing.ts` - 任务处理逻辑
- **服务**: `runningHubApi.ts` - API调用服务
- **配置**: `api.ts` - 环境配置

### 后端 (Node.js + Express)
- **路由**: `effects.js` - API路由处理
- **服务**: `comfyUITaskService.js` - ComfyUI任务服务
- **配置**: 环境变量管理

### 外部服务
- **RunningHub ComfyUI API**: AI图像处理服务
- **API域名**: `https://www.runninghub.ai` (已修复)

## 📋 实现细节

### 1. 特效配置
```typescript
// project/src/data/mockData.ts
{
  id: 'cosnap-background-change',
  name: 'Cosnap背景替换',
  description: 'AI智能背景替换，让您的照片焕然一新',
  webappId: '1949831786093264897',
  parameters: [
    {
      id: 'originalImage',
      name: '原始图片',
      type: 'image',
      required: true,
      nodeInfoTemplate: { nodeId: '240', fieldName: 'image' }
    },
    {
      id: 'backgroundImage', 
      name: '背景图片',
      type: 'image',
      required: true,
      nodeInfoTemplate: { nodeId: '284', fieldName: 'image' }
    }
  ]
}
```

### 2. 前端UI实现
- 自定义图片上传组件
- 拖拽上传支持
- 图片预览功能
- 重新选择按钮

### 3. API调用流程

#### 前端到后端
```
POST /api/effects/comfyui/apply
Content-Type: multipart/form-data

FormData:
- images: [原始图片文件, 背景图片文件]
- webappId: "1949831786093264897"
- nodeInfoList: [
    { nodeId: "240", fieldName: "image", paramKey: "originalImage" },
    { nodeId: "284", fieldName: "image", paramKey: "backgroundImage" }
  ]
```

#### 后端到RunningHub
1. **图片上传**: `POST /upload/openapi/upload`
2. **任务创建**: `POST /task/openapi/create`
3. **状态轮询**: `POST /task/openapi/status`
4. **结果获取**: `POST /task/openapi/outputs`

## 🔧 最近修复的问题

### 1. API域名修复
**问题**: 代码使用 `runninghub.cn`，但API文档显示 `runninghub.ai`
**修复**: 更新所有API调用使用正确的域名 `https://www.runninghub.ai`

### 2. 状态查询修复
**问题**: 状态查询返回格式解析错误
**修复**: 
- 状态直接返回在 `response.data.data` 字段中
- 添加详细的响应日志用于调试

### 3. 结果解析修复
**问题**: 结果数据解析错误
**修复**: 
- 结果直接返回在 `response.data.data` 字段中，是一个数组
- 优先使用 `fileUrl` 字段获取图片URL

## 📁 文件结构

```
project/
├── src/
│   ├── pages/
│   │   └── ApplyEffect.tsx          # 特效应用页面
│   ├── hooks/
│   │   └── useTaskProcessing.ts     # 任务处理Hook
│   ├── services/
│   │   └── runningHubApi.ts         # API服务
│   ├── config/
│   │   ├── api.ts                   # API配置
│   │   └── runningHub.ts            # RunningHub配置
│   └── data/
│       └── mockData.ts              # 特效数据
└── README_BACKGROUND_CHANGE.md      # 本文档

runninghub-backend/
├── src/
│   ├── routes/
│   │   └── effects.js               # API路由
│   └── services/
│       └── comfyUITaskService.js    # ComfyUI服务
└── test-api.js                      # API测试脚本
```

## 🧪 测试

### API测试脚本
```bash
# 测试特定任务的状态和结果
cd runninghub-backend
node test-api.js <taskId>

# 示例
node test-api.js 1950170519231926274
```

### 功能测试
1. 上传原始图片和背景图片
2. 点击"开始背景替换"
3. 等待处理完成
4. 查看生成的图片

## 🐛 常见问题

### 1. 任务状态一直pending
**原因**: API域名或状态解析错误
**解决**: 
- 确认使用正确的API域名 `https://www.runninghub.ai`
- 检查状态查询的响应格式
- 使用测试脚本验证API调用

### 2. 图片上传失败
**原因**: API Key无效或配额不足
**解决**: 
- 检查RunningHub API Key是否正确
- 确认API配额是否充足

### 3. 结果获取失败
**原因**: 任务未完成或结果解析错误
**解决**: 
- 等待任务完成（通常需要1-3分钟）
- 检查结果API的响应格式

## 📊 性能优化

### 1. 轮询优化
- 初始间隔: 2秒
- 最大尝试次数: 150次（5分钟）
- 指数退避策略

### 2. 错误处理
- 网络错误重试
- 超时处理
- 详细错误日志

### 3. 用户体验
- 实时进度显示
- 错误提示
- 加载状态管理

## 🔮 未来改进

1. **WebSocket支持**: 使用WebSocket实时获取任务状态
2. **批量处理**: 支持多张图片批量处理
3. **结果缓存**: 缓存处理结果，避免重复计算
4. **进度条**: 显示详细的处理进度
5. **错误恢复**: 自动重试失败的请求

## 📞 技术支持

如果遇到问题，请：
1. 查看浏览器控制台错误
2. 检查后端日志
3. 使用测试脚本验证API
4. 查看RunningHub控制台的任务状态