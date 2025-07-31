# ⚠️ 重要：nodeInfoList 配置指南

## 🎯 概述

`nodeInfoList` 是 RunningHub ComfyUI API 调用的核心参数，它定义了要修改的工作流节点和对应的值。正确配置 `nodeInfoList` 是确保 API 调用成功的关键。

## 📋 核心概念

### nodeId
- **定义**: 工作流界面中节点右上角的数字标识
- **获取方法**: 在 RunningHub 工作流界面中查看节点右上角的数字
- **示例**: `"240"`, `"279"`, `"284"`

### fieldName
- **定义**: 对应节点 `inputs` 部分的键名
- **常见类型**: `"image"`, `"text"`, `"prompt"`, `"seed"`, `"steps"`, `"cfg"`
- **获取方法**: 从工作流 API 格式文件中查看节点的 `inputs` 部分

### fieldValue
- **定义**: 要设置的具体值
- **图片节点**: 上传后的 `fileName` 或云存储 URL
- **文本节点**: 用户输入的文本内容
- **注意**: 前端不设置，由后端填充

### paramKey
- **定义**: 用于后端查找对应参数的键名
- **格式**: 通常为 `"image_节点ID"` 或 `"prompt_节点ID"`
- **作用**: 连接前端参数和后端 nodeInfoList

## 🔧 配置步骤

### 1. 获取工作流信息

1. **下载工作流 API 格式文件**
   - 在 RunningHub 界面点击下载图标
   - 选择 "Export Workflow API"
   - 下载 JSON 格式文件

2. **分析工作流结构**
   - 打开下载的 JSON 文件
   - 查看每个节点的 `inputs` 部分
   - 记录需要的节点 ID 和字段名

### 2. 配置前端参数

在 `mockData.ts` 中配置 `parameters` 数组：

```typescript
parameters: [
  { 
    name: 'image_240',           // 参数键名
    type: 'image',               // 参数类型
    description: '上传原始图片'    // 用户界面描述
  },
  { 
    name: 'prompt_279',          // 参数键名
    type: 'text',                // 参数类型
    default: '默认提示词',        // 默认值
    description: '提示词描述'     // 用户界面描述
  }
]
```

### 3. 配置 nodeInfoTemplate

在 `mockData.ts` 中配置 `nodeInfoTemplate` 数组：

```typescript
nodeInfoTemplate: [
  { 
    nodeId: '240',               // 节点ID
    fieldName: 'image',          // 字段名
    paramKey: 'image_240'        // 对应参数键名
  },
  { 
    nodeId: '279',               // 节点ID
    fieldName: 'prompt',         // 字段名
    paramKey: 'prompt_279'       // 对应参数键名
  }
]
```

## 📝 配置示例

### 示例 1: 图片处理工作流

```typescript
{
  id: 'image-processing',
  name: '图片处理',
  workflowId: '1234567890',
  parameters: [
    { name: 'image_10', type: 'image', description: '输入图片' },
    { name: 'prompt_20', type: 'text', description: '处理提示词' }
  ],
  nodeInfoTemplate: [
    { nodeId: '10', fieldName: 'image', paramKey: 'image_10' },
    { nodeId: '20', fieldName: 'prompt', paramKey: 'prompt_20' }
  ]
}
```

### 示例 2: Plus 工作流

```typescript
{
  id: 'plus-workflow',
  name: 'Plus 工作流',
  workflowId: '1234567890',
  isPlusWorkflow: true,  // 标记为 Plus 工作流
  parameters: [
    { name: 'image_15', type: 'image', description: '输入图片' },
    { name: 'image_25', type: 'image', description: '参考图片' },
    { name: 'prompt_35', type: 'text', description: '提示词' }
  ],
  nodeInfoTemplate: [
    { nodeId: '15', fieldName: 'image', paramKey: 'image_15' },
    { nodeId: '25', fieldName: 'image', paramKey: 'image_25' },
    { nodeId: '35', fieldName: 'prompt', paramKey: 'prompt_35' }
  ]
}
```

## ⚠️ 常见错误和解决方案

### 错误 1: APIKEY_INVALID_NODE_INFO (803)

**原因**: nodeInfoList 中的 fieldValue 未正确设置

**解决方案**:
1. 检查后端 nodeInfoList 填充逻辑
2. 确认图片文件已成功上传
3. 验证文本参数是否正确传递

### 错误 2: 节点找不到

**原因**: nodeId 或 fieldName 不正确

**解决方案**:
1. 重新下载工作流 API 格式文件
2. 仔细核对节点 ID 和字段名
3. 确认工作流版本是否更新

### 错误 3: 参数不匹配

**原因**: paramKey 与 parameters 中的 name 不匹配

**解决方案**:
1. 检查 paramKey 格式是否正确
2. 确认 parameters 和 nodeInfoTemplate 的一致性
3. 验证参数命名规则

## 🔍 调试技巧

### 1. 启用详细日志

在后端代码中启用详细日志：

```javascript
console.log('[ComfyUI] nodeInfoList详情:', nodeInfoList);
console.log('[ComfyUI] 发送请求数据:', JSON.stringify(requestBody, null, 2));
```

### 2. 检查 RunningHub 响应

查看 RunningHub 的响应信息：

```javascript
if (response.data?.data?.promptTips) {
  console.log('[ComfyUI] 工作流校验信息:', promptTips);
}
```

### 3. 验证文件上传

确认图片文件上传成功：

```javascript
console.log('[ComfyUI] 图片上传成功:', fileName);
console.log('[ComfyUI] 上传的图片文件:', uploadedImages);
```

## 📚 相关文件

- **前端配置**: `project/src/data/mockData.ts`
- **前端处理**: `project/src/hooks/useTaskProcessing.ts`
- **后端处理**: `runninghub-backend/src/routes/effects.js`
- **API 文档**: `runninghub-api-integration.md`

## 🎯 最佳实践

1. **命名规范**: 使用 `image_节点ID` 和 `prompt_节点ID` 的命名规则
2. **文档记录**: 为每个工作流记录详细的配置说明
3. **测试验证**: 在修改配置后及时测试验证
4. **版本控制**: 记录工作流版本和配置变更历史
5. **错误处理**: 实现完善的错误处理和用户提示

---

**⚠️ 重要提醒**: 修改 nodeInfoList 配置时，请务必参考此文档，确保配置的正确性和一致性。 