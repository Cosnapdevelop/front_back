# Cosnap换背景 - Select参数更新文档

## 📋 更新概述

本次更新为Cosnap换背景特效添加了用户可选择的背景处理模式，通过351号节点的select参数实现。

## 🎯 更新内容

### 1. 前端配置更新 (`project/src/data/mockData.ts`)

**新增select参数配置：**
```typescript
{
  name: 'select_351', 
  type: 'select', 
  default: '2',
  description: '背景处理模式选择',
  options: [
    { value: '1', label: '适合场照大面积更改背景' },
    { value: '2', label: '适合外景小程度修改背景' }
  ]
}
```

**更新nodeInfoTemplate：**
```typescript
nodeInfoTemplate: [
  { nodeId: '240', fieldName: 'image', paramKey: 'image_240' },  // LoadImage 节点 - 主体图片
  { nodeId: '284', fieldName: 'image', paramKey: 'image_284' },  // LoadImage 节点 - 背景参考图
  { nodeId: '279', fieldName: 'prompt', paramKey: 'prompt_279' }, // 文本提示词节点
  { nodeId: '351', fieldName: 'select', paramKey: 'select_351' }  // Switch节点 - 背景处理模式选择
]
```

### 2. 后端处理更新 (`runninghub-backend/src/routes/effects.js`)

**新增select节点处理逻辑：**
```javascript
} else if (nodeInfo.fieldName === 'select') {
  // select节点 - 查找对应的参数
  const paramKey = nodeInfo.paramKey;
  if (paramKey && req.body[paramKey] !== undefined) {
    const updatedNode = {
      ...nodeInfo,
      fieldValue: parseInt(req.body[paramKey]) // select值需要转换为整数
    };
    console.log(`[${taskType}] 更新select节点 ${index}:`, {
      nodeId: nodeInfo.nodeId,
      paramKey: paramKey,
      fieldValue: parseInt(req.body[paramKey])
    });
    return updatedNode;
  } else {
    console.warn(`[${taskType}] select节点 ${index} 缺少参数:`, {
      nodeId: nodeInfo.nodeId,
      paramKey: paramKey,
      bodyParams: Object.keys(req.body)
    });
  }
}
```

## 🔧 技术细节

### 工作流节点信息
- **节点ID**: 351
- **节点类型**: ImpactSwitch
- **字段名**: select
- **参数键**: select_351

### 节点配置
```json
"351": {
  "inputs": {
    "select": 2,
    "sel_mode": false,
    "input1": ["306", 0],
    "input2": ["349", 0]
  },
  "class_type": "ImpactSwitch",
  "_meta": {
    "title": "Switch (Any)"
  }
}
```

### 选择项说明
- **选项1 (value: "1")**: 适合场照大面积更改背景
  - 使用input1路径 (节点306的输出)
  - 适用于需要大幅背景替换的场景
  
- **选项2 (value: "2")**: 适合外景小程度修改背景
  - 使用input2路径 (节点349的输出)
  - 适用于轻微背景调整的场景

## ✅ 测试验证

### 测试脚本
创建了 `runninghub-backend/test-cosnap-config.js` 来验证配置正确性。

### 测试结果
```
✅ select节点验证:
- nodeId: 351
- fieldName: select
- fieldValue: 2 (类型: number)
- 原始值: 2
✅ select值已正确转换为数字类型
```

## 🎨 用户界面

前端ApplyEffect页面已经支持select类型参数，用户可以看到：
- 下拉选择框
- 清晰的选项描述
- 默认选择"适合外景小程度修改背景"

## 📝 使用说明

1. **用户选择**: 在应用特效页面，用户可以选择背景处理模式
2. **参数传递**: 前端将用户选择作为 `select_351` 参数传递给后端
3. **后端处理**: 后端将字符串值转换为整数，填充到351号节点的select字段
4. **工作流执行**: RunningHub根据select值选择不同的处理路径

## 🔄 兼容性

- ✅ 向后兼容：现有功能不受影响
- ✅ 默认值：默认选择选项2，保持原有行为
- ✅ 错误处理：包含完整的参数验证和错误提示

## 📊 部署状态

- ✅ 前端配置已更新
- ✅ 后端处理逻辑已更新
- ✅ 测试验证通过
- 🚀 准备部署到生产环境

---

**更新时间**: 2025-01-27  
**更新版本**: Cosnap换背景 v1.1  
**维护人员**: AI Assistant 