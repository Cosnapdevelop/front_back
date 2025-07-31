# RunningHub API 集成说明文档

## 概述

本文档详细说明如何在项目中集成RunningHub API，支持ComfyUI工作流调用（简易版和高级版）以及AI应用任务调用。

## API 类型

### 1. ComfyUI工作流调用 - 简易版

**适用场景：** 直接运行工作流，不修改任何参数，相当于点击"运行"按钮。

**前端调用方式：**
```javascript
// 在mockData.js中配置
{
  id: 'simple-workflow',
  name: '简易工作流',
  workflowId: '1949831786093264897', // 必需：工作流ID
  // 不设置 nodeInfoTemplate，表示简易模式
}

// 前端会自动检测并使用简易模式
```

**后端API调用：**
```javascript
// POST https://www.runninghub.cn/task/openapi/generate
{
  "apiKey": "your-api-key",
  "workflowId": "1949831786093264897"
  // 没有 nodeInfoList 字段
}
```

### 2. ComfyUI工作流调用 - 高级版

**适用场景：** 需要动态修改工作流参数，如替换图片、修改提示词等。

### 2.1. ComfyUI Plus工作流调用

**适用场景：** 复杂的专业级工作流，通常包含更多节点和精细控制，但API调用方式与高级版相同。

**前端配置方式：**
```javascript
// 在mockData.js中配置Plus工作流
{
  id: 'cosnap-strong-control-plus',
  name: 'Cosnap强控制力改 - Plus工作流',
  workflowId: '1950585019234455554', // Plus工作流ID
  isPlusWorkflow: true, // 标记为Plus工作流
  nodeInfoTemplate: [
    { nodeId: '24', fieldName: 'image', paramKey: 'image_24' },
    { nodeId: '62', fieldName: 'image', paramKey: 'image_62' },
    { nodeId: '327', fieldName: 'prompt', paramKey: 'prompt_327' }
  ],
  parameters: [
    { name: 'image_24', type: 'image', description: '上传主体图片' },
    { name: 'image_62', type: 'image', description: '上传背景参考图' },
    { name: 'prompt_327', type: 'text', description: 'LLM提示词' }
  ]
}
```

**后端API调用：**（使用48G显存机器）
```javascript
// POST https://www.runninghub.cn/task/openapi/create
{
  "apiKey": "your-api-key",
  "workflowId": "1950585019234455554",
  "nodeInfoList": [
    {
      "nodeId": "24",
      "fieldName": "image",
      "fieldValue": "api/uploaded-image-1.jpg"
    },
    {
      "nodeId": "62", 
      "fieldName": "image",
      "fieldValue": "api/uploaded-image-2.jpg"
    },
    {
      "nodeId": "327",
      "fieldName": "prompt", 
      "fieldValue": "describe the image Including atmosphere, mood & tone..."
    }
  ],
  "instanceType": "plus",  // 🔥 关键：指定使用48G显存机器
  "addMetadata": true
}
```

**🔑 Plus工作流关键特性：**
- **`instanceType: "plus"`** - 指定使用48G显存机器运行任务
- **适用场景** - 复杂的专业级工作流，需要更大显存和计算能力
- **处理时间** - 通常比普通工作流需要更长时间（3-5分钟）
- **费用** - Plus工作流通常费用较高

### 3. AI应用任务调用

**适用场景：** 调用预构建的AI应用，通常有固定的输入输出格式。

**前端配置方式：**
```javascript
// 在mockData.js中配置
{
  id: 'ai-app-task',
  name: 'AI智能修图',
  webappId: 'your-webapp-id', // 必需：应用ID
  nodeInfoTemplate: [ // 根据应用页面的示例配置
    {
      nodeId: 'input_image',
      fieldName: 'image', 
      paramKey: 'input_image'
    }
  ]
}
```

**后端API调用：**
```javascript
// POST https://www.runninghub.cn/task/openapi/app
{
  "apiKey": "your-api-key", 
  "webappId": "your-webapp-id",
  "nodeInfoList": [
    {
      "nodeId": "input_image",
      "fieldName": "image",
      "fieldValue": "api/uploaded-image.jpg"
    }
  ]
}
```

## 参数说明

### nodeInfoList 参数详解

**重要说明：** webappId必须以字符串形式传递（不是数字）。

```javascript
{
  "nodeId": "240",        // 工作流中的节点ID
  "fieldName": "image",   // 节点的字段名（image/prompt/text等）
  "fieldValue": "value"   // 实际的值（图片路径/文本内容等）
}
```

### 图片上传流程（智能云存储方案）

我们的系统实现了智能文件上传策略，根据文件大小自动选择最优上传方式：

#### 上传策略
- **≤ 10MB 文件：** 直接上传到RunningHub原生存储
- **> 10MB 文件：** 自动使用云存储上传
- **最大支持：** 100MB

#### 1. **小文件上传（≤ 10MB）**
```javascript
// POST https://www.runninghub.cn/task/openapi/upload
// Content-Type: multipart/form-data
FormData: {
  file: [图片文件],
  apiKey: "your-api-key",
  fileType: "image"
}

// 响应
{
  "code": 0,
  "msg": "success", 
  "data": {
    "fileName": "api/xxxxx.jpg", // 用于nodeInfoList
    "fileType": "image"
  }
}
```

#### 2. **大文件上传（> 10MB）**
```javascript
// 自动使用云存储，无需额外配置
// 系统后台自动处理

// 响应（返回公开URL）
{
  "cloudUrl": "https://cdn.example.com/cosnap/large-files/xxxxx.jpg"
}
```

#### 3. **在ComfyUI工作流中使用**
```javascript
// 无论是小文件还是大文件，使用方式完全相同
"nodeInfoList": [
  {
    "nodeId": "24",
    "fieldName": "image",
    "fieldValue": "api/xxxxx.jpg"          // 小文件路径
    // 或
    "fieldValue": "https://cdn.example.com/xxxxx.jpg" // 大文件URL  
  }
]
2. **在nodeInfoList中使用**
```javascript
{
  "nodeId": "240",
  "fieldName": "image", 
  "fieldValue": "api/xxxxx.jpg" // 使用上传返回的fileName或cloudUrl
}
```

## 状态查询与结果获取

### 查询任务状态
```javascript
// POST https://www.runninghub.cn/task/openapi/status
{
  "apiKey": "your-api-key",
  "taskId": "task-id-from-generate-response"
}

// 响应
{
  "code": 0,
  "msg": "success",
  "data": "SUCCESS" // QUEUED/RUNNING/SUCCESS/FAILED
}
```

### 获取任务结果
```javascript
// POST https://www.runninghub.cn/task/openapi/outputs
{
  "apiKey": "your-api-key", 
  "taskId": "task-id"
}

// 响应
{
  "code": 0,
  "msg": "success",
  "data": [
    {
      "fileUrl": "https://rh-images.xiaoyaoyou.com/xxx.png",
      "fileType": "png",
      "taskCostTime": "121",
      "nodeId": "221"
    }
  ]
}
```

## 项目中的实现

### 后端服务层

- **ComfyUI服务：** `runninghub-backend/src/services/comfyUITaskService.js`
- **AI应用服务：** `runninghub-backend/src/services/webappTaskService.js`
- **路由处理：** `runninghub-backend/src/routes/effects.js`

### 前端Hook

- **任务处理Hook：** `project/src/hooks/useTaskProcessing.ts`
- **配置文件：** `project/src/config/api.ts`
- **模拟数据：** `project/src/data/mockData.ts`

## 配置步骤

1. **获取API密钥和工作流ID**
2. **在mockData.js中配置效果**
3. **定义nodeInfoTemplate（如需参数修改）**
4. **配置前端表单参数**
5. **测试任务发起、状态查询、结果获取**

## 错误排查

### 常见问题

1. **"需要添加节点"错误**
   - 检查nodeInfoList中的nodeId是否正确
   - 确认所有必需参数都已提供
   - 查看promptTips字段获取详细错误信息

2. **图片上传失败**
   - 确认图片格式支持（jpg/png等）
   - 检查文件大小限制
   - 验证API密钥权限

3. **状态一直是RUNNING**
   - 工作流可能较复杂，需要更长时间
   - 检查工作流是否有错误节点
   - 查看RunningHub平台的任务详情

## 参考文档

- [RunningHub官方API文档](https://www.runninghub.cn/runninghub-api-doc/)
- [关于nodeInfoList](https://www.runninghub.cn/runninghub-api-doc/doc-6332955.md)
- [使用须知](https://www.runninghub.cn/runninghub-api-doc/doc-6332954.md)