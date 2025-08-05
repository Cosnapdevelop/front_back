# RunningHub API 集成指南

## 概述

本文档详细说明了如何正确集成RunningHub API，特别是ComfyUI任务的处理流程和常见问题解决方案。

## API 规范要点

### 1. 数据类型要求

**重要：RunningHub API要求所有参数都是字符串类型**

```json
{
  "nodeId": "65",           // string
  "fieldName": "shape",     // string  
  "fieldValue": "triangle"  // string (即使是数值也要传字符串)
}
```

### 2. 参数传递规范

#### 数值类型参数
即使是数值类型的参数（如 `X_offset`、`Y_offset`、`scale`、`rotation`），也必须转换为字符串：

```javascript
// ❌ 错误 - 传递数字类型
fieldValue: 0
fieldValue: -512
fieldValue: 1.5

// ✅ 正确 - 传递字符串类型
fieldValue: "0"
fieldValue: "-512" 
fieldValue: "1.5"
```

#### 字符串类型参数
文本参数（如 `prompt`、`shape`）直接使用字符串：

```javascript
fieldValue: "霓虹光"
fieldValue: "triangle"
```

### 3. workflowId 要求

`workflowId` 必须是字符串类型：

```javascript
// ❌ 错误
workflowId: 1952448857223442433

// ✅ 正确
workflowId: "1952448857223442433"
```

## 代码实现

### 后端实现 (Node.js)

```javascript
// 在 src/routes/effects.js 中

// 处理参数时，确保所有fieldValue都是字符串类型
const handleFieldValue = (nodeInfo, req) => {
  const paramKey = nodeInfo.paramKey;
  
  if (paramKey && req.body[paramKey] !== undefined) {
    // RunningHub API要求所有fieldValue都是字符串类型
    let fieldValue = String(req.body[paramKey]);
    
    console.log(`[参数转换]:`, {
      nodeId: nodeInfo.nodeId,
      fieldName: nodeInfo.fieldName,
      paramKey: paramKey,
      originalValue: req.body[paramKey],
      convertedValue: fieldValue,
      convertedType: typeof fieldValue
    });
    
    return {
      ...nodeInfo,
      fieldValue: fieldValue
    };
  } else {
    // 为缺失参数提供默认值（字符串类型）
    let defaultValue;
    if (nodeInfo.fieldName === 'scale' || 
        nodeInfo.fieldName === 'X_offset' || 
        nodeInfo.fieldName === 'Y_offset' || 
        nodeInfo.fieldName === 'rotation') {
      defaultValue = '0'; // 数值类型默认值，字符串形式
    } else if (nodeInfo.fieldName === 'shape') {
      defaultValue = 'triangle'; // shape字段默认值
    } else {
      defaultValue = ''; // 其他字段默认值
    }
    
    return {
      ...nodeInfo,
      fieldValue: defaultValue
    };
  }
};
```

### 前端实现 (React/TypeScript)

```typescript
// 在 src/pages/ApplyEffect.tsx 中

const handleParameterChange = (paramName: string, value: any) => {
  console.log(`[参数变更] ${paramName}: ${value} (类型: ${typeof value})`);
  
  // 对于数值类型参数，确保转换为数字（前端存储）
  if (paramName === 'scale_65' || 
      paramName === 'X_offset_65' || 
      paramName === 'Y_offset_65' || 
      paramName === 'rotation_65') {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setParameters(prev => ({ ...prev, [paramName]: numValue }));
      console.log(`[参数变更] 数值转换: ${paramName} = ${numValue}`);
    } else {
      setParameters(prev => ({ ...prev, [paramName]: value }));
      console.log(`[参数变更] 数值转换失败，保持原值: ${paramName} = ${value}`);
    }
  } else {
    setParameters(prev => ({ ...prev, [paramName]: value }));
    console.log(`[参数变更] 普通参数: ${paramName} = ${value}`);
  }
};
```

## 常见错误及解决方案

### 错误码 803: APIKEY_INVALID_NODE_INFO

**原因：** `fieldValue` 为 `undefined` 或类型不正确

**解决方案：**
1. 确保所有参数都有值（提供默认值）
2. 确保所有 `fieldValue` 都是字符串类型
3. 检查参数传递流程

### 错误码 814: PERSONAL_QUEUE_COUNT_LIMIT

**原因：** 个人队列任务数量超过1000个

**解决方案：**
- 清理历史任务
- 使用 `usePersonalQueue: false` 参数

## 测试方法

### 1. 最小化测试

```javascript
// 测试基本参数传递
const nodeInfoList = [
  { nodeId: '85', fieldName: 'prompt', paramKey: 'prompt_85' }
];

formData.append('prompt_85', '霓虹光');
```

### 2. 完整参数测试

```javascript
// 测试所有参数
const nodeInfoList = [
  { nodeId: '19', fieldName: 'image', paramKey: 'image_19' },
  { nodeId: '85', fieldName: 'prompt', paramKey: 'prompt_85' },
  { nodeId: '65', fieldName: 'shape', paramKey: 'shape_65' },
  { nodeId: '65', fieldName: 'X_offset', paramKey: 'X_offset_65' },
  { nodeId: '65', fieldName: 'Y_offset', paramKey: 'Y_offset_65' },
  { nodeId: '65', fieldName: 'scale', paramKey: 'scale_65' },
  { nodeId: '65', fieldName: 'rotation', paramKey: 'rotation_65' }
];

// 所有参数值都必须是字符串
formData.append('prompt_85', '霓虹光');
formData.append('shape_65', 'triangle');
formData.append('X_offset_65', '0');
formData.append('Y_offset_65', '-512');
formData.append('scale_65', '1');
formData.append('rotation_65', '0');
```

## 部署注意事项

### 1. 后端部署 (Render)
- 确保代码已提交到Git仓库
- Render会自动从Git仓库拉取最新代码
- 检查部署日志确认更新成功

### 2. 前端部署 (Vercel)
- 使用 `vercel --prod --force` 强制部署
- 确保环境变量配置正确

## 调试技巧

### 1. 启用详细日志

```javascript
// 后端日志
console.log('[任务处理] 完整的请求体:', JSON.stringify(req.body, null, 2));
console.log('[任务处理] 参数详情:', Object.keys(req.body).map(key => `${key}: ${req.body[key]} (类型: ${typeof req.body[key]})`));

// 前端日志
console.log('[ApplyEffect] 最终参数:', parameters);
console.log('[ApplyEffect] 参数详情:', Object.entries(parameters).map(([key, value]) => `${key}: ${value} (类型: ${typeof value})`));
```

### 2. 参数类型检查

```javascript
// 检查参数类型
Object.entries(parameters).forEach(([key, value]) => {
  console.log(`${key}: ${value} (类型: ${typeof value})`);
});
```

## 相关文件

- `runninghub-backend/src/routes/effects.js` - 后端API处理
- `project/src/pages/ApplyEffect.tsx` - 前端参数处理
- `project/src/hooks/useTaskProcessing.ts` - 任务处理逻辑
- `project/src/data/mockData.ts` - 特效配置

## 更新历史

- **2024-01-XX**: 修复fieldValue类型问题，确保所有参数都是字符串类型
- **2024-01-XX**: 添加详细的错误处理和调试日志
- **2024-01-XX**: 完善参数默认值处理逻辑

---

**注意：** 本文档应该与代码同步更新，确保开发人员和AI助手都能获得最新的集成信息。 